import { commands, Disposable, ExtensionContext, LanguageClient, services, workspace } from 'coc.nvim';
import executable from 'executable';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createClient } from './client';
import { Config } from './config';
import { downloadServer, getLatestRelease } from './downloader';

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  private onDidRestartHooks: Array<(client: LanguageClient) => void> = [];
  public readonly config: Config;
  client: LanguageClient | null = null;

  constructor(private readonly extCtx: ExtensionContext) {
    this.config = new Config();
    this.extCtx = extCtx;
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

    const old = this.client;
    if (old) {
      await old.stop();
    }

    this.client = null;
    const client = createClient(this.config, bin);

    this.extCtx.subscriptions.push(services.registLanguageClient(client));
    await client.onReady();

    this.client = client;
    for (const hook of this.onDidRestartHooks) {
      hook(client);
    }
  }

  async stopServer() {
    if (this.client) {
      await this.client.stop();
    }

    this.client = null;
  }

  get subscriptions(): Disposable[] {
    return this.extCtx.subscriptions;
  }

  onDidRestart(hook: (client: LanguageClient) => void) {
    this.onDidRestartHooks.push(hook);
  }

  resolveBin(): string | undefined {
    // 1. from config, custom server path
    // 2. bundled
    let bin = join(this.extCtx.storagePath, process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer');
    if (!existsSync(bin)) {
      // fallback to old ra_lsp_server naming
      bin = join(this.extCtx.storagePath, process.platform === 'win32' ? 'ra_lsp_server.exe' : 'ra_lsp_server');
    }
    if (this.config.serverPath.length > 0) {
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
    if (auto && this.config.serverPath.length > 0) {
      // no auto update if using custom server
      return;
    }

    const latest = await getLatestRelease();
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
      await this.stopServer();
      try {
        await downloadServer(this.extCtx);
      } catch (e) {
        workspace.showMessage(`Upgrade rust-analyzer failed, please try again`, 'error');
        return;
      }
      await this.startServer();

      this.extCtx.globalState.update('release', latest.tag);
    } else if (ret === 1) {
      commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer/releases').catch(() => {});
    }
  }
}
