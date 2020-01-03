import { commands, ExtensionContext, workspace } from 'coc.nvim';
import { prepare } from './client';
import * as cmds from './cmds';
import { Ctx } from './ctx';
import { activateStatusDisplay } from './status_display';

export async function activate(context: ExtensionContext): Promise<void> {
  const ctx = new Ctx(context);

  const run = prepare(ctx.config);
  if (!run) {
    workspace.showMessage(`ra_lsp_server is not found, you need to build rust-analyzer from source`, 'error');
    const ret = await workspace.showQuickpick(['Yes', 'No'], 'Get ra_lsp_server?');
    if (ret === 0) {
      commands.executeCommand('vscode.open', 'https://github.com/rust-analyzer/rust-analyzer').catch(() => {});
    }
    return;
  }

  activateStatusDisplay(ctx);

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
  ctx.registerCommand('reload', cmds.reload);

  try {
    await ctx.restartServer();
  } catch (e) {
    workspace.showMessage(e.message, 'error');
  }
}
