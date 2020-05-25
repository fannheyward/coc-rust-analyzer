import { workspace } from 'coc.nvim';
import { Cmd, Ctx, isRustDocument } from '../ctx';
import * as ra from '../rust-analyzer-api';

export function joinLines(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (!isRustDocument(doc.textDocument)) return;

    const mode = await workspace.nvim.call('visualmode');
    const range = await workspace.getSelectedRange(mode, doc);
    if (!range) {
      return;
    }
    const param: ra.JoinLinesParams = {
      textDocument: { uri: doc.uri },
      ranges: [range],
    };
    const items = await ctx.client.sendRequest(ra.joinLines, param);
    await doc.applyEdits(items);
  };
}
