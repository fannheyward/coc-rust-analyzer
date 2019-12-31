import { workspace } from 'coc.nvim';
import { Range, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Ctx, Cmd } from '../ctx';

interface SyntaxTreeParams {
  textDocument: TextDocumentIdentifier;
  range?: Range;
}

export function syntaxTree(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (doc.textDocument.languageId !== 'rust') {
      return;
    }

    const param: SyntaxTreeParams = {
      textDocument: { uri: doc.uri }
    };

    const ret = await ctx.client.sendRequest<string>('rust-analyzer/syntaxTree', param);
    await workspace.nvim.command('tabnew').then(async () => {
      const buf = await workspace.nvim.buffer;
      buf.setLines(ret.split('\n'), { start: 0, end: -1 });
    });
  };
}
