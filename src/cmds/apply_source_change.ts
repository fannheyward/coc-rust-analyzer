import { Uri, workspace } from 'coc.nvim';
import { CreateFile, RenameFile, TextDocumentPositionParams, WorkspaceEdit } from 'vscode-languageserver-protocol';

export interface SourceChange {
  label: string;
  workspaceEdit: WorkspaceEdit;
  cursorPosition?: TextDocumentPositionParams;
}

export async function handle(change: SourceChange) {
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
    const toOpenUri = Uri.parse(toOpen);
    await workspace.readFile(toOpenUri.fsPath);
  } else if (toReveal) {
    const uri = toReveal.textDocument.uri;
    const position = toReveal.position;
    const document = await workspace.document;
    if (document.uri.toString() != uri.toString()) {
      return;
    }

    workspace.nvim.command(`call setpos('.', [${document.bufnr}, ${position.line + 1}, ${position.character + 1}, 0])`);
  }
}
