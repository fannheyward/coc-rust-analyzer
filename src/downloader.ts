import { ExtensionContext, workspace } from 'coc.nvim';
import { createWriteStream } from 'fs';
import fetch from 'node-fetch';
import os from 'os';
import { join } from 'path';
import { UpdatesChannel } from './config';

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
  return fetch(releaseURL)
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

  const _path = join(context.storagePath, latest.name);
  statusItem.text = `Downloading rust-analyzer ${latest.tag}`;

  return new Promise((resolve, reject) => {
    fetch(latest.url)
      .then((resp) => {
        let cur = 0;
        const len = parseInt(resp.headers.get('content-length') || '', 10);
        resp.body
          .on('data', (chunk) => {
            if (!isNaN(len)) {
              cur += chunk.length;
              const p = ((cur / len) * 100).toFixed(2);
              statusItem.text = `${p}% Downloading rust-analyzer ${latest.tag}`;
            }
          })
          .on('error', (e) => {
            statusItem.hide();
            reject(e);
          })
          .on('end', () => {
            context.globalState.update('release', latest.tag);
            statusItem.hide();
            resolve();
          })
          .pipe(createWriteStream(_path, { mode: 0o755 }));
      })
      .catch((e) => {
        statusItem.hide();
        reject(e);
      });
  });
}
