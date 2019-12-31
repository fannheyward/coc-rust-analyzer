import { ExtensionContext, LanguageClient, commands } from 'coc.nvim';
import { Server } from './server';

export type Cmd = (...args: any[]) => any;

export class Ctx {
  private extCtx: ExtensionContext;

  constructor(extCtx: ExtensionContext) {
    this.extCtx = extCtx;
  }

  get client(): LanguageClient {
    return Server.client;
  }

  registerCommand(name: string, factory: (ctx: Ctx) => Cmd) {
    const fullName = `rust-analyzer.${name}`;
    const cmd = factory(this);
    const d = commands.registerCommand(fullName, cmd);
    this.extCtx.subscriptions.push(d);
  }
}
