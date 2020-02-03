import { commands, Uri, workspace } from 'coc.nvim';
import { Location, Position } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import { downloadServer } from '../downloader';
import * as sourceChange from '../source_change';

export * from './analyzer_status';
export * from './expand_macro';
export * from './join_lines';
export * from './matching_brace';
export * from './on_enter';
export * from './parent_module';
export * from './runnables';
export * from './syntax_tree';

export function collectGarbage(ctx: Ctx): Cmd {
  return async () => {
    ctx.client?.sendRequest<null>('rust-analyzer/collectGarbage', null);
  };
}

export function showReferences(): Cmd {
  return (uri: string, position: Position, locations: Location[]) => {
    if (!uri) {
      return;
    }
    commands.executeCommand('editor.action.showReferences', Uri.parse(uri), position, locations);
  };
}

export function applySourceChange(): Cmd {
  return async (change: sourceChange.SourceChange) => {
    sourceChange.applySourceChange(change);
  };
}

export function selectAndApplySourceChange(): Cmd {
  return async (changes: sourceChange.SourceChange[]) => {
    if (changes?.length === 1) {
      await sourceChange.applySourceChange(changes[0]);
    } else if (changes?.length > 0) {
      const pick = await workspace.showQuickpick(changes.map(c => c.label));
      if (pick) {
        await sourceChange.applySourceChange(changes[pick]);
      }
    }
  };
}

export function reload(ctx: Ctx): Cmd {
  return async () => {
    workspace.showMessage(`Reloading rust-analyzer...`);
    await ctx.restartServer();
  };
}

export function upgrade(ctx: Ctx) {
  return async () => {
    await ctx.stopServer();
    await downloadServer(ctx.extCtx.storagePath);
    await ctx.restartServer();
  };
}
