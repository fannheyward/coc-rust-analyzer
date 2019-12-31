import { Ctx, Cmd } from '../ctx';
import { analyzerStatus } from './analyzer_status';
import { matchingBrace } from './matching_brace';
import * as applySourceChange from './apply_source_change';
// import * as inlayHints from './inlay_hints';
import * as joinLines from './join_lines';
import * as onEnter from './on_enter';
import * as parentModule from './parent_module';
import * as runnables from './runnables';
import * as syntaxTree from './syntaxTree';
import * as expandMacro from './expand_macro';

function collectGarbage(ctx: Ctx): Cmd {
  return async () => {
    ctx.client.sendRequest<null>('rust-analyzer/collectGarbage', null);
  };
}

export { analyzerStatus, applySourceChange, joinLines, matchingBrace, onEnter, parentModule, runnables, syntaxTree, expandMacro, collectGarbage };
