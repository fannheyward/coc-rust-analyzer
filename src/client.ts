import { Executable, LanguageClient, LanguageClientOptions, ServerOptions, StaticFeature, Uri, workspace } from 'coc.nvim';
import { ClientCapabilities, CodeAction, CodeActionParams, CodeActionRequest, Command, InsertTextFormat, TextDocumentEdit } from 'vscode-languageserver-protocol';

class SnippetTextEditFeature implements StaticFeature {
  fillClientCapabilities(capabilities: ClientCapabilities): void {
    const caps: any = capabilities.experimental ?? {};
    caps.snippetTextEdit = true;
    capabilities.experimental = caps;
  }
  initialize(): void {}
}

function isSnippetEdit(action: CodeAction): boolean {
  const documentChanges = action.edit?.documentChanges ?? [];
  for (const edit of documentChanges) {
    if (TextDocumentEdit.is(edit)) {
      if (edit.edits.some((indel) => (indel as any).insertTextFormat === InsertTextFormat.Snippet)) {
        return true;
      }
    }
  }
  return false;
}

export function createClient(bin: string): LanguageClient {
  let folder = '.';
  if (workspace.workspaceFolder?.uri.length > 0) {
    folder = Uri.parse(workspace.workspaceFolder.uri).fsPath;
  }

  const run: Executable = {
    command: bin,
    options: { cwd: folder },
  };

  const serverOptions: ServerOptions = run;
  const outputChannel = workspace.createOutputChannel('Rust Analyzer Language Server Trace');
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'rust' }, { pattern: 'Cargo.toml' }],
    initializationOptions: workspace.getConfiguration('rust-analyzer'),
    middleware: {
      provideSignatureHelp: async (document, position, token, next) => {
        const character = position.character;
        position.character = character + 1;
        const help = await next(document, position, token);
        position.character = character - 1;
        return help;
      },
      provideCodeActions(document, range, context, token) {
        const params: CodeActionParams = {
          textDocument: { uri: document.uri },
          range,
          context,
        };
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return client.sendRequest(CodeActionRequest.type, params, token).then((values) => {
          if (values === null) return undefined;
          const result: (CodeAction | Command)[] = [];
          for (const item of values) {
            if (CodeAction.is(item) && isSnippetEdit(item)) {
              item.command = Command.create('', 'rust-analyzer.applySnippetWorkspaceEdit', item.edit);
              item.edit = undefined;
            }
            result.push(item);
          }
          return result;
        });
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
  client.registerProposedFeatures();
  client.registerFeature(new SnippetTextEditFeature());

  return client;
}
