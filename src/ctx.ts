import { commands, ExtensionContext, LanguageClient, services, workspace } from 'coc.nvim';
import executable from 'executable';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { CancellationToken, Disposable, ErrorCodes, RequestType, TextDocument } from 'vscode-languageserver-protocol';
import which from 'which';
import { createClient } from './client';
import { Config } from './config';
import { downloadServer, getLatestRelease } from './downloader';

export type RustDocument = TextDocument & { languageId: 'rust' };
export function isRustDocument(document: TextDocument): document is RustDocument {
  return document.languageId === 'rust';
}

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  client!: LanguageClient;

  constructor(private readonly extCtx: ExtensionContext, readonly config: Config) {}

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
  }

  get subscriptions(): Disposable[] {
    return this.extCtx.subscriptions;
  }

  pushCleanup(d: Disposable) {
    this.extCtx.subscriptions.push(d);
  }

  resolveBin(): string | undefined {
    // 1. from config, custom server path
    // 2. bundled
    let bin = join(this.extCtx.storagePath, process.platform === 'win32' ? 'rust-analyzer.exe' : 'rust-analyzer');
    if (this.config.serverPath) {
      bin = this.config.serverPath;
      if (bin.startsWith('~/')) {
        bin = bin.replace('~', homedir());
      }

      bin = which.sync(bin, { nothrow: true }) || bin;
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
    if (this.config.serverPath) {
      // no update checking if using custom server
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
      try {
        await downloadServer(this.extCtx, this.config.channel);
      } catch (e) {
        console.error(e);
        let msg = 'Upgrade rust-analyzer failed, please try again';
        if (e.code === 'EBUSY' || e.code === 'ETXTBSY') {
          msg = 'Upgrade rust-analyzer failed, other Vim instances might be using it, you should close them and try again';
        }
        workspace.showMessage(msg, 'error');
        return;
      }
      await this.client.stop();
      this.client.start();

      this.extCtx.globalState.update('release', latest.tag);
    } else if (ret === 1) {
      commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer/releases').catch(() => {});
    }
  }

  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async sendRequestWithRetry<TParam, TRet>(reqType: RequestType<TParam, TRet, unknown>, param: TParam, token?: CancellationToken): Promise<TRet> {
    for (const delay of [2, 4, 6, 8, 10, null]) {
      try {
        return await (token ? this.client.sendRequest(reqType, param, token) : this.client.sendRequest(reqType, param));
      } catch (error) {
        if (delay === null) {
          throw error;
        }

        if (error.code === ErrorCodes.RequestCancelled) {
          throw error;
        }

        if (error.code !== ErrorCodes.ContentModified) {
          throw error;
        }

        await this.sleep(10 * (1 << delay));
      }
    }
    throw 'unreachable';
  }
}
