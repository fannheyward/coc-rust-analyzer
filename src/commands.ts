import { spawn, spawnSync } from 'node:child_process';
import {
  type CodeAction,
  commands,
  type Documentation,
  Location,
  Position,
  Range,
  type Terminal,
  type TerminalOptions,
  type TextDocumentPositionParams,
  TextEdit,
  Uri,
  window,
  workspace,
  type WorkspaceEdit,
  nvim,
} from 'coc.nvim';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';
import { CodeActionResolveRequest, TextDocumentEdit } from 'vscode-languageserver-protocol';
import { type Cmd, type Ctx, isCargoTomlDocument, isRustDocument } from './ctx';
import * as ra from './lsp_ext';

let terminal: Terminal | undefined;

class RunnableQuickPick {
  label: string;

  constructor(public runnable: ra.Runnable) {
    this.label = runnable.label;
  }
}

function isInRange(range: Range, position: Position): boolean {
  const lineWithin = range.start.line <= position.line && range.end.line >= position.line;
  const charWithin = range.start.character <= position.character && range.end.line >= position.character;
  return lineWithin && charWithin;
}

function codeFormat(expanded: ra.ExpandedMacro): string {
  let result = `// Recursive expansion of ${expanded.name}! macro\n`;
  result += `// ${'='.repeat(result.length - 3)}`;
  result += '\n\n';
  result += expanded.expansion;

  return result;
}

function countLines(text: string): number {
  return (text.match(/\n/g) || []).length;
}

export function reload(ctx: Ctx): Cmd {
  return async () => {
    window.showInformationMessage('Reloading rust-analyzer...');

    await ctx.client.stop();
    await ctx.client.start();

    window.showInformationMessage('Reloaded rust-analyzer');
  };
}

export function analyzerStatus(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;
    const params: ra.AnalyzerStatusParams = {
      textDocument: { uri: document.uri },
    };
    const ret = await ctx.client.sendRequest(ra.analyzerStatus, params);
    window.echoLines(ret.split('\n'));
  };
}

export function memoryUsage(ctx: Ctx): Cmd {
  return async () => {
    const ret = await ctx.client.sendRequest(ra.memoryUsage);
    window.echoLines(ret.split('\n'));
  };
}

export function matchingBrace(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const params: ra.MatchingBraceParams = {
      textDocument: { uri: document.uri },
      positions: [position],
    };

    const response = await ctx.client.sendRequest(ra.matchingBrace, params);
    if (response.length > 0) {
      workspace.jumpTo(document.uri, response[0]);
    }
  };
}

export function joinLines(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (!isRustDocument(doc.textDocument)) return;

    let range: Range | null = null;
    const mode = (await workspace.nvim.call('visualmode')) as string;
    if (mode) range = await window.getSelectedRange(mode);
    if (!range) {
      const state = await workspace.getCurrentState();
      range = Range.create(state.position, state.position);
    }
    const param: ra.JoinLinesParams = {
      textDocument: { uri: doc.uri },
      ranges: [range],
    };
    const items = await ctx.client.sendRequest(ra.joinLines, param);
    await doc.applyEdits(items);
  };
}

export function parentModule(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!(isRustDocument(document) || isCargoTomlDocument(document))) return;

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };

    const locations = await ctx.client.sendRequest(ra.parentModule, param);
    if (!locations) return;

    if (locations.length === 1) {
      const loc = locations[0];
      const uri = Location.is(loc) ? loc.uri : loc.targetUri;
      const pos = Location.is(loc) ? loc.range?.start : loc.targetRange?.start;
      workspace.jumpTo(uri, pos);
    } else {
      const uri = document.uri;
      const refs: Location[] = [];
      for (const l of locations) {
        refs.push(Location.is(l) ? l : Location.create(l.targetUri, l.targetRange));
      }
      await commands.executeCommand('editor.action.showReferences', Uri.parse(uri), position, refs);
    }
  };
}

export function ssr(ctx: Ctx): Cmd {
  return async () => {
    const input = await workspace.callAsync<string>('input', ['Enter request like: foo($a, $b) ==>> ($a).foo($b): ']);
    workspace.nvim.command('normal! :<C-u>', true);
    if (!input) {
      return;
    }

    if (!input.includes('==>>')) {
      return;
    }

    const selections: Range[] = [];
    const mode = await workspace.nvim.call('visualmode');
    if (mode) {
      const range = await window.getSelectedRange(mode);
      if (range) selections.push(range);
    }

    const { document, position } = await workspace.getCurrentState();
    const param: ra.SsrParams = {
      query: input,
      parseOnly: false,
      textDocument: { uri: document.uri },
      position,
      selections,
    };

    window.withProgress({ title: 'Structured search replacing...', cancellable: false }, async () => {
      const edit = await ctx.client.sendRequest(ra.ssr, param);
      await workspace.applyEdit(edit);
    });
  };
}

export function serverVersion(ctx: Ctx): Cmd {
  return async () => {
    const bin = ctx.resolveBin();
    if (!bin) {
      const msg = 'Rust Analyzer is not found';
      window.showErrorMessage(msg);
      return;
    }

    const version = spawnSync(bin, ['--version'], { encoding: 'utf-8' }).stdout.toString();
    window.showInformationMessage(version);
  };
}

async function fetchRunnable(ctx: Ctx): Promise<ra.Runnable[]> {
  const { document, position } = await workspace.getCurrentState();
  if (!isRustDocument(document)) return [];

  window.showInformationMessage('Fetching runnable...');

  const params: ra.RunnablesParams = {
    textDocument: { uri: document.uri },
    position,
  };

  return await ctx.client.sendRequest(ra.runnables, params);
}

async function pickRunnable(ctx: Ctx): Promise<ra.Runnable | undefined> {
  const runnables = await fetchRunnable(ctx);
  if (!runnables.length) return;

  const items: RunnableQuickPick[] = [];
  for (const r of runnables) {
    items.push(new RunnableQuickPick(r));
  }

  const idx = await window.showQuickpick(items.map((o) => o.label));
  if (idx === -1) return;

  return items[idx].runnable;
}

export function run(ctx: Ctx): Cmd {
  return async () => {
    const runnable = await pickRunnable(ctx);
    if (!runnable) return;

    await runSingle(ctx)(runnable);
  };
}

export function testCurrent(ctx: Ctx): Cmd {
  return async () => {
    const runnables = await fetchRunnable(ctx);
    if (!runnables.length) {
      window.showInformationMessage('No runnables found');
      return;
    }

    const testRunnable = runnables.find((run) => run.label.startsWith('cargo test'));
    if (!testRunnable) return;

    await runSingle(ctx)(testRunnable);
  };
}

export function debug(ctx: Ctx): Cmd {
  return async () => {
    const runnable = await pickRunnable(ctx);
    if (!runnable) return;

    await debugSingle(ctx)(runnable);
  };
}

export function debugSingle(ctx: Ctx): Cmd {
  return async (runnable: ra.Runnable) => {
    const { document } = await workspace.getCurrentState();
    if (!runnable || !isRustDocument(document)) return;

    let args: string[] = [];
    if (runnable.kind === 'cargo') {
      // TODO: runnable.args.overrideCargo?
      args = [...runnable.args.cargoArgs];
      if (runnable.args.executableArgs.length > 0) {
        runnable.args['executableArgs'][0] = `'${runnable.args['executableArgs'][0]}'`;
        args.push('--', ...runnable.args.executableArgs);
      }
    } else {
      args = [...runnable.args.args];
    }

    // do not run tests, we will run through gdb
    if (args[0] === 'test') {
      args.push('--no-run');
    }

    if (args[0] === 'run') {
      args[0] = 'build';
    }

    // output as json
    args.push('--message-format=json');

    console.debug(`${runnable.kind} ${args}`);
    // We can extract a list of generated executables from the output of cargo,
    // but if multiple executables are generated we need a way to find out which
    // one should be used for debugging.
    // From the arguments given to cargo, we can infer the kind and name of the executable
    // and filter the list of executables accordingly.
    let expectedKind: string | undefined;
    let expectedName: string | undefined;
    const cargoArgs = runnable.kind === 'cargo' ? runnable.args.cargoArgs : [];
    for (const arg of cargoArgs) {
      // Find the argument indicating the kind of the executable.
      if (expectedKind === undefined) {
        switch (arg) {
          case '--bin':
            expectedKind = 'bin';
            break;
          case '--lib':
            expectedKind = 'lib';
            break;
          case '--test':
            expectedKind = 'test';
            break;
          case '--example':
            expectedKind = 'example';
            break;
          case '--bench':
            expectedKind = 'bench';
            break;
        }
      } else {
        // expectedKind is defined if the previous argument matched one of the cases above.
        // In all of these cases except for '--lib' the name of the executable is the
        // argument analyzed in this iteration.
        if (expectedKind !== 'lib') {
          expectedName = arg;
        }
        // Stop iterating over the arguments, since we now have the information we need.
        break;
      }
    }
    // If the kind is 'lib' then the name of the executable is not yet known.
    // However, it will be the name of the package, so if we find the
    // --package argument we can get the name of the executable from it.
    if (expectedName === undefined) {
      let foundPackageArgument = false;
      for (const arg of cargoArgs) {
        if (foundPackageArgument) {
          expectedName = arg;
          break;
        }
        if (arg === '--package') {
          foundPackageArgument = true;
        }
      }
    }
    console.debug(`Expected kind: ${expectedKind}`);
    console.debug(`Expected name: ${expectedName}`);

    const proc = spawn(runnable.kind, args, { shell: true });

    const stderr_rl = readline.createInterface({
      input: proc.stderr,
      crlfDelay: Infinity,
    });
    window.withProgress({ title: 'Building Debug Target', cancellable: false }, async (progress) => {
      for await (const line of stderr_rl) {
        if (!line) {
          continue;
        }
        const message = line.trimStart();
        progress.report({ message: message });
      }
    });

    const rl = readline.createInterface({
      input: proc.stdout,
      crlfDelay: Infinity,
    });

    let executable = null;
    for await (const line of rl) {
      if (!line) {
        continue;
      }

      let cargoMessage = {};
      try {
        cargoMessage = JSON.parse(line);
      } catch (e) {
        console.error(e);
        continue;
      }

      if (!cargoMessage) {
        console.debug(`Skipping cargo message: ${cargoMessage}`);
      }

      if (cargoMessage['reason'] !== 'compiler-artifact') {
        console.debug(`Not artifact: ${cargoMessage['reason']}`);
        continue;
      }

      if (expectedKind !== undefined && !cargoMessage['target']['kind'].includes(expectedKind)) {
        console.debug(`Wrong kind: ${cargoMessage['target']['kind']}, expected ${expectedKind}`);
        continue;
      }

      if (expectedName !== undefined && cargoMessage['target']['name'] !== expectedName) {
        console.debug(`Wrong name: ${cargoMessage['target']['name']}, expected ${expectedName}`);
        continue;
      }

      if (cargoMessage['executable']) {
        executable = cargoMessage['executable'];
        break;
      }
    }

    if (!executable) {
      throw new Error('Could not find executable');
    }

    const executableArgs = runnable.kind === 'cargo' ? runnable.args.executableArgs.join(' ') : '';

    console.info(`Debugging executable: ${executable} ${executableArgs}`);

    const runtime = ctx.config.debug.runtime;
    if (runtime === 'termdebug') {
      await workspace.nvim.command(`TermdebugCommand ${executable} ${executableArgs}`);
      return;
    }

    if (runtime === 'vimspector') {
      const name = ctx.config.debug.vimspectorConfiguration.name;
      const configuration = { configuration: name, Executable: executable, Args: executableArgs };
      await workspace.nvim.call('vimspector#LaunchWithSettings', configuration);
      return;
    }

    if (runtime === 'nvim-dap') {
      const template = ctx.config.debug.nvimdapConfiguration.template;
      const args = executableArgs
        .split(' ')
        .filter((s) => s !== '')
        .map((s) => `"${s}"`)
        .join(',');
      const configuration = template?.replace('$exe', `"${executable}"`).replace('$args', `{${args}}`);
      await workspace.nvim.lua(`require("dap").run(${configuration})`);
      return;
    }

    throw new Error(`Invalid debug runtime: ${runtime}`);
  };
}

export function runSingle(ctx: Ctx): Cmd {
  return async (runnable: ra.Runnable) => {
    const { document } = await workspace.getCurrentState();
    if (!runnable || !isRustDocument(document)) return;

    let args: string[] = [];
    if (runnable.kind === 'cargo') {
      // TODO: runnable.args.overrideCargo?
      args = [...runnable.args.cargoArgs];
      if (runnable.args.executableArgs.length > 0) {
        runnable.args['executableArgs'][0] = `'${runnable.args['executableArgs'][0]}'`;
        args.push('--', ...runnable.args.executableArgs);
      }
    } else {
      args = [...runnable.args.args];
    }

    const cmd = `${runnable.kind} ${args.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.args.cwd,
    };
    if (terminal) {
      terminal.dispose();
      terminal = undefined;
    }
    terminal = await window.createTerminal(opt);
    terminal.sendText(cmd);
    if (ctx.config.terminal.startinsert) {
      await workspace.nvim.command('startinsert');
    }
  };
}

export function viewSyntaxTree(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (!isRustDocument(doc.textDocument)) return;

    const mode = await workspace.nvim.call('visualmode');
    let range: Range | null = null;
    if (mode) range = await window.getSelectedRange(mode);
    const param: ra.SyntaxTreeParams = {
      textDocument: { uri: doc.uri },
      range,
    };

    const ret = await ctx.client.sendRequest(ra.viewSyntaxTree, param);
    if (!ret) return;
    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command('edit +setl\\ buftype=nofile [SyntaxTree]', true);
    nvim.command('setl nobuflisted bufhidden=wipe', true);
    nvim.call('append', [0, ret.split('\n')], true);
    nvim.command('exe 1', true);
    await nvim.resumeNotification(true);
  };
}

export function expandMacro(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };

    const expanded = await ctx.client.sendRequest(ra.expandMacro, param);
    if (!expanded) return;

    const lines = codeFormat(expanded).split('\n');
    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command('edit +setl\\ buftype=nofile [Macro]', true);
    nvim.command('setl nobuflisted bufhidden=wipe', true);
    nvim.command('setl filetype=rust', true);
    nvim.call('append', [0, lines], true);
    nvim.command('exe 1', true);
    await nvim.resumeNotification(true);
  };
}

export function explainError(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const diag = ctx.client.diagnostics?.get(document.uri)?.find((diagnostic) => isInRange(diagnostic.range, position));
    if (diag?.code) {
      const explanation = spawnSync('rustc', ['--explain', `${diag.code}`], { encoding: 'utf-8' }).stdout.toString();

      const docs: Documentation[] = [];
      let isCode = false;
      for (const part of explanation.split('```\n')) {
        docs.push({ content: part, filetype: isCode ? 'rust' : 'markdown' });
        isCode = !isCode;
      }

      const float = window.createFloatFactory({});
      await float.show(docs);
    }
  };
}

export function reloadWorkspace(ctx: Ctx): Cmd {
  return async () => {
    await ctx.client?.sendRequest(ra.reloadWorkspace);
  };
}

export function showReferences(): Cmd {
  return async (uri: string, position: Position, locations: Location[]) => {
    if (!uri) {
      return;
    }
    await commands.executeCommand('editor.action.showReferences', Uri.parse(uri), position, locations);
  };
}

export function install(ctx: Ctx): Cmd {
  return async () => {
    await ctx.installServerFromGitHub();
  };
}

export function upgrade(ctx: Ctx) {
  return async () => {
    await ctx.checkUpdate(false);
  };
}

export async function applySnippetWorkspaceEdit(edit: WorkspaceEdit) {
  if (!edit?.documentChanges?.length) {
    return;
  }

  let position: Position | undefined;
  const change = edit.documentChanges[0];
  if (TextDocumentEdit.is(change)) {
    const newEdits: TextEdit[] = [];

    for (const indel of change.edits) {
      const { range } = indel;
      // biome-ignore lint/complexity/noUselessEscapeInRegex: x
      const parsed = indel.newText.replaceAll('\\}', '}').replaceAll(/\$\{[0-9]+:([^\}]+)\}/g, '$1');
      const index0 = parsed.indexOf('$0');
      if (index0 !== -1) {
        const prefix = parsed.substring(0, index0);
        const lastNewline = prefix.lastIndexOf('\n');

        const line = range.start.line + countLines(prefix);
        const col = lastNewline === -1 ? range.start.character + index0 : prefix.length - lastNewline - 1;
        position = Position.create(line, col);
      }

      newEdits.push(TextEdit.replace(range, parsed.replaceAll('$0', '')));
    }

    const current = await workspace.document;
    if (current.uri !== change.textDocument.uri) {
      await workspace.loadFile(change.textDocument.uri);
      await workspace.jumpTo(change.textDocument.uri);
    }

    await workspace.applyEdit({ changes: { [change.textDocument.uri]: newEdits } });

    if (position) {
      await window.moveTo(position);
    }
  }
}

export function applySnippetWorkspaceEditCommand(): Cmd {
  return async (edit: WorkspaceEdit) => {
    await applySnippetWorkspaceEdit(edit);
  };
}

export function runFlycheck(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    ctx.client.sendNotification(ra.runFlycheck, { textDocument: { uri: document.uri } });
  };
}

export function cancelFlycheck(ctx: Ctx): Cmd {
  return async () => {
    ctx.client.sendNotification(ra.cancelFlycheck);
  };
}

export function clearFlycheck(ctx: Ctx): Cmd {
  return async () => {
    ctx.client.sendNotification(ra.clearFlycheck);
  };
}

export function resolveCodeAction(ctx: Ctx): Cmd {
  return async (params: CodeAction) => {
    params.command = undefined;
    const item = (await ctx.client.sendRequest(CodeActionResolveRequest.method, params)) as CodeAction;
    if (!item?.edit) return;

    const wsEditWithoutTextEdits: WorkspaceEdit = {
      documentChanges: item.edit.documentChanges?.filter((change) => 'kind' in change),
    };
    await workspace.applyEdit(wsEditWithoutTextEdits);
    await applySnippetWorkspaceEdit(item.edit);
  };
}

export function openDocs(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };
    const doclink = await ctx.client.sendRequest(ra.openDocs, param);
    if (doclink) {
      if (doclink.local) {
        const exist = existsSync(Uri.parse(doclink.local).fsPath);
        if (exist) {
          await nvim.call('coc#ui#open_url', doclink.local);
          return;
        }
      }
      if (doclink.web) {
        await commands.executeCommand('vscode.open', Uri.parse(doclink.web));
      }
    }
  };
}

export function openCargoToml(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const location = await ctx.client.sendRequest(ra.openCargoToml, {
      textDocument: { uri: document.uri },
    });
    if (!location) return;

    await workspace.jumpTo(location.uri);
  };
}

function viewXir(ctx: Ctx, xir: 'HIR' | 'MIR'): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };
    const req = xir === 'HIR' ? ra.viewHir : ra.viewMir;
    const ret = await ctx.client.sendRequest(req, param);
    if (!ret) return;
    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command(`edit +setl\\ buftype=nofile [${xir}]`, true);
    nvim.command('setl nobuflisted bufhidden=wipe', true);
    nvim.call('append', [0, ret.split('\n')], true);
    nvim.command('exe 1', true);
    await nvim.resumeNotification(true);
  };
}

export function viewHir(ctx: Ctx): Cmd {
  return viewXir(ctx, 'HIR');
}

export function viewMir(ctx: Ctx): Cmd {
  return viewXir(ctx, 'MIR');
}

export function interpretFunction(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };
    const ret = await ctx.client.sendRequest(ra.interpretFunction, param);
    if (!ret) return;
    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command('edit +setl\\ buftype=nofile [interpretFunction]', true);
    nvim.command('setl nobuflisted bufhidden=wipe', true);
    nvim.call('append', [0, ret.split('\n')], true);
    nvim.command('exe 1', true);
    await nvim.resumeNotification(true);
  };
}

export function viewFileText(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const ret = await ctx.client.sendRequest(ra.viewFileText, { uri: document.uri });
    if (!ret) return;

    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command('edit +setl\\ buftype=nofile [TEXT]', true);
    nvim.command('setl nobuflisted bufhidden=wipe', true);
    nvim.call('append', [0, ret.split('\n')], true);
    nvim.command('exe 1', true);
    await nvim.resumeNotification(true);
  };
}

export function echoRunCommandLine(ctx: Ctx) {
  return async () => {
    const runnable = await pickRunnable(ctx);
    if (!runnable) return;

    let args: string[] = [];
    if (runnable.kind === 'cargo') {
      // TODO: runnable.args.overrideCargo?
      args = [...runnable.args.cargoArgs];
      if (runnable.args.executableArgs.length > 0) {
        runnable.args['executableArgs'][0] = `'${runnable.args['executableArgs'][0]}'`;
        args.push('--', ...runnable.args.executableArgs);
      }
    } else {
      args = [...runnable.args.args];
    }
    const commandLine = ['cargo', ...args].join(' ');
    window.echoLines([commandLine]);
  };
}

export function peekTests(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const tests = await ctx.client.sendRequest(ra.relatedTests, {
      textDocument: { uri: document.uri },
      position,
    });
    const locations: Location[] = tests.map((it) =>
      Location.create(it.runnable.location!.targetUri, it.runnable.location!.targetSelectionRange),
    );
    await commands.executeCommand('editor.action.showReferences', Uri.parse(document.uri), position, locations);
  };
}

function moveItem(ctx: Ctx, direction: ra.Direction): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    let range: Range | null = null;
    const mode = (await workspace.nvim.call('visualmode')) as string;
    if (mode) range = await window.getSelectedRange(mode);
    if (!range) range = Range.create(position, position);
    const params: ra.MoveItemParams = {
      direction,
      textDocument: { uri: document.uri },
      range,
    };
    const edits = await ctx.client.sendRequest(ra.moveItem, params);
    if (!edits?.length) return;

    const wsEdit: WorkspaceEdit = {
      documentChanges: [{ textDocument: { uri: document.uri, version: document.version }, edits }],
    };
    await applySnippetWorkspaceEdit(wsEdit);
  };
}

export function moveItemUp(ctx: Ctx): Cmd {
  return moveItem(ctx, 'Up');
}

export function moveItemDown(ctx: Ctx): Cmd {
  return moveItem(ctx, 'Down');
}

function crateGraph(ctx: Ctx, full: boolean): Cmd {
  return async () => {
    const dot = await ctx.client.sendRequest(ra.viewCrateGraph, { full });
    const html = `
<!DOCTYPE html>
<meta charset="utf-8">
<head>
  <style>
    html, body { margin:0; padding:0; overflow:hidden }
    svg { position:fixed; top:0; left:0; height:100%; width:100% }
  </style>
</head>
<body>
  <div id="graph"></div>
  <script type="javascript/worker" src="https://cdn.jsdelivr.net/npm/@hpcc-js/wasm@1.11.0/dist/index.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3@7.0.1/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-array@3.0.2/dist/d3-array.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-axis@3.0.0/dist/d3-axis.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-brush@3.0.0/dist/d3-brush.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-chord@3.0.1/dist/d3-chord.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-color@3.0.1/dist/d3-color.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-contour@3.0.1/dist/d3-contour.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-delaunay@6.0.2/dist/d3-delaunay.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-dispatch@3.0.1/dist/d3-dispatch.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-drag@3.0.0/dist/d3-drag.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-dsv@3.0.1/dist/d3-dsv.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-ease@3.0.1/dist/d3-ease.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-fetch@3.0.1/dist/d3-fetch.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-force@3.0.0/dist/d3-force.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-format@3.0.1/dist/d3-format.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-geo@3.0.1/dist/d3-geo.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-hierarchy@3.0.1/dist/d3-hierarchy.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-interpolate@3.0.1/dist/d3-interpolate.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-path@3.0.1/dist/d3-path.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-polygon@3.0.1/dist/d3-polygon.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-quadtree@3.0.1/dist/d3-quadtree.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-random@3.0.1/dist/d3-random.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-scale@4.0.0/dist/d3-scale.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-scale-chromatic@3.0.0/dist/d3-scale-chromatic.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-selection@3.0.0/dist/d3-selection.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-shape@3.0.1/dist/d3-shape.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-time@3.0.0/dist/d3-time.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-time-format@4.0.0/dist/d3-time-format.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-timer@3.0.1/dist/d3-timer.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-transition@3.0.1/dist/d3-transition.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-zoom@3.0.0/dist/d3-zoom.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/d3-graphviz@4.0.0/build/d3-graphviz.min.js"></script>
  <script>
   let graph = d3.select("#graph")
     .graphviz()
     .fit(true)
     .zoomScaleExtent([0.1, Infinity])
     .renderDot(\`${dot}\`);
   d3.select(window).on("click", (event) => {
     if (event.ctrlKey) {
       graph.resetZoom(d3.transition().duration(100));
     }
   });
  </script>
</body>
</html>
`;

    const tempFile = join(tmpdir(), `${randomBytes(5).toString('hex')}.html`);
    writeFileSync(tempFile, html, { encoding: 'utf-8' });
    window.showMessage(`Crate Graph: ${tempFile}`);
    await workspace.nvim.call('coc#ui#open_url', [tempFile]);
  };
}

export function viewCrateGraph(ctx: Ctx): Cmd {
  return crateGraph(ctx, false);
}

export function viewFullCrateGraph(ctx: Ctx): Cmd {
  return crateGraph(ctx, true);
}

export function shuffleCrateGraph(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    await ctx.client.sendRequest(ra.shuffleCrateGraph);
  };
}

export function viewItemTree(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const param: ra.ViewItemTreeParams = {
      textDocument: { uri: document.uri },
    };
    const ret = await ctx.client.sendRequest(ra.viewItemTree, param);
    if (!ret) return;
    const nvim = workspace.nvim;
    nvim.pauseNotification();
    nvim.command('edit +setl\\ buftype=nofile [ItemTree]', true);
    nvim.command('setl nobuflisted bufhidden=wipe', true);
    nvim.call('append', [0, ret.split('\n')], true);
    nvim.command('exe 1', true);
    await nvim.resumeNotification(true);
  };
}

export function rebuildProcMacros(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    await ctx.client.sendRequest(ra.rebuildProcMacros);
  };
}
