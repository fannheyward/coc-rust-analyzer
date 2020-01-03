import { workspace } from 'coc.nvim';
import { Location, TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';

export function parentModule(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (document.languageId !== 'rust' || !ctx.client) {
      return;
    }

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position
    };

    const response = await ctx.client.sendRequest<Location[]>('rust-analyzer/parentModule', param);
    if (response.length > 0) {
      const uri = response[0].uri;
      const range = response[0].range;

      workspace.jumpTo(uri, range.start);
    }
  };
}
