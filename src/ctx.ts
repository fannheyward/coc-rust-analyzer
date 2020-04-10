import { commands, ExtensionContext, LanguageClient, services, workspace } from 'coc.nvim';
import executable from 'executable';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Disposable, WorkDoneProgress } from 'vscode-languageserver-protocol';
import { createClient } from './client';
import { Config } from './config';
import { downloadServer, getLatestRelease } from './downloader';
import { StatusDisplay } from './status_display';

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  client!: LanguageClient;

  constructor(private readonly extCtx: ExtensionContext, readonly config: Config) {
    this.extCtx = extCtx;
  }

  private async activateStatusDisplay() {
    await this.client.onReady();

    const status = new StatusDisplay(this.config.checkOnSave.command);
    this.extCtx.subscriptions.push(status);
    this.client.onProgress(WorkDoneProgress.type, 'rustAnalyzer/cargoWatcher', (params) => status.handleProgressNotification(params));
  }

  registerCommand(name: string, factory: (ctx: Ctx) => Cmd) {
    const fullName = `rust-analyzer.${name}`;
    const cmd = factory(this);
    const d = commands.registerCommand(fullName, cmd);
    this.extCtx.subscriptions.push(d);
  }

  async startServer() {
    const bin = this.resolveBin();
    if (!bin) {
      return;
    }

    const client = createClient(bin);
    this.extCtx.subscriptions.push(services.registLanguageClient(client));
    await client.onReady();

    this.client = client;
    this.activateStatusDisplay();
  }

  get subscriptions(): Disposable[] {
    return this.extCtx.subscriptions;
  }

  resolveBin(): string | undefined {
    // 1. from config, custom server path
    // 2. bundled
    let bin = join(this.extCtx.storagePath, process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer');
    if (!existsSync(bin)) {
      // fallback to old ra_lsp_server naming
      bin = join(this.extCtx.storagePath, process.platform === 'win32' ? 'ra_lsp_server.exe' : 'ra_lsp_server');
    }
    if (this.config.serverPath) {
      bin = this.config.serverPath;
      if (bin.startsWith('~/')) {
        bin = bin.replace('~', homedir());
      }
    }
    if (!existsSync(bin)) {
      return;
    }

    if (!executable.sync(bin)) {
      workspace.showMessage(`${bin} is not executable`, 'error');
      return;
    }

    return bin;
  }

  async checkUpdate(auto = true) {
    if (auto && this.config.serverPath) {
      // no auto update if using custom server
      return;
    }

    const latest = await getLatestRelease(this.config.channel);
    if (!latest) {
      return;
    }

    const old = this.extCtx.globalState.get('release') || 'unknown release';
    if (old === latest.tag) {
      if (!auto) {
        workspace.showMessage(`Your Rust Analyzer release is updated`);
      }
      return;
    }

    const msg = `Rust Analyzer has a new release: ${latest.tag}, you're using ${old}. Would you like to download from GitHub`;
    const ret = await workspace.showQuickpick(['Yes', 'Check GitHub releases', 'Cancel'], msg);
    if (ret === 0) {
      await this.client.stop();
      try {
        await downloadServer(this.extCtx, this.config.channel);
      } catch (e) {
        workspace.showMessage(`Upgrade rust-analyzer failed, please try again`, 'error');
        return;
      }
      this.client.start();

      this.activateStatusDisplay();
      this.extCtx.globalState.update('release', latest.tag);
    } else if (ret === 1) {
      commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer/releases').catch(() => {});
    }
  }
}
