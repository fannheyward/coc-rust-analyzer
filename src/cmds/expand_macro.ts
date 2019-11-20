import { workspace } from 'coc.nvim';
import { Position, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Server } from '../server';

interface MacroExpandParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface ExpandedMacro {
  name: string;
  expansion: string;
}

function codeFormat(expanded: ExpandedMacro): string {
  let result = `// Recursive expansion of ${expanded.name}! macro\n`;
  result += '// ' + '='.repeat(result.length - 3);
  result += '\n\n';
  result += expanded.expansion;

  return result;
}

export async function handler() {
  const { document, position } = await workspace.getCurrentState();
  if (document.languageId !== 'rust') {
    return;
  }

  const param: MacroExpandParams = {
    textDocument: { uri: document.uri },
    position
  };

  const expanded = await Server.client.sendRequest<ExpandedMacro>('rust-analyzer/expandMacro', param);
  if (!expanded) {
    return;
  }

  await workspace.nvim.command('tabnew').then(async () => {
    const buf = await workspace.nvim.buffer;
    buf.setLines(codeFormat(expanded).split('\n'), { start: 0, end: -1 });
  });
}
