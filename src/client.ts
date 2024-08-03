import {
  type CodeActionKind,
  type Command,
  type Executable,
  LanguageClient,
  type LanguageClientOptions,
  type Position,
  type Range,
  type ServerOptions,
  type StaticFeature,
  Uri,
  window,
  workspace,
} from 'coc.nvim';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CodeAction, type CodeActionParams, CodeActionRequest } from 'vscode-languageserver-protocol';
import type { Config } from './config';
import { isRustDocument } from './ctx';
import * as ra from './lsp_ext';

class ExperimentalFeatures implements StaticFeature {
  fillClientCapabilities(capabilities: any): void {
    const caps: any = capabilities.experimental ?? {};
    caps.snippetTextEdit = true;
    caps.serverStatusNotification = true;
    caps.localDocs = true;
    caps.commands = {
      commands: [
        'rust-analyzer.runSingle',
        'rust-analyzer.debugSingle',
        'rust-analyzer.showReferences',
        'rust-analyzer.gotoLocation',
        'editor.action.triggerParameterHints',
      ],
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

export function createClient(bin: string, config: Config): LanguageClient {
  let folder = '.';
  if (workspace.workspaceFolders.length) {
    folder = Uri.parse(workspace.workspaceFolders[0].uri).fsPath;
  }

  const env = Object.assign(Object.assign({}, process.env), config.serverExtraEnv);
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
  if (workspace.workspaceFolders.every((folder) => standalone(folder.uri))) {
    const docs = workspace.documents.filter((doc) => isRustDocument(doc.textDocument));
    if (docs.length) {
      initializationOptions = { detachedFiles: docs.map((doc) => Uri.parse(doc.uri).fsPath), ...initializationOptions };
    }
  }

  const disabledFeatures: string[] = [];
  if (config.disableProgressNotifications) {
    disabledFeatures.push('progress');
  }
  if (!config.inlayHint.enable) {
    disabledFeatures.push('inlayHint');
  }
  const serverOptions: ServerOptions = run;
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'rust' }],
    initializationOptions,
    disabledFeatures,
    progressOnInitialization: !config.disableProgressNotifications,
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
          const action = CodeAction.create(item.title, command, kind);
          action.edit = {};
          result.push(action);
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
    log: (msg: string | unknown, data?: string) => {
      if (typeof msg === 'string') {
        if (msg.includes('rust-analyzer/publishDecorations') || msg.includes('rust-analyzer/decorationsRequest')) {
          // Don't log publish decorations requests
        } else {
          // @ts-ignore This is just a utility function
          client.logTrace(msg, data);
        }
      } else {
        // @ts-ignore
        client.logObjectTrace(msg);
      }
    },
  };
  client.registerFeature(new ExperimentalFeatures());

  return client;
}
