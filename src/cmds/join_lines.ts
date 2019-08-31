import { workspace } from 'coc.nvim';
import { Range, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Server } from '../server';
import { handle as applySourceChange, SourceChange } from './apply_source_change';

interface JoinLinesParams {
  textDocument: TextDocumentIdentifier;
  range: Range;
}

export async function handle() {
  const doc = await workspace.document;
  if (doc.textDocument.languageId !== 'rust') {
    return;
  }
  const range = await workspace.getSelectedRange('v', doc);
  if (!range) {
    return;
  }
  const param: JoinLinesParams = {
    textDocument: { uri: doc.uri },
    range
  };
  const change = await Server.client.sendRequest<SourceChange>('rust-analyzer/joinLines', param);
  await applySourceChange(change);
}
