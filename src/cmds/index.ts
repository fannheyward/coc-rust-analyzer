import { commands, Uri, workspace } from 'coc.nvim';
import { Location, Position, Range, TextDocumentEdit, TextEdit, WorkspaceEdit } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import * as ra from '../rust-analyzer-api';
import * as sourceChange from '../source_change';

export * from './analyzer_status';
export * from './expand_macro';
export * from './join_lines';
export * from './matching_brace';
export * from './on_enter';
export * from './parent_module';
export * from './runnables';
export * from './server_version';
export * from './ssr';
export * from './syntax_tree';

export function collectGarbage(ctx: Ctx): Cmd {
  return async () => {
    await ctx.client.sendRequest(ra.collectGarbage, null);
  };
}

export function showReferences(): Cmd {
  return (uri: string, position: Position, locations: Location[]) => {
    if (!uri) {
      return;
    }
    commands.executeCommand('editor.action.showReferences', Uri.parse(uri), position, locations);
  };
}

export function applySourceChange(): Cmd {
  return async (change: ra.SourceChange) => {
    await sourceChange.applySourceChange(change);
  };
}

export function selectAndApplySourceChange(): Cmd {
  return async (changes: ra.SourceChange[]) => {
    if (changes?.length === 1) {
      await sourceChange.applySourceChange(changes[0]);
    } else if (changes?.length > 0) {
      const pick = await workspace.showQuickpick(changes.map((c) => c.label));
      if (pick) {
        await sourceChange.applySourceChange(changes[pick]);
      }
    }
  };
}

export function upgrade(ctx: Ctx) {
  return async () => {
    await ctx.checkUpdate(false);
  };
}

export function toggleInlayHints(ctx: Ctx) {
  return async () => {
    if (!ctx.config.inlayHints.chainingHints) {
      workspace.showMessage(`Inlay hints for method chains is disabled. Toggle action does nothing;`, 'warning');
      return;
    }
    for (const sub of ctx.subscriptions) {
      // @ts-ignore
      if (typeof sub.toggle === 'function') sub.toggle();
    }
  };
}

function parseSnippet(snip: string): [string, [number, number]] | undefined {
  const m = snip.match(/\$(0|\{0:([^}]*)\})/);
  if (!m) return undefined;
  const placeholder = m[2] ?? '';
  const range: [number, number] = [m.index!!, placeholder.length];
  const insert = snip.replace(m[0], placeholder);
  return [insert, range];
}

function countLines(text: string): number {
  return (text.match(/\n/g) || []).length;
}

export async function applySnippetWorkspaceEdit(edit: WorkspaceEdit) {
  if (!edit.documentChanges?.length) {
    return;
  }

  let selection: Range | undefined = undefined;
  let lineDelta = 0;
  const change = edit.documentChanges[0];
  if (TextDocumentEdit.is(change)) {
    for (const indel of change.edits) {
      const wsEdit: WorkspaceEdit = {};
      const parsed = parseSnippet(indel.newText);
      if (parsed) {
        const [newText, [placeholderStart, placeholderLength]] = parsed;
        const prefix = newText.substr(0, placeholderStart);
        const lastNewline = prefix.lastIndexOf('\n');

        const startLine = indel.range.start.line + lineDelta + countLines(prefix);
        const startColumn = lastNewline === -1 ? indel.range.start.character + placeholderStart : prefix.length - lastNewline - 1;
        const endColumn = startColumn + placeholderLength;
        selection = Range.create(startLine, startColumn, startLine, endColumn);

        const newChange = TextDocumentEdit.create(change.textDocument, [TextEdit.replace(indel.range, newText)]);
        wsEdit.documentChanges = [newChange];
      } else {
        lineDelta = countLines(indel.newText) - (indel.range.end.line - indel.range.start.line);
        wsEdit.documentChanges = [change];
      }

      await workspace.applyEdit(wsEdit);
    }

    if (selection) {
      const current = await workspace.document;
      if (current.uri !== change.textDocument.uri) {
        await workspace.loadFile(change.textDocument.uri);
        await workspace.jumpTo(change.textDocument.uri);
        // FIXME
        return;
      }
      await workspace.selectRange(selection);
    }
  }
}

export function applySnippetWorkspaceEditCommand(): Cmd {
  return async (edit: WorkspaceEdit) => {
    await applySnippetWorkspaceEdit(edit);
  };
}
