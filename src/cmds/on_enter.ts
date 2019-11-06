import { events, workspace } from 'coc.nvim';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { Server } from '../server';
import { handle as applySourceChange, SourceChange } from './apply_source_change';

function sleep(ms: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

export async function handle() {
  const doc = await workspace.document;
  if (doc.textDocument.languageId !== 'rust') {
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
    if (!doc) {
      return;
    }

    if (lastChar && lastChar === '/' && Date.now() - lastTS < 40) {
      await sleep(20);

      const { document, position } = await workspace.getCurrentState();
      const request: TextDocumentPositionParams = {
        textDocument: { uri: document.uri },
        position
      };
      const change = await Server.client.sendRequest<undefined | SourceChange>('rust-analyzer/onEnter', request);
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
}
