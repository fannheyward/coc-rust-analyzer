import { workspace } from 'coc.nvim';
import { TextDocumentPositionParams } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';

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

export function expandMacro(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (document.languageId !== 'rust') {
      return;
    }

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position
    };

    const expanded = await ctx.client.sendRequest<ExpandedMacro>('rust-analyzer/expandMacro', param);
    if (!expanded) {
      return;
    }

    await workspace.nvim.command('tabnew').then(async () => {
      const buf = await workspace.nvim.buffer;
      buf.setLines(codeFormat(expanded).split('\n'), { start: 0, end: -1 });
    });
  };
}
