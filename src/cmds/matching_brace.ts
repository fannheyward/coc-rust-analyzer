import { workspace } from 'coc.nvim';
import { Position, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Server } from '../server';

interface FindMatchingBraceParams {
  textDocument: TextDocumentIdentifier;
  offsets: Position[];
}

export async function handle() {
  const { document, position } = await workspace.getCurrentState();
  if (document.languageId !== 'rust') {
    return;
  }

  const request: FindMatchingBraceParams = {
    textDocument: { uri: document.uri },
    offsets: [position]
  };

  const response = await Server.client.sendRequest<Position[]>('rust-analyzer/findMatchingBrace', request);
  if (response.length > 0) {
    workspace.jumpTo(document.uri, response[0]);
  }
}
