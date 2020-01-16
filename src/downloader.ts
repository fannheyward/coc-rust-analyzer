import { workspace } from 'coc.nvim';
import { createWriteStream } from 'fs';
import fetch from 'node-fetch';
import os from 'os';
import { join } from 'path';

async function getLatestVersion(): Promise<{ tag: string; url: string; name: string } | undefined> {
  const fix = { win32: 'windows', darwin: 'mac' }[os.platform()] || 'linux';
  const releaseURL = 'https://api.github.com/repos/rust-analyzer/rust-analyzer/releases/latest';
  return fetch(releaseURL)
    .then(resp => resp.json())
    .then(resp => {
      const asset = (resp.assets as any[]).find(val => val.browser_download_url.includes(fix));
      const name = asset.name.substr(0, 13) + (fix === 'windows' ? '.exe' : '');
      return { tag: resp.tag_name, url: asset.browser_download_url, name };
    })
    .catch(() => {
      return undefined;
    });
}

export async function downloadServer(root: string): Promise<void> {
  let statusItem = workspace.createStatusBarItem(0, { progress: true });
  statusItem.text = 'Getting the latest version...';
  statusItem.show();

  const latest = await getLatestVersion();
  if (!latest) {
    statusItem.hide();
    workspace.showMessage(`Can't get latest ra_lsp_server release`);

    return;
  }

  const _path = join(root, latest.name);
  statusItem.text = `Downloading ra_lsp_server ${latest.tag}`;

  return new Promise((resolve, reject) => {
    fetch(latest.url)
      .then(resp => {
        let cur = 0;
        const len = parseInt(resp.headers.get('content-length') || '', 10);
        resp.body
          .on('data', chunk => {
            if (!isNaN(len)) {
              cur += chunk.length;
              const p = ((cur / len) * 100).toFixed(2);
              statusItem.text = `${p}% Downloading ra_lsp_server ${latest.tag}`;
            }
          })
          .on('end', () => {
            statusItem.hide();
            resolve();
          })
          .pipe(createWriteStream(_path));
      })
      .catch(e => {
        reject(e);
      });
  });
}
