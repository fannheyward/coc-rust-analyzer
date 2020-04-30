import { Terminal, TerminalOptions, workspace } from 'coc.nvim';
import { Cmd, Ctx, isRustDocument } from '../ctx';
import * as ra from '../rust-analyzer-api';

class RunnableQuickPick {
  label: string;

  constructor(public runnable: ra.Runnable) {
    this.label = runnable.label;
  }
}

export function run(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    workspace.showMessage(`Fetching runnable...`);

    const params: ra.RunnablesParams = {
      textDocument: { uri: document.uri },
      position,
    };
    const runnables = await ctx.client.sendRequest(ra.runnables, params);

    const items: RunnableQuickPick[] = [];
    for (const r of runnables) {
      items.push(new RunnableQuickPick(r));
    }

    const idx = await workspace.showQuickpick(items.map((o) => o.label));
    if (idx === -1) {
      return;
    }

    const runnable = items[idx].runnable;
    const cmd = `${runnable.bin} ${runnable.args.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.cwd!,
      env: runnable.env,
    };
    workspace.createTerminal(opt).then((t: Terminal) => {
      t.sendText(cmd);
    });
  };
}

export function runSingle(): Cmd {
  return async (runnable: ra.Runnable) => {
    const { document } = await workspace.getCurrentState();
    if (!runnable || !isRustDocument(document)) return;

    const cmd = `${runnable.bin} ${runnable.args.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.cwd!,
      env: runnable.env,
    };
    workspace.createTerminal(opt).then((t: Terminal) => {
      t.sendText(cmd);
    });
  };
}
