import { Uri, workspace } from 'coc.nvim';
import { CreateFile, RenameFile } from 'vscode-languageserver-protocol';
import { SourceChange } from './rust-analyzer-api';

export async function applySourceChange(change: SourceChange) {
  if (!change) {
    return;
  }

  const wsEdit = change.workspaceEdit;

  let created: string | undefined;
  let moved: string | undefined;
  if (change.workspaceEdit.documentChanges) {
    for (const docChange of change.workspaceEdit.documentChanges) {
      if (CreateFile.is(docChange)) {
        created = docChange.uri;
      } else if (RenameFile.is(docChange)) {
        moved = docChange.newUri;
      }
    }
  }

  const toOpen = created || moved;
  const toReveal = change.cursorPosition;
  await workspace.applyEdit(wsEdit);
  if (toOpen) {
    await workspace.jumpTo(Uri.parse(toOpen).toString());
  } else if (toReveal) {
    const uri = toReveal.textDocument.uri;
    const position = toReveal.position;
    await workspace.jumpTo(uri, position);
  }
}
