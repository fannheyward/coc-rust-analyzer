import { commands, Uri, workspace } from 'coc.nvim';
import { Location, Position } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import * as sourceChange from '../source_change';
import { analyzerStatus } from './analyzer_status';
import { expandMacro } from './expand_macro';
import { joinLines } from './join_lines';
import { matchingBrace } from './matching_brace';
import { onEnter } from './on_enter';
import { parentModule } from './parent_module';
import { run, runSingle } from './runnables';
import { syntaxTree } from './syntax_tree';

function collectGarbage(ctx: Ctx): Cmd {
  return async () => {
    ctx.client?.sendRequest<null>('rust-analyzer/collectGarbage', null);
  };
}

function showReferences(): Cmd {
  return (uri: string, position: Position, locations: Location[]) => {
    if (!uri) {
      return;
    }
    commands.executeCommand('editor.action.showReferences', Uri.parse(uri), position, locations);
  };
}

function applySourceChange(): Cmd {
  return async (change: sourceChange.SourceChange) => {
    sourceChange.applySourceChange(change);
  };
}

function selectAndApplySourceChange(): Cmd {
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

function reload(ctx: Ctx): Cmd {
  return async () => {
    workspace.showMessage(`Reloading rust-analyzer...`);
    await ctx.restartServer();
  };
}

export {
  analyzerStatus,
  selectAndApplySourceChange,
  applySourceChange,
  joinLines,
  matchingBrace,
  onEnter,
  parentModule,
  run,
  runSingle,
  syntaxTree,
  expandMacro,
  collectGarbage,
  showReferences,
  reload
};
