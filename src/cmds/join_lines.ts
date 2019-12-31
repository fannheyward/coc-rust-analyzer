import { workspace } from 'coc.nvim';
import { Range, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import { applySourceChange, SourceChange } from '../source_change';

interface JoinLinesParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
}

export function joinLines(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (doc.textDocument.languageId !== 'rust') {
      return;
    }
    const mode = await workspace.nvim.call('visualmode');
    const range = await workspace.getSelectedRange(mode, doc);
    if (!range) {
      return;
    }
    const param: JoinLinesParams = {
      textDocument: { uri: doc.uri },
      range
    };
    const change = await ctx.client.sendRequest<SourceChange>('rust-analyzer/joinLines', param);
    await applySourceChange(change);
  };
}
