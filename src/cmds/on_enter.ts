import { events, workspace } from 'coc.nvim';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';
import { applySourceChange, SourceChange } from '../source_change';

function sleep(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export function onEnter(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (doc.textDocument.languageId !== 'rust' || !ctx.client) {
      return;
    }

    let lastChar: string | null;
    let lastTS = 0;
    events.on('InsertCharPre', (char: string) => {
      lastChar = char;
      lastTS = Date.now();
    });

    events.on('TextChangedI', async (bufnr: number) => {
      const doc = workspace.getDocument(bufnr);
      if (!doc || !ctx.client) {
        return;
      }

      if (lastChar && lastChar === '/' && Date.now() - lastTS < 40) {
        await sleep(20);

        const { document, position } = await workspace.getCurrentState();
        const request: TextDocumentPositionParams = {
          textDocument: { uri: document.uri },
          position
        };
        const change = await ctx.client.sendRequest<undefined | SourceChange>('rust-analyzer/onEnter', request);
        if (!change) {
          return;
        }

        await applySourceChange(change);
      }
      lastChar = null;
    });

    events.on('InsertLeave', () => {
      lastChar = null;
    });
  };
}
