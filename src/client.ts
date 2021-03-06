import { CodeActionKind, Command, Executable, LanguageClient, LanguageClientOptions, ServerOptions, StaticFeature, Uri, workspace } from 'coc.nvim';
import { CodeAction, CodeActionParams, CodeActionRequest } from 'vscode-languageserver-protocol';
import { Env } from './config';
import { isRustDocument } from './ctx';

class ExperimentalFeatures implements StaticFeature {
  fillClientCapabilities(capabilities: any): void {
    // TODO: remove completionCaps/codeActionCaps after coc supports LSP 3.16
    const completionCaps = capabilities.textDocument.completion;
    completionCaps.completionItem.resolveSupport = {
      properties: ['documentation', 'detail', 'additionalTextEdits'],
    };
    const codeActionCaps = capabilities.textDocument.codeAction;
    codeActionCaps.resolveSupport = {
      properties: ['edit'],
    };

    const caps: any = capabilities.experimental ?? {};
    caps.snippetTextEdit = true;
    caps.resolveCodeAction = true;
    caps.serverStatusNotification = true;
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
  if (workspace.workspaceFolder?.uri.length) {
    folder = Uri.parse(workspace.workspaceFolder.uri).fsPath;
  }

  const env = Object.assign(Object.assign({}, process.env), extra);
  const run: Executable = {
    command: bin,
    options: { env, cwd: folder },
  };

  let initializationOptions = workspace.getConfiguration('rust-analyzer');
  if (workspace.workspaceFolders.length === 0) {
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
        // TODO
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
