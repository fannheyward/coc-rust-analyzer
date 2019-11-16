import { ExtensionContext, Terminal, TerminalOptions, workspace } from 'coc.nvim';
import { Position, Range, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Server } from '../server';
import { exec } from 'child_process';
import { promisify } from 'util';

import { CargoWatchProvider, registerCargoWatchProvider } from './cargo_watch';

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

export async function handle() {
  const { document, position } = await workspace.getCurrentState();
  if (document.languageId !== 'rust') {
    return;
  }

  workspace.showMessage(`Fetching runnable...`);

  const params: RunnablesParams = {
    textDocument: { uri: document.uri },
    position
  };
  const runnables = await Server.client.sendRequest<Runnable[]>('rust-analyzer/runnables', params);

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
}

export async function handleSingle(runnable: Runnable) {
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
}

export async function startCargoWatch(context: ExtensionContext): Promise<CargoWatchProvider | undefined> {
  const execPromise = promisify(exec);

  const { stderr, code = 0 } = await execPromise('cargo watch --version').catch(e => e);

  if (stderr.includes('no such subcommand: `watch`')) {
    const msg = 'The `cargo-watch` subcommand is not installed. Install? (takes ~1-2 minutes)';
    const install = await workspace.showPrompt(msg);
    if (!install) {
      return;
    }

    await workspace.runTerminalCommand(`cargo install cargo-watch`, '.', true);

    const output = await execPromise('cargo watch --version').catch(e => e);
    if (output.stderr !== '') {
      workspace.showMessage(`Couldn't install \`cargo-\`watch: ${output.stderr}`, 'error');
      return;
    }
  } else if (code !== 0) {
    workspace.showMessage(`\`cargo-watch\` failed with ${code}: ${stderr}`);
    return;
  }

  const provider = registerCargoWatchProvider(context.subscriptions);
  if (provider) {
    provider.start();
  }

  return provider;
}

/**
 * Interactively asks the user whether we should run `cargo check` in order to
 * provide inline diagnostics; the user is met with a series of dialog boxes
 * that, when accepted, allow us to `cargo install cargo-watch` and then run it.
 */
export async function interactivelyStartCargoWatch(context: ExtensionContext): Promise<CargoWatchProvider | undefined> {
  if (Server.config.cargoWatchOptions.enableOnStartup === 'disabled') {
    return;
  }

  if (Server.config.cargoWatchOptions.enableOnStartup === 'ask') {
    const watch = await workspace.showPrompt('Start watching changes with cargo? (Executes `cargo watch`, provides inline diagnostics');
    if (!watch) {
      return;
    }
  }

  return startCargoWatch(context);
}
