import { workspace } from 'coc.nvim';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import * as ra from '../rust-analyzer-api';

export function parentModule(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (document.languageId !== 'rust' || !ctx.client) {
      return;
    }

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };

    const response = await ctx.client.sendRequest(ra.parentModule, param);
    if (response.length > 0) {
      const uri = response[0].uri;
      const range = response[0].range;

      workspace.jumpTo(uri, range.start);
    }
  };
}
