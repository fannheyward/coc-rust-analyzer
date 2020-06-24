import { exec } from 'child_process';
import { ExtensionContext, workspace } from 'coc.nvim';
import { createWriteStream, PathLike, promises as fs } from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import stream from 'stream';
import util from 'util';
import { UpdatesChannel } from './config';

const pipeline = util.promisify(stream.pipeline);
const agent = process.env.https_proxy ? new HttpsProxyAgent(process.env.https_proxy as string) : null;

async function patchelf(dest: PathLike): Promise<void> {
  const expression = `
{src, pkgs ? import <nixpkgs> {}}:
    pkgs.stdenv.mkDerivation {
        name = "rust-analyzer";
        inherit src;
        phases = [ "installPhase" "fixupPhase" ];
        installPhase = "cp $src $out";
        fixupPhase = ''
        chmod 755 $out
        patchelf --set-interpreter "$(cat $NIX_CC/nix-support/dynamic-linker)" $out
        '';
    }
`;
  const origFile = dest + '-orig';
  await fs.rename(dest, origFile);

  await new Promise((resolve, reject) => {
    const handle = exec(`nix-build -E - --arg src '${origFile}' -o ${dest}`, (err, stdout, stderr) => {
      if (err != null) {
        reject(Error(stderr));
      } else {
        resolve(stdout);
      }
    });
    handle.stdin?.write(expression);
    handle.stdin?.end();
  });

  await fs.unlink(origFile);
}

export interface ReleaseTag {
  tag: string;
  url: string;
  name: string;
}

export async function getLatestRelease(updatesChannel: UpdatesChannel): Promise<ReleaseTag | undefined> {
  const fix = { win32: '-windows', darwin: '-mac' }[os.platform()] || '-linux';
  let releaseURL = 'https://api.github.com/repos/rust-analyzer/rust-analyzer/releases/latest';
  if (updatesChannel === 'nightly') {
    releaseURL = 'https://api.github.com/repos/rust-analyzer/rust-analyzer/releases/tags/nightly';
  }
  // @ts-ignore
  return fetch(releaseURL, { agent })
    .then((resp) => resp.json())
    .then((resp) => {
      const asset = (resp.assets as any[]).find((val) => val.browser_download_url.includes(fix));
      const name = (asset.name as string).replace(fix, '');
      let tag = resp.tag_name;
      if (updatesChannel === 'nightly') {
        tag = `${resp.tag_name} ${resp.published_at.slice(0, 10)}`;
      }
      return { tag, url: asset.browser_download_url, name };
    })
    .catch(() => {
      return undefined;
    });
}

async function moveFile(src: PathLike, dest: PathLike) {
  try {
    await fs.unlink(dest).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
    await fs.rename(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      // We are probably moving the file across partitions/devices
      await fs.copyFile(src, dest);
      await fs.unlink(src);
    } else {
      console.error(`Failed to rename the file ${src} -> ${dest}`, err);
      throw err;
    }
  }
}

export async function downloadServer(context: ExtensionContext, updatesChannel: UpdatesChannel): Promise<void> {
  const statusItem = workspace.createStatusBarItem(0, { progress: true });
  statusItem.text = 'Getting the latest version...';
  statusItem.show();

  const latest = await getLatestRelease(updatesChannel);
  if (!latest) {
    statusItem.hide();
    workspace.showMessage(`Can't get latest rust-analyzer release`);
    return;
  }

  const _path = path.join(context.storagePath, latest.name);
  statusItem.text = `Downloading rust-analyzer ${latest.tag}`;

  // @ts-ignore
  const resp = await fetch(latest.url, { agent });
  // const resp = await fetch('http://devd.io/rust-analyzer');
  if (!resp.ok) {
    statusItem.hide();
    throw new Error('Download failed');
  }

  let cur = 0;
  const len = Number(resp.headers.get('content-length'));
  resp.body.on('data', (chunk: Buffer) => {
    cur += chunk.length;
    const p = ((cur / len) * 100).toFixed(2);
    statusItem.text = `${p}% Downloading rust-analyzer ${latest.tag}`;
  });

  try {
    const osTempDir = await fs.realpath(os.tmpdir());
    const tempDir = await fs.mkdtemp(path.join(osTempDir, 'rust-analyzer'));
    const tempFile = path.join(tempDir, path.basename(latest.name));

    const destFileStream = createWriteStream(tempFile, { mode: 0o755 });
    await pipeline(resp.body, destFileStream);
    await new Promise<void>((resolve) => {
      destFileStream.on('close', resolve);
      destFileStream.destroy();
      setTimeout(resolve, 1000);
    });

    await moveFile(tempFile, _path);
  } catch (e) {
    statusItem.hide();
    console.error(`Failed to download rust-analyzer:`, e);
    throw e;
  }

  await context.globalState.update('release', latest.tag);

  try {
    if (await fs.stat('/etc/nixos')) {
      statusItem.text = `Patching rust-analyzer executable...`;
      await patchelf(_path);
    }
  } catch (e) {}

  statusItem.hide();
}
