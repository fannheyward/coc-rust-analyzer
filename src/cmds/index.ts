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

export function applySnippetWorkspaceEdit(): Cmd {
  return async (edit: WorkspaceEdit) => {
    if (!edit.documentChanges?.length) {
      return;
    }

    const change = edit.documentChanges[0];
    if (TextDocumentEdit.is(change)) {
      let editWithSnippet: TextEdit | undefined = undefined;

      for (const indel of change.edits) {
        const isSnippet = indel.newText.indexOf('$0') !== -1 || indel.newText.indexOf('${') !== -1;
        if (isSnippet) {
          editWithSnippet = indel;
        }
      }

      if (editWithSnippet) {
        const current = await workspace.document;
        if (current.uri !== change.textDocument.uri) {
          const start = Position.create(editWithSnippet.range.start.line - 1, editWithSnippet.range.start.character);
          const end = Position.create(editWithSnippet.range.end.line - 1, editWithSnippet.range.end.character);
          editWithSnippet = TextEdit.replace(Range.create(start, end), editWithSnippet.newText);

          await workspace.loadFile(change.textDocument.uri);
          await workspace.jumpTo(change.textDocument.uri);
        }
        await commands.executeCommand('editor.action.insertSnippet', editWithSnippet);
      }
    }
  };
}
