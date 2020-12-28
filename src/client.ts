import { Executable, LanguageClient, LanguageClientOptions, ServerOptions, StaticFeature, Uri, window, workspace } from 'coc.nvim';
import { ClientCapabilities, CodeAction, CodeActionParams, CodeActionRequest, Command, InsertTextFormat, TextDocumentEdit } from 'vscode-languageserver-protocol';
import * as ra from './lsp_ext';

class ExperimentalFeatures implements StaticFeature {
  fillClientCapabilities(capabilities: ClientCapabilities): void {
    const caps: any = capabilities.experimental ?? {};
    caps.snippetTextEdit = true;
    caps.resolveCodeAction = true;
    caps.statusNotification = true;
    capabilities.experimental = caps;
    // TODO: remove follows after coc supports 3.16
    // @ts-ignore
    capabilities.workspace?.workspaceEdit?.normalizesLineEndings = true;
    // @ts-ignore
    capabilities.workspace?.workspaceEdit?.changeAnnotationSupport = {
      groupsOnLabel: true,
    };
    // @ts-ignore
    capabilities.textDocument?.rename?.prepareSupportDefaultBehavior = 1;
  }
  initialize(): void {}
  dispose(): void {}
}

function isSnippetEdit(action: CodeAction): boolean {
  for (const edit of action.edit?.documentChanges ?? []) {
    if (TextDocumentEdit.is(edit)) {
      if (edit.edits.some((indel) => (indel as any).insertTextFormat === InsertTextFormat.Snippet)) {
        return true;
      }
    }
  }
  return false;
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

export function createClient(bin: string): LanguageClient {
  let folder = '.';
  if (workspace.workspaceFolder?.uri.length) {
    folder = Uri.parse(workspace.workspaceFolder.uri).fsPath;
  }

  const run: Executable = {
    command: bin,
    options: { cwd: folder },
  };

  const serverOptions: ServerOptions = run;
  const outputChannel = window.createOutputChannel('Rust Analyzer Language Server Trace');
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'rust' }, { pattern: 'Cargo.toml' }],
    initializationOptions: workspace.getConfiguration('rust-analyzer'),
    middleware: {
      async provideCodeActions(document, range, context, token) {
        const params: CodeActionParams = {
          textDocument: { uri: document.uri },
          range,
          context,
        };
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const values = await client.sendRequest(CodeActionRequest.type, params, token);
        if (values === null) return undefined;
        const result: (CodeAction | Command)[] = [];
        for (const item of values) {
          // In our case we expect to get code edits only from diagnostics
          if (CodeAction.is(item)) {
            if (isSnippetEdit(item)) {
              item.command = {
                command: 'rust-analyzer.applySnippetWorkspaceEdit',
                title: item.title,
                arguments: [item.edit],
              };
              item.edit = undefined;
            }
            result.push(item);
            continue;
          }

          if (!isCodeActionWithoutEditsAndCommands(item)) {
            console.error('isCodeActionWithoutEditsAndCommands:', JSON.stringify(item));
            continue;
          }

          const resolveParams: ra.ResolveCodeActionParams = {
            id: (item as any).id,
            codeActionParams: params,
          };
          const command: Command = {
            command: 'rust-analyzer.resolveCodeAction',
            title: item.title,
            arguments: [resolveParams],
          };
          result.push(CodeAction.create(item.title, command));
        }
        return result;
      },
    },
    outputChannel,
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
