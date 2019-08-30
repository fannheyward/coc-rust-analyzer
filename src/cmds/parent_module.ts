import { workspace } from 'coc.nvim';
import { Location, TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { Server } from '../server';

export async function handle() {
  const { document, position } = await workspace.getCurrentState();
  if (document.languageId !== 'rust') {
    return;
  }

  const param: TextDocumentPositionParams = {
    textDocument: { uri: document.uri },
    position
  };

  const response = await Server.client.sendRequest<Location[]>('rust-analyzer/parentModule', param);
  if (response.length > 0) {
    const uri = response[0].uri;
    const range = response[0].range;

    console.error(range.start.line, range.start.character, range.end.line, range.end.character);
    workspace.jumpTo(uri, range.start);
  }
}
