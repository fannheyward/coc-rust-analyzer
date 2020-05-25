import { ExtensionContext, workspace } from 'coc.nvim';
import { existsSync, mkdirSync } from 'fs';
import * as cmds from './cmds';
import { Config } from './config';
import { Ctx } from './ctx';
import { downloadServer } from './downloader';
import { activateInlayHints } from './inlay_hints';

export async function activate(context: ExtensionContext): Promise<void> {
  const config = new Config();
  const ctx = new Ctx(context, config);

  const serverRoot = context.storagePath;
  if (!existsSync(serverRoot)) {
    mkdirSync(serverRoot);
  }

  const bin = ctx.resolveBin();
  if (!bin) {
    let msg = 'Rust Analyzer is not found, download from GitHub release?';
    const ret = await workspace.showQuickpick(['Yes', 'Cancel'], msg);
    if (ret === 0) {
      try {
        await downloadServer(context, config.channel);
      } catch (e) {
        msg = 'Download rust-analyzer failed, you can get it from https://github.com/rust-analyzer/rust-analyzer';
        workspace.showMessage(msg, 'error');
        return;
      }
    } else {
      return;
    }
  }

  await ctx.startServer();

  activateInlayHints(ctx);

  ctx.registerCommand('analyzerStatus', cmds.analyzerStatus);
  ctx.registerCommand('applySourceChange', cmds.applySourceChange);
  ctx.registerCommand('applySnippetWorkspaceEdit', cmds.applySnippetWorkspaceEditCommand);
  ctx.registerCommand('selectAndApplySourceChange', cmds.selectAndApplySourceChange);
  ctx.registerCommand('collectGarbage', cmds.collectGarbage);
  ctx.registerCommand('expandMacro', cmds.expandMacro);
  ctx.registerCommand('joinLines', cmds.joinLines);
  ctx.registerCommand('matchingBrace', cmds.matchingBrace);
  ctx.registerCommand('parentModule', cmds.parentModule);
  ctx.registerCommand('run', cmds.run);
  ctx.registerCommand('runSingle', cmds.runSingle);
  ctx.registerCommand('syntaxTree', cmds.syntaxTree);
  ctx.registerCommand('showReferences', cmds.showReferences);
  ctx.registerCommand('upgrade', cmds.upgrade);
  ctx.registerCommand('ssr', cmds.ssr);
  ctx.registerCommand('serverVersion', cmds.serverVersion);
  ctx.registerCommand('toggleInlayHints', cmds.toggleInlayHints);
  ctx.registerCommand('reload', (ctx) => {
    return async () => {
      workspace.showMessage(`Reloading rust-analyzer...`);

      for (const sub of ctx.subscriptions) {
        try {
          sub.dispose();
        } catch (e) {
          console.error(e);
        }
      }

      await activate(context);

      workspace.showMessage(`Reloaded rust-analyzer`);
    };
  });

  await ctx.checkUpdate();
}
