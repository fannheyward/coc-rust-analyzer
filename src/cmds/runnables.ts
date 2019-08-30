import { Terminal, TerminalOptions, workspace } from 'coc.nvim';
import { Position, Range, TextDocumentIdentifier } from 'vscode-languageserver-protocol';
import { Server } from '../server';

// import { CargoWatchProvider, registerCargoWatchProvider } from './cargo_watch';

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

// export async function handleSingle(runnable: Runnable) {
//   const { document } = await workspace.getCurrentState();
//   if (document.languageId !== 'rust') {
//     return;
//   }

//   const cmd = `${runnable.bin} ${runnable.args.join(' ')}`;
//   const opt: TerminalOptions = {
//     name: runnable.label,
//     cwd: runnable.cwd,
//     env: runnable.env
//   };
//   workspace.createTerminal(opt).then((t: Terminal) => {
//     t.sendText(cmd);
//   });
// }

// /**
//  * Interactively asks the user whether we should run `cargo check` in order to
//  * provide inline diagnostics; the user is met with a series of dialog boxes
//  * that, when accepted, allow us to `cargo install cargo-watch` and then run it.
//  */
// export async function interactivelyStartCargoWatch(context: vscode.ExtensionContext): Promise<CargoWatchProvider | undefined> {
//   if (Server.config.cargoWatchOptions.enableOnStartup === 'disabled') {
//     return;
//   }

//   if (Server.config.cargoWatchOptions.enableOnStartup === 'ask') {
//     const watch = await vscode.window.showInformationMessage('Start watching changes with cargo? (Executes `cargo watch`, provides inline diagnostics)', 'yes', 'no');
//     if (watch !== 'yes') {
//       return;
//     }
//   }

//   return startCargoWatch(context);
// }

// export async function startCargoWatch(context: vscode.ExtensionContext): Promise<CargoWatchProvider | undefined> {
//   const execPromise = util.promisify(child_process.exec);

//   const { stderr } = await execPromise('cargo watch --version').catch(e => e);

//   if (stderr.includes('no such subcommand: `watch`')) {
//     const msg = 'The `cargo-watch` subcommand is not installed. Install? (takes ~1-2 minutes)';
//     const install = await vscode.window.showInformationMessage(msg, 'yes', 'no');
//     if (install !== 'yes') {
//       return;
//     }

//     const label = 'install-cargo-watch';
//     const taskFinished = new Promise((resolve, reject) => {
//       const disposable = vscode.tasks.onDidEndTask(({ execution }) => {
//         if (execution.task.name === label) {
//           disposable.dispose();
//           resolve();
//         }
//       });
//     });

//     vscode.tasks.executeTask(
//       createTask({
//         label,
//         bin: 'cargo',
//         args: ['install', 'cargo-watch'],
//         env: {}
//       })
//     );
//     await taskFinished;
//     const output = await execPromise('cargo watch --version').catch(e => e);
//     if (output.stderr !== '') {
//       vscode.window.showErrorMessage(`Couldn't install \`cargo-\`watch: ${output.stderr}`);
//       return;
//     }
//   }

//   const provider = await registerCargoWatchProvider(context.subscriptions);
//   if (provider) {
//     provider.start();
//   }
//   return provider;
// }
