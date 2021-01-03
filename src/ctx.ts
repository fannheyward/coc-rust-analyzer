import { commands, ExtensionContext, LanguageClient, services, StatusBarItem, window, workspace } from 'coc.nvim';
import executable from 'executable';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { CancellationToken, Disposable, ErrorCodes, RequestType } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import which from 'which';
import { createClient } from './client';
import { Config } from './config';
import { downloadServer, getLatestRelease } from './downloader';
import { HintsUpdater } from './inlay_hints';
import * as ra from './lsp_ext';

export type RustDocument = TextDocument & { languageId: 'rust' };
export function isRustDocument(document: TextDocument): document is RustDocument {
  return document.languageId === 'rust';
}

export type Cmd = (...args: any[]) => unknown;

export class Ctx {
  client!: LanguageClient;
  private statusBar: StatusBarItem;
  private updater: HintsUpdater | undefined;
  public readonly config = new Config();

  constructor(private readonly extCtx: ExtensionContext) {
    this.statusBar = window.createStatusBarItem(10);
    this.statusBar.text = 'rust-analyzer';
    this.extCtx.subscriptions.push(this.statusBar);

    if (this.config.inlayHints.enable) {
      this.updater = new HintsUpdater(this);
      this.extCtx.subscriptions.push(this.updater);
    }
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

    const client = createClient(bin, this.config.serverExtraEnv);
    this.extCtx.subscriptions.push(services.registLanguageClient(client));
    await client.onReady();

    client.onNotification(ra.status, async (params) => {
      const status = params.status;
      this.statusBar.text = `rust-analyzer ${status}`;
      this.statusBar.show();

      if (status === 'ready') {
        this.statusBar.hide();
      } else if (status === 'needsReload') {
        const prompt = this.config.cargo.autoreload || (await window.showPrompt(`rust-analyzer needs to reload project`));
        if (prompt) {
          await commands.executeCommand('rust-analyzer.reloadWorkspace');
          this.statusBar.hide();
        }
      }
    });

    this.client = client;
  }

  get subscriptions(): Disposable[] {
    return this.extCtx.subscriptions;
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
      window.showMessage(`${bin} is not executable`, 'error');
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
        window.showMessage(`Your Rust Analyzer release is updated`);
      }
      return;
    }

    const msg = `Rust Analyzer has a new release: ${latest.tag}, you're using ${old}. Would you like to download from GitHub`;
    let ret = 0;
    if (this.config.prompt) {
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
        if (e.code === 'EBUSY' || e.code === 'ETXTBSY' || e.code === 'EPERM') {
          msg = 'Upgrade rust-analyzer failed, other Vim instances might be using it, you should close them and try again';
        }
        window.showMessage(msg, 'error');
        return;
      }
      await this.client.stop();
      this.client.start();

      this.extCtx.globalState.update('release', latest.tag);
    } else if (ret === 1) {
      await commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer/releases').catch(() => {});
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

  async activateInlayHints() {
    if (!this.config.inlayHints.enable) {
      return;
    }
    if (!this.config.inlayHints.chainingHints && !this.config.inlayHints.typeHints) {
      return;
    }

    await this.sleep(100);
    await workspace.nvim.command('hi default link CocRustChainingHint CocHintSign');
    await workspace.nvim.command('hi default link CocRustTypeHint CocHintSign');

    this.updater?.syncAndRenderHints();
  }

  async toggleInlayHints() {
    await this.updater?.toggle();
  }
}
