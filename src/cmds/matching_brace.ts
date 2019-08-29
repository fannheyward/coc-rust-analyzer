import { Position, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import * as cv from 'coc.nvim/lib/language-client/utils/converter';
import { Server } from '../server';

interface FindMatchingBraceParams {
  textDocument: TextDocumentIdentifier;
  offsets: Position[];
}

export async function handle() {
  const editor = vscode.window.activeTextEditor;
  if (editor == null || editor.document.languageId !== 'rust') {
    return;
  }
  const request: FindMatchingBraceParams = {
    textDocument: { uri: editor.document.uri.toString() },
    offsets: editor.selections.map(s => {
      return Server.client.code2ProtocolConverter.asPosition(s.active);
    })
  };
  const response = await Server.client.sendRequest<Position[]>('rust-analyzer/findMatchingBrace', request);
  editor.selections = editor.selections.map((sel, idx) => {
    const active = Server.client.protocol2CodeConverter.asPosition(response[idx]);
    const anchor = sel.isEmpty ? active : sel.anchor;
    return new vscode.Selection(anchor, active);
  });
  editor.revealRange(editor.selection);
}
