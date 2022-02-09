import { CodeActionKind, Command, Executable, LanguageClient, LanguageClientOptions, Position, Range, ServerOptions, StaticFeature, Uri, window, workspace } from 'coc.nvim';
import { existsSync } from 'fs';
import { join } from 'path';
import { CodeAction, CodeActionParams, CodeActionRequest } from 'vscode-languageserver-protocol';
import { Env } from './config';
import { isRustDocument } from './ctx';
import * as ra from './lsp_ext';

class ExperimentalFeatures implements StaticFeature {
  fillClientCapabilities(capabilities: any): void {
    const caps: any = capabilities.experimental ?? {};
    caps.snippetTextEdit = true;
    caps.resolveCodeAction = true;
    caps.serverStatusNotification = true;
    caps.commands = {
      commands: [
        'rust-analyzer.runSingle',
        'rust-analyzer.debugSingle',
        'rust-analyzer.showReferences',
        'rust-analyzer.gotoLocation',
        'editor.action.triggerParameterHints'],
    };
    capabilities.experimental = caps;
  }
  initialize(): void {}
  dispose(): void {}
}

function isCodeActionWithoutEditsAndCommands(value: any): boolean {
  const candidate: CodeAction = value;
  return (
    candidate &&
    (candidate.diagnostics === void 0 || Array.isArray(candidate.diagnostics)) &&
    (candidate.kind === void 0 || typeof candidate.kind === 'string') &&
    candidate.edit === void 0 &&
    candidate.command === void 0
  );
}

export function createClient(bin: string, extra: Env): LanguageClient {
  let folder = '.';
  if (workspace.workspaceFolders.length) {
    folder = Uri.parse(workspace.workspaceFolders[0].uri).fsPath;
  }

  const env = Object.assign(Object.assign({}, process.env), extra);
  const run: Executable = {
    command: bin,
    options: { env, cwd: folder },
  };

  function standalone(root?: string) {
    if (!root) return true;
    if (existsSync(join(Uri.parse(root).fsPath, 'Cargo.toml'))) return false;
    if (existsSync(join(Uri.parse(root).fsPath, 'rust-project.json'))) return false;
    return true;
  }
  let initializationOptions = workspace.getConfiguration('rust-analyzer');
  if (workspace.workspaceFolders.length && standalone(workspace.workspaceFolders[0].uri)) {
    const docs = workspace.documents.filter((doc) => isRustDocument(doc.textDocument));
    if (docs.length) {
      initializationOptions = { detachedFiles: docs.map((doc) => Uri.parse(doc.uri).fsPath), ...initializationOptions };
    }
  }

  const serverOptions: ServerOptions = run;
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'rust' }],
    initializationOptions,
    middleware: {
      async provideHover(document, position, token) {
        let positionOrRange: Range | Position | null = null;
        const mode = (await workspace.nvim.call('mode')) as string;
        if (mode === 'v' || mode === 'V') {
          await workspace.nvim.call('eval', 'feedkeys("\\<esc>", "in")');
          positionOrRange = await window.getSelectedRange(mode);
        }
        if (!positionOrRange) positionOrRange = position;
        const param: ra.HoverParams = {
          position: positionOrRange || position,
          textDocument: { uri: document.uri },
        };
        return await client.sendRequest(ra.hover, param, token);
      },
      async resolveCompletionItem(item, token, next) {
        if (item.data && !item.data.position) {
          // TODO: remove this if coc undefined item.data
          // coc will set item.data to {} if undefined
          // but RA will check item.data.position to resolve
          // this hacks to delete item.data
          delete item.data;
        }
        return await next(item, token);
      },
      async provideCodeActions(document, range, context, token) {
        const params: CodeActionParams = {
          textDocument: { uri: document.uri },
          range,
          context,
        };
        const values = await client.sendRequest(CodeActionRequest.type.method, params, token);
        if (values === null) return undefined;
        const result: (CodeAction | Command)[] = [];
        for (const item of values as (Command | CodeAction)[]) {
          if (CodeAction.is(item)) {
            result.push(item);
            continue;
          }

          if (!isCodeActionWithoutEditsAndCommands(item)) {
            console.error('isCodeActionWithoutEditsAndCommands:', JSON.stringify(item));
            continue;
          }

          const command: Command = {
            command: 'rust-analyzer.resolveCodeAction',
            title: item.title,
            arguments: [item],
          };
          const kind: CodeActionKind = (item as any).kind;
          result.push(CodeAction.create(item.title, command, kind));
        }
        return result;
      },
    },
  };

  const client = new LanguageClient('rust-analyzer', 'Rust Analyzer Language Server', serverOptions, clientOptions);
  // HACK: This is an awful way of filtering out the decorations notifications
  // However, pending proper support, this is the most effecitve approach
  // Proper support for this would entail a change to vscode-languageclient to allow not notifying on certain messages
  // Or the ability to disable the serverside component of highlighting (but this means that to do tracing we need to disable hihlighting)
  // This also requires considering our settings strategy, which is work which needs doing
  // @ts-ignore The tracer is private to vscode-languageclient, but we need access to it to not log publishDecorations requests
  client._tracer = {
    log: (messageOrDataObject: string | unknown, data?: string) => {
      if (typeof messageOrDataObject === 'string') {
        if (messageOrDataObject.includes('rust-analyzer/publishDecorations') || messageOrDataObject.includes('rust-analyzer/decorationsRequest')) {
          // Don't log publish decorations requests
        } else {
          // @ts-ignore This is just a utility function
          client.logTrace(messageOrDataObject, data);
        }
      } else {
        // @ts-ignore
        client.logObjectTrace(messageOrDataObject);
      }
    },
  };
  client.registerFeature(new ExperimentalFeatures());

  return client;
}
