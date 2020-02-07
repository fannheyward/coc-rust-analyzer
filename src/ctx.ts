import { commands, ExtensionContext, LanguageClient, services, workspace } from 'coc.nvim';
import executable from 'executable';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createClient } from './client';
import { Config } from './config';

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  private onDidRestartHooks: Array<(client: LanguageClient) => void> = [];
  public readonly config: Config;
  public readonly extCtx: ExtensionContext;
  client: LanguageClient | null = null;

  constructor(extCtx: ExtensionContext) {
    this.config = new Config();
    this.extCtx = extCtx;
  }

  registerCommand(name: string, factory: (ctx: Ctx) => Cmd) {
    const fullName = `rust-analyzer.${name}`;
    const cmd = factory(this);
    const d = commands.registerCommand(fullName, cmd);
    this.extCtx.subscriptions.push(d);
  }

  async restartServer() {
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
    if (!client) {
      return;
    }

    this.extCtx.subscriptions.push(client.start());
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

  onDidRestart(hook: (client: LanguageClient) => void) {
    this.onDidRestartHooks.push(hook);
  }

  resolveBin(): string | undefined {
    // 1. bundled in coc-server-root
    // 2. from config
    let bin = join(this.extCtx.storagePath, process.platform === 'win32' ? 'ra_lsp_server.exe' : 'ra_lsp_server');
    if (!existsSync(bin) && this.config.raLspServerPath.length > 0) {
      bin = this.config.raLspServerPath;
      if (bin.startsWith('~/')) {
        bin = bin.replace('~', homedir());
      }
      if (!existsSync(bin)) {
        return;
      }
    }

    if (!executable.sync(bin)) {
      workspace.showMessage(`${bin} is not executable`, 'error');
      return;
    }

    return bin;
  }
}
