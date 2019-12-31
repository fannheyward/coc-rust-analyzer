import { workspace } from 'coc.nvim';
import { Position, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Ctx, Cmd } from '../ctx';

interface FindMatchingBraceParams {
  textDocument: TextDocumentIdentifier;
  offsets: Position[];
}

export function matchingBrace(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (document.languageId !== 'rust') {
      return;
    }

    const request: FindMatchingBraceParams = {
      textDocument: { uri: document.uri },
      offsets: [position]
    };

    const response = await ctx.client.sendRequest<Position[]>('rust-analyzer/findMatchingBrace', request);
    if (response.length > 0) {
      workspace.jumpTo(document.uri, response[0]);
    }
  };
}
