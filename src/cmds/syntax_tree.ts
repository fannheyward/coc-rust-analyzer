import { workspace } from 'coc.nvim';
import { Range } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import * as ra from '../rust-analyzer-api';

export function syntaxTree(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (doc.textDocument.languageId !== 'rust' || !ctx.client) {
      return;
    }

    const mode = await workspace.nvim.call('visualmode');
    let range: Range | null = null;
    if (mode) {
      range = await workspace.getSelectedRange(mode, doc);
    }
    const param: ra.SyntaxTreeParams = {
      textDocument: { uri: doc.uri },
      range,
    };

    const ret = await ctx.client.sendRequest(ra.syntaxTree, param);
    await workspace.nvim.command('tabnew').then(async () => {
      const buf = await workspace.nvim.buffer;
      buf.setLines(ret.split('\n'), { start: 0, end: -1 });
    });
  };
}
