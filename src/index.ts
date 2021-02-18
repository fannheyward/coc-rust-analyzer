import { ExtensionContext, window } from 'coc.nvim';
import { existsSync, mkdirSync } from 'fs';
import * as cmds from './commands';
import { Ctx } from './ctx';
import { downloadServer, getLatestRelease } from './downloader';

export async function activate(context: ExtensionContext): Promise<void> {
  const ctx = new Ctx(context);
  if (!ctx.config.enable) {
    return;
  }

  const serverRoot = context.storagePath;
  if (!existsSync(serverRoot)) {
    mkdirSync(serverRoot);
  }

  const bin = ctx.resolveBin();
  if (!bin) {
    let msg = 'Rust Analyzer is not found, download from GitHub release?';
    let ret = 0;
    if (ctx.config.prompt) {
      ret = await window.showQuickpick(['Yes', 'Cancel'], msg);
    }
    if (ret === 0) {
      try {
        const latest = await getLatestRelease(ctx.config.channel);
        if (!latest) throw new Error('Failed to get latest release');
        await downloadServer(context, latest);
      } catch (e) {
        console.error(e);
        msg = 'Download rust-analyzer failed, you can get it from https://github.com/rust-analyzer/rust-analyzer';
        window.showMessage(msg, 'error');
        return;
      }
    } else {
      return;
    }
  }

  // internal commands that are invoked by server
  ctx.registerCommand('runSingle', cmds.runSingle, true);
  ctx.registerCommand('debugSingle', cmds.debugSingle, true);
  ctx.registerCommand('showReferences', cmds.showReferences, true);
  ctx.registerCommand('resolveCodeAction', cmds.resolveCodeAction, true);
  ctx.registerCommand('applySnippetWorkspaceEdit', cmds.applySnippetWorkspaceEditCommand, true);

  // common commands
  ctx.registerCommand('run', cmds.run);
  ctx.registerCommand('ssr', cmds.ssr);
  ctx.registerCommand('upgrade', cmds.upgrade);
  ctx.registerCommand('viewHir', cmds.viewHir);
  ctx.registerCommand('openDocs', cmds.openDocs);
  ctx.registerCommand('joinLines', cmds.joinLines);
  ctx.registerCommand('syntaxTree', cmds.syntaxTree);
  ctx.registerCommand('memoryUsage', cmds.memoryUsage);
  ctx.registerCommand('expandMacro', cmds.expandMacro);
  ctx.registerCommand('explainError', cmds.explainError);
  ctx.registerCommand('parentModule', cmds.parentModule);
  ctx.registerCommand('matchingBrace', cmds.matchingBrace);
  ctx.registerCommand('openCargoToml', cmds.openCargoToml);
  ctx.registerCommand('serverVersion', cmds.serverVersion);
  ctx.registerCommand('analyzerStatus', cmds.analyzerStatus);
  ctx.registerCommand('reloadWorkspace', cmds.reloadWorkspace);
  ctx.registerCommand('toggleInlayHints', cmds.toggleInlayHints);
  ctx.registerCommand('echoRunCommandLine', cmds.echoRunCommandLine);
  ctx.registerCommand('reload', (ctx) => {
    return async () => {
      window.showMessage(`Reloading rust-analyzer...`);

      for (const sub of ctx.subscriptions) {
        try {
          sub.dispose();
        } catch (e) {
          console.error(e);
        }
      }

      await activate(context);

      window.showMessage(`Reloaded rust-analyzer`);
    };
  });

  await ctx.startServer();
  await ctx.activateInlayHints();
  if (bin) await ctx.checkUpdate();
}
