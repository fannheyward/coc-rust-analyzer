import { Terminal, TerminalOptions, workspace } from 'coc.nvim';
import { Position, Range, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Cmd, Ctx } from '../ctx';

interface RunnablesParams {
  textDocument: TextDocumentIdentifier;
  position?: Position;
}

interface Runnable {
  label: string;
  bin: string;
  args: string[];
  env: { [index: string]: string };
  cwd?: string;
  range: Range;
}

class RunnableQuickPick {
  label: string;

  constructor(public runnable: Runnable) {
    this.label = runnable.label;
  }
}

export function run(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (document.languageId !== 'rust' || !ctx.client) {
      return;
    }

    workspace.showMessage(`Fetching runnable...`);

    const params: RunnablesParams = {
      textDocument: { uri: document.uri },
      position
    };
    const runnables = await ctx.client.sendRequest<Runnable[]>('rust-analyzer/runnables', params);

    const items: RunnableQuickPick[] = [];
    for (const r of runnables) {
      items.push(new RunnableQuickPick(r));
    }

    const idx = await workspace.showQuickpick(items.map(o => o.label));
    if (idx === -1) {
      return;
    }

    const runnable = items[idx].runnable;
    const cmd = `${runnable.bin} ${runnable.args.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.cwd,
      env: runnable.env
    };
    workspace.createTerminal(opt).then((t: Terminal) => {
      t.sendText(cmd);
    });
  };
}

export function runSingle(): Cmd {
  return async (runnable: Runnable) => {
    const { document } = await workspace.getCurrentState();
    if (!runnable || document.languageId !== 'rust') {
      return;
    }

    const cmd = `${runnable.bin} ${runnable.args.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.cwd,
      env: runnable.env
    };
    workspace.createTerminal(opt).then((t: Terminal) => {
      t.sendText(cmd);
    });
  };
}
