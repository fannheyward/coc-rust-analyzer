import { commands, ExtensionContext, LanguageClient } from 'coc.nvim';
import { Config } from './config';
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

  get config(): Config {
    return Server.config;
  }

  registerCommand(name: string, factory: (ctx: Ctx) => Cmd) {
    const fullName = `rust-analyzer.${name}`;
    const cmd = factory(this);
    const d = commands.registerCommand(fullName, cmd);
    this.extCtx.subscriptions.push(d);
  }
}
