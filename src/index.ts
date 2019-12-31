import { commands, ExtensionContext, services, workspace } from 'coc.nvim';
import { GenericNotificationHandler } from 'vscode-languageserver-protocol';
import * as cmds from './cmds';
import { StatusDisplay } from './status_display';
import { Ctx } from './ctx';
import { Server } from './server';

export async function activate(context: ExtensionContext): Promise<void> {
  const run = Server.prepare();
  if (!run) {
    workspace.showMessage(`ra_lsp_server is not found, you need to build rust-analyzer from source`, 'error');
    const ret = await workspace.showQuickpick(['Yes', 'No'], 'Get ra_lsp_server?');
    if (ret === 0) {
      commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer').catch(() => {});
    }
    return;
  }

  const ctx = new Ctx(context);

  const watchStatus = new StatusDisplay(ctx.config.cargoWatchOptions.command);
  context.subscriptions.push(watchStatus);

  const allNotifications: Iterable<[string, GenericNotificationHandler]> = [['$/progress', params => watchStatus.handleProgressNotification(params)]];
  Server.start(allNotifications);
  if (Server.client) {
    context.subscriptions.push(services.registLanguageClient(Server.client));
  }

  // Commands are requests from vscode to the language server
  ctx.registerCommand('analyzerStatus', cmds.analyzerStatus);
  ctx.registerCommand('applySourceChange', cmds.applySourceChange);
  ctx.registerCommand('collectGarbage', cmds.collectGarbage);
  ctx.registerCommand('expandMacro', cmds.expandMacro);
  ctx.registerCommand('joinLines', cmds.joinLines);
  ctx.registerCommand('matchingBrace', cmds.matchingBrace);
  ctx.registerCommand('parentModule', cmds.parentModule);
  ctx.registerCommand('run', cmds.run);
  ctx.registerCommand('runSingle', cmds.runSingle);
  ctx.registerCommand('syntaxTree', cmds.syntaxTree);
  ctx.registerCommand('showReferences', cmds.showReferences);

  commands.registerCommand('rust-analyzer.reload', async () => {
    if (Server.client != null) {
      workspace.showMessage(`Reloading rust-analyzer...`);
      await Server.client.stop();
      Server.start(allNotifications);
    }
  });
}

export function deactivate(): Thenable<void> {
  if (!Server.client) {
    return Promise.resolve();
  }
  return Server.client.stop();
}
