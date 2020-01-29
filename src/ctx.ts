import { commands, ExtensionContext, LanguageClient, services } from 'coc.nvim';
import { createClient } from './client';
import { Config } from './config';

export type Cmd = (...args: any[]) => any;

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
    const old = this.client;
    if (old) {
      await old.stop();
    }

    this.client = null;
    const client = createClient(this.config, this.extCtx.storagePath);
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
}
