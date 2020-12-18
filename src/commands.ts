import { spawnSync, spawn } from 'child_process';
import readline from 'readline';
import { commands, Documentation, FloatFactory, Terminal, TerminalOptions, Uri, workspace } from 'coc.nvim';
import { Location, LocationLink, Position, Range, TextDocumentEdit, TextDocumentPositionParams, TextEdit, WorkspaceEdit } from 'vscode-languageserver-protocol';
import { Cmd, Ctx, isRustDocument } from './ctx';
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
  result += '// ' + '='.repeat(result.length - 3);
  result += '\n\n';
  result += expanded.expansion;

  return result;
}

function parseSnippet(snip: string): [string, [number, number]] | undefined {
  const m = snip.match(/\$(0|\{0:([^}]*)\})/);
  if (!m) return undefined;
  const placeholder = m[2] ?? '';
  const range: [number, number] = [m.index!, placeholder.length];
  const insert = snip.replace(m[0], placeholder);
  return [insert, range];
}

function countLines(text: string): number {
  return (text.match(/\n/g) || []).length;
}

export function analyzerStatus(ctx: Ctx): Cmd {
  return async () => {
    const { document } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;
    const params: ra.AnalyzerStatusParams = {
      textDocument: { uri: document.uri },
    };
    const ret = await ctx.client.sendRequest(ra.analyzerStatus, params);
    workspace.echoLines(ret.split('\n'));
  };
}

export function memoryUsage(ctx: Ctx): Cmd {
  return async () => {
    const ret = await ctx.client.sendRequest(ra.memoryUsage);
    workspace.echoLines(ret.split('\n'));
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

    const mode = await workspace.nvim.call('visualmode');
    const range = await workspace.getSelectedRange(mode, doc);
    if (!range) {
      return;
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
    if (!isRustDocument(document)) return;

    const param: TextDocumentPositionParams = {
      textDocument: { uri: document.uri },
      position,
    };

    const response = await ctx.client.sendRequest(ra.parentModule, param);
    if (!response) return;

    let uri = '';
    let pos: Position | undefined = undefined;
    if (Array.isArray(response)) {
      const location = response[0];
      if (Location.is(location)) {
        uri = location.uri;
        pos = location.range?.start;
      } else if (LocationLink.is(location)) {
        uri = location.targetUri;
        pos = location.targetSelectionRange?.start;
      }
    } else if (Location.is(response)) {
      uri = response.uri;
      pos = response.range.start;
    }
    if (uri) {
      workspace.jumpTo(uri, pos);
    }
  };
}

export function ssr(ctx: Ctx): Cmd {
  return async () => {
    const input = await workspace.callAsync<string>('input', ['Enter request like this: foo($a, $b) ==>> ($a).foo($b): ']);
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
      const doc = await workspace.document;
      const range = await workspace.getSelectedRange(mode, doc);
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

    const edit = await ctx.client.sendRequest(ra.ssr, param);
    await workspace.applyEdit(edit);
  };
}

export function serverVersion(ctx: Ctx): Cmd {
  return async () => {
    const bin = ctx.resolveBin();
    if (!bin) {
      const msg = `Rust Analyzer is not found`;
      workspace.showMessage(msg, 'error');
      return;
    }

    const version = spawnSync(bin, ['--version'], { encoding: 'utf-8' }).stdout;
    workspace.showMessage(version);
  };
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
    const cmd = `${runnable.kind} ${runnable.args.cargoArgs.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.args.workspaceRoot,
    };
    if (terminal) {
      terminal.dispose();
      terminal = undefined;
    }
    terminal = await workspace.createTerminal(opt);
    terminal.sendText(cmd);
    if (ctx.config.terminal.startinsert) {
      await workspace.nvim.command('startinsert');
    }
  };
}

export function debugSingle(): Cmd {
  return async (runnable: ra.Runnable) => {
    const { document } = await workspace.getCurrentState();
    if (!runnable || !isRustDocument(document)) return;

    const args = [...runnable.args.cargoArgs];
    if (runnable.args.cargoExtraArgs.length > 0) {
      args.push(...runnable.args.cargoExtraArgs);
    }

    // do not run tests, we will run through gdb
    if (args[0] === 'test') {
      args.push('--no-run');
    }

    // output as json
    args.push('--message-format=json');
    // remove noise
    args.push('-q');

    if (runnable.args.executableArgs.length > 0) {
      args.push('--', ...runnable.args.executableArgs);
    }

    if (args[0] === 'run') {
      args[0] = 'build';
    }

    console.debug(`${runnable.kind} ${args}`);

    const proc = spawn(runnable.kind, args, { shell: true });

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

      if (!executable && cargoMessage['executable']) {
        executable = cargoMessage['executable'];
      }
    }

    if (!executable) {
      throw new Error('Could not find executable');
    }

    const executableArgs = runnable.args.executableArgs.join(' ');

    console.info(`Debugging executable: ${executable} ${executableArgs}`);

    const debugConfig = workspace.getConfiguration('rust-analyzer.debug');

    if (debugConfig.get<string>('runtime') == 'termdebug') {
      await workspace.nvim.command(`TermdebugCommand ${executable} ${executableArgs}`);
      return;
    }

    if (debugConfig.get<string>('runtime') == 'vimspector') {
      const name = workspace.getConfiguration('rust-analyzer.debug.vimspector.configuration').get<string>('name');
      const configuration = { configuration: name, Executable: executable, Args: executableArgs };
      await workspace.nvim.call('vimspector#LaunchWithSettings', configuration);
      return;
    }

    throw new Error(`Invalid debug runtime: ${debugConfig.get<string>('runtime')}`);
  };
}

export function runSingle(ctx: Ctx): Cmd {
  return async (runnable: ra.Runnable) => {
    const { document } = await workspace.getCurrentState();
    if (!runnable || !isRustDocument(document)) return;

    const args = [...runnable.args.cargoArgs];
    if (runnable.args.cargoExtraArgs.length > 0) {
      args.push(...runnable.args.cargoExtraArgs);
    }
    if (runnable.args.executableArgs.length > 0) {
      args.push('--', ...runnable.args.executableArgs);
    }
    const cmd = `${runnable.kind} ${args.join(' ')}`;
    const opt: TerminalOptions = {
      name: runnable.label,
      cwd: runnable.args.workspaceRoot,
    };
    if (terminal) {
      terminal.dispose();
      terminal = undefined;
    }
    terminal = await workspace.createTerminal(opt);
    terminal.sendText(cmd);
    if (ctx.config.terminal.startinsert) {
      await workspace.nvim.command('startinsert');
    }
  };
}

export function syntaxTree(ctx: Ctx): Cmd {
  return async () => {
    const doc = await workspace.document;
    if (!isRustDocument(doc.textDocument)) return;

    const mode = await workspace.nvim.call('visualmode');
    let range: Range | null = null;
    if (mode) {
      range = await workspace.getSelectedRange(mode, doc);
    }
    const param: ra.SyntaxTreeParams = {
      textDocument: { uri: doc.uri },
      range,
    };

    const ret = await ctx.client.sendRequest(ra.syntaxTree, param);
    await workspace.nvim.command('tabnew').then(async () => {
      const buf = await workspace.nvim.buffer;
      buf.setLines(ret.split('\n'), { start: 0, end: -1 });
    });
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
    if (!expanded) {
      return;
    }

    await workspace.nvim.command('tabnew').then(async () => {
      const buf = await workspace.nvim.buffer;
      buf.setLines(codeFormat(expanded).split('\n'), { start: 0, end: -1 });
    });
  };
}

export function explainError(ctx: Ctx): Cmd {
  return async () => {
    const { document, position } = await workspace.getCurrentState();
    if (!isRustDocument(document)) return;

    const diagnostic = ctx.client.diagnostics?.get(workspace.uri)?.find((diagnostic) => isInRange(diagnostic.range, position));

    if (diagnostic?.code) {
      const explaination = spawnSync('rustc', ['--explain', `${diagnostic.code}`], { encoding: 'utf-8' }).stdout;

      const docs: Documentation[] = [];
      let isCode = false;
      for (const part of explaination.split('```\n')) {
        docs.push({ content: part, filetype: isCode ? 'rust' : 'markdown' });
        isCode = !isCode;
      }

      const factory: FloatFactory = new FloatFactory(workspace.nvim, workspace.env);
      await factory.create(docs);
    }
  };
}

export function reloadWorkspace(ctx: Ctx): Cmd {
  return async () => {
    await ctx.client.sendRequest(ra.reloadWorkspace);
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

export function upgrade(ctx: Ctx) {
  return async () => {
    await ctx.checkUpdate(false);
  };
}

export function toggleInlayHints(ctx: Ctx) {
  return async () => {
    if (!ctx.config.inlayHints.chainingHints) {
      workspace.showMessage(`Inlay hints for method chains is disabled. Toggle action does nothing;`, 'warning');
      return;
    }
    await ctx.toggleInlayHints();
  };
}

export async function applySnippetWorkspaceEdit(edit: WorkspaceEdit) {
  if (!edit?.documentChanges?.length) {
    return;
  }

  let selection: Range | undefined = undefined;
  let position: Position | undefined = undefined;
  let lineDelta = 0;
  const change = edit.documentChanges[0];
  if (TextDocumentEdit.is(change)) {
    const newEdits: TextEdit[] = [];

    for (const indel of change.edits) {
      let { newText } = indel;
      const parsed = parseSnippet(indel.newText);
      if (parsed) {
        const [insert, [placeholderStart, placeholderLength]] = parsed;
        const prefix = insert.substr(0, placeholderStart);
        const lastNewline = prefix.lastIndexOf('\n');

        const startLine = indel.range.start.line + lineDelta + countLines(prefix);
        const startColumn = lastNewline === -1 ? indel.range.start.character + placeholderStart : prefix.length - lastNewline - 1;
        if (placeholderLength) {
          selection = Range.create(startLine, startColumn, startLine, startColumn + placeholderLength);
        } else {
          position = Position.create(startLine, startColumn);
        }

        newText = insert;
      } else {
        lineDelta = countLines(indel.newText) - (indel.range.end.line - indel.range.start.line);
      }

      newEdits.push(TextEdit.replace(indel.range, newText));
    }

    const wsEdit: WorkspaceEdit = {
      changes: {
        [change.textDocument.uri]: newEdits,
      },
    };
    await workspace.applyEdit(wsEdit);

    const current = await workspace.document;
    if (current.uri !== change.textDocument.uri) {
      await workspace.loadFile(change.textDocument.uri);
      await workspace.jumpTo(change.textDocument.uri);
    }

    if (selection) {
      await workspace.selectRange(selection);
    } else if (position) {
      await workspace.moveTo(position);
    }
  }
}

export function applySnippetWorkspaceEditCommand(): Cmd {
  return async (edit: WorkspaceEdit) => {
    await applySnippetWorkspaceEdit(edit);
  };
}

export function resolveCodeAction(ctx: Ctx): Cmd {
  return async (params: ra.ResolveCodeActionParams) => {
    const edit: WorkspaceEdit = await ctx.client.sendRequest(ra.resolveCodeAction, params);
    if (!edit) return;
    await applySnippetWorkspaceEdit(edit);
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
      await commands.executeCommand('vscode.open', Uri.parse(doclink));
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
