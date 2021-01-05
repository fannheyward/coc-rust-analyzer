import { exec } from 'child_process';
import { ExtensionContext, window } from 'coc.nvim';
import { randomBytes } from 'crypto';
import { createWriteStream, PathLike, promises as fs } from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';
import * as zlib from 'zlib';
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

interface Asset {
  name: string;
  browser_download_url: string;
}

interface GithubRelease {
  tag_name: string;
  published_at: string;
  assets: Array<Asset>;
}

export interface ReleaseTag {
  tag: string;
  url: string;
  name: string;
  asset?: Asset;
}

function getPlatform(): string | undefined {
  const platforms: { [key: string]: string } = {
    'ia32 win32': 'x86_64-pc-windows-msvc',
    'x64 win32': 'x86_64-pc-windows-msvc',
    'x64 linux': 'x86_64-unknown-linux-gnu',
    'x64 darwin': 'x86_64-apple-darwin',
    'arm64 win32': 'aarch64-pc-windows-msvc',
    'arm64 darwin': 'aarch64-apple-darwin',
  };

  return platforms[`${process.arch} ${process.platform}`];
}

export async function getLatestRelease(updatesChannel: UpdatesChannel): Promise<ReleaseTag | undefined> {
  let releaseURL = 'https://api.github.com/repos/rust-analyzer/rust-analyzer/releases/latest';
  if (updatesChannel === 'nightly') {
    releaseURL = 'https://api.github.com/repos/rust-analyzer/rust-analyzer/releases/tags/nightly';
  }
  // @ts-ignore
  const response = await fetch(releaseURL, { agent });
  if (!response.ok) {
    console.error(await response.text());
    return;
  }

  const release: GithubRelease = await response.json();
  const platform = getPlatform();
  if (!platform) {
    console.error(`Unfortunately we don't ship binaries for your platform yet.`);
    return;
  }
  const asset = release.assets.find((val) => val.browser_download_url.endsWith(`${platform}.gz`));
  if (!asset) {
    console.error(`getLatestRelease failed: ${release}`);
    return;
  }

  let tag = release.tag_name;
  if (updatesChannel === 'nightly') tag = `${release.tag_name} ${release.published_at.slice(0, 10)}`;
  const name = process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer';

  return { asset, tag, url: asset.browser_download_url, name: name };
}

export async function downloadServer(context: ExtensionContext, release: ReleaseTag): Promise<void> {
  const statusItem = window.createStatusBarItem(0, { progress: true });
  statusItem.text = `Downloading rust-analyzer ${release.tag}`;
  statusItem.show();

  // @ts-ignore
  const resp = await fetch(release.url, { agent });
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
    statusItem.text = `${p}% Downloading rust-analyzer ${release.tag}`;
  });

  const _path = path.join(context.storagePath, release.name);
  const randomHex = randomBytes(5).toString('hex');
  const tempFile = path.join(context.storagePath, `${release.name}${randomHex}`);

  const destFileStream = createWriteStream(tempFile, { mode: 0o755 });
  await pipeline(resp.body.pipe(zlib.createGunzip()), destFileStream);
  await new Promise<void>((resolve) => {
    destFileStream.on('close', resolve);
    destFileStream.destroy();
    setTimeout(resolve, 1000);
  });

  await fs.unlink(_path).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
  });
  await fs.rename(tempFile, _path);

  await context.globalState.update('release', release.tag);

  try {
    if (await fs.stat('/etc/nixos')) {
      statusItem.text = `Patching rust-analyzer executable...`;
      await patchelf(_path);
    }
  } catch (e) {}

  statusItem.hide();
}
