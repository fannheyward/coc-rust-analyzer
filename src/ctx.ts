import { commands, Disposable, ExtensionContext, LanguageClient, services, TextDocument, Uri, window, workspace } from 'coc.nvim';
import { existsSync } from 'fs';
import { join } from 'path';
import which from 'which';
import { createClient } from './client';
import { Config } from './config';
import { downloadServer, getLatestRelease } from './downloader';
import * as ra from './lsp_ext';

export type RustDocument = TextDocument & { languageId: 'rust' };
export function isRustDocument(document: TextDocument): document is RustDocument {
  return document.languageId === 'rust';
}

export function isCargoTomlDocument(document: TextDocument): document is RustDocument {
  const u = Uri.parse(document.uri);
  return u.scheme === 'file' && u.fsPath.endsWith('Cargo.toml');
}

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  client!: LanguageClient;
  public readonly config = new Config();
  private usingSystemServer = false;

  constructor(private readonly extCtx: ExtensionContext) {
    const statusBar = window.createStatusBarItem(0);
    statusBar.text = 'rust-analyzer';
    statusBar.show();
    this.extCtx.subscriptions.push(statusBar);

    window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'rust') {
        statusBar.show();
      } else {
        statusBar.hide();
      }
    });
  }

  registerCommand(name: string, factory: (ctx: Ctx) => Cmd, internal = false) {
    const fullName = `rust-analyzer.${name}`;
    const cmd = factory(this);
    const d = commands.registerCommand(fullName, cmd, null, internal);
    this.extCtx.subscriptions.push(d);
  }

  async startServer() {
    const bin = this.resolveBin();
    if (!bin) {
      return;
    }

    const client = createClient(bin, this.config);
    this.extCtx.subscriptions.push(services.registLanguageClient(client));
    const watcher = workspace.createFileSystemWatcher('**/Cargo.toml');
    this.extCtx.subscriptions.push(watcher);
    watcher.onDidChange(async () => await commands.executeCommand('rust-analyzer.reloadWorkspace'));
    await client.onReady();

    client.onNotification(ra.serverStatus, async (status) => {
      if (status.health !== 'ok' && status.message?.length) {
        // https://github.com/fannheyward/coc-rust-analyzer/issues/763
        if (status.message.startsWith('cargo check failed')) return;
        window.showNotification({ content: status.message });
        window.showWarningMessage(`rust-analyzer failed to start, run ':CocCommand rust-analyzer.reloadWorkspace' to reload`);
      }
    });

    this.client = client;
  }

  async stopServer() {
    if (this.client) {
      await this.client.stop();
    }
  }

  get subscriptions(): Disposable[] {
    return this.extCtx.subscriptions;
  }

  resolveBin(): string | undefined {
    // 1. from config, custom server path
    // 2. bundled
    const executableName = process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer';
    let bin = join(this.extCtx.storagePath, executableName);
    if (this.config.serverPath) {
      bin = which.sync(workspace.expand(this.config.serverPath), { nothrow: true }) || bin;
    }

    if (existsSync(bin)) {
      return bin;
    }

    bin = which.sync(executableName, { nothrow: true });
    if (bin) {
      this.usingSystemServer = true;
      return bin;
    }

    return;
  }

  async checkUpdate(auto = true) {
    if (this.config.serverPath || this.usingSystemServer) {
      // no update checking if using custom or system server
      return;
    }
    if (auto && !this.config.checkOnStartup) {
      return;
    }

    const latest = await getLatestRelease(this.config.channel);
    if (!latest) {
      return;
    }

    const old = this.extCtx.globalState.get('release') || 'unknown release';
    if (old === latest.tag) {
      if (!auto) {
        window.showInformationMessage(`Your Rust Analyzer release is updated`);
      }
      return;
    }

    const msg = `Rust Analyzer has a new release: ${latest.tag}, you're using ${old}. Would you like to download from GitHub`;
    let ret = 0;
    if (this.config.prompt === true) {
      ret = await window.showQuickpick(['Yes, download the latest rust-analyzer', 'Check GitHub releases', 'Cancel'], msg);
    }
    if (ret === 0) {
      if (process.platform === 'win32') {
        await this.client.stop();
      }
      try {
        await downloadServer(this.extCtx, latest);
      } catch (e) {
        console.error(e);
        let msg = 'Upgrade rust-analyzer failed, please try again';
        // @ts-ignore
        if (e.code === 'EBUSY' || e.code === 'ETXTBSY' || e.code === 'EPERM') {
          msg = 'Upgrade rust-analyzer failed, other Vim instances might be using it, you should close them and try again';
        }
        window.showInformationMessage(msg, 'error');
        return;
      }
      await this.client.stop();
      this.client.start();

      this.extCtx.globalState.update('release', latest.tag);
    } else if (ret === 1) {
      await commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer/releases').catch(() => {});
    }
  }
}
