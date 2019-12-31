import { commands, Uri } from 'coc.nvim';
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
    ctx.client.sendRequest<null>('rust-analyzer/collectGarbage', null);
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

export { analyzerStatus, applySourceChange, joinLines, matchingBrace, onEnter, parentModule, run, runSingle, syntaxTree, expandMacro, collectGarbage, showReferences };
