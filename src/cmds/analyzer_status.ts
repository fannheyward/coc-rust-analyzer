import { ExtensionContext, TextDocumentContentProvider, workspace } from 'coc.nvim';
import { Server } from '../server';

// const statusUri = Uri.parse('rust-analyzer-status://status');

// TODO
// export class RATextDocumentContentProvider implements TextDocumentContentProvider {
//   public eventEmitter = new EventEmitter();
//   public syntaxTree: string = 'Not available';

//   public provideTextDocumentContent(uri: Uri): ProviderResult<string> {
//     const editor = vscode.window.activeTextEditor;
//     if (editor == null) {
//       return '';
//     }
//     return Server.client.sendRequest<string>('rust-analyzer/analyzerStatus', null);
//   }

//   get onDidChange(): Event<Uri> {
//     return this.eventEmitter.event;
//   }
// }

let poller: NodeJS.Timer | null = null;

// Shows status of rust-analyzer (for debugging)

export function makeCommand(context: ExtensionContext) {
  // const textDocumentContentProvider = new RATextDocumentContentProvider();
  const textDocumentContentProvider: TextDocumentContentProvider = {
    onDidChange: undefined,
    provideTextDocumentContent: async () => {
      return Server.client.sendRequest<string>('rust-analyzer/analyzerStatus', null);
    }
  };
  context.subscriptions.push(workspace.registerTextDocumentContentProvider('rust-analyzer-status', textDocumentContentProvider));

  context.subscriptions.push({
    dispose() {
      if (poller != null) {
        clearInterval(poller);
      }
    }
  });

  // TODO
  // return async function handle() {
  //   if (poller == null) {
  //     poller = setInterval(() => textDocumentContentProvider.eventEmitter.fire(statusUri), 1000);
  //   }
  //   const document = await vscode.workspace.openTextDocument(statusUri);
  //   return vscode.window.showTextDocument(document, vscode.ViewColumn.Two, true);
  // };
}
