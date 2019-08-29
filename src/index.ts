import { commands, CompleteResult, Disposable, ExtensionContext, sources, workspace } from 'coc.nvim';
import * as cmds from './cmds';
import { Server } from './server';

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.showMessage(`coc-rust-analyzer is works!`);
  function disposeOnDeactivation(disposable: Disposable) {
    context.subscriptions.push(disposable);
  }

  function registerCommand(name: string, f: any) {
    disposeOnDeactivation(commands.registerCommand(name, f));
  }

  // Commands are requests from vscode to the language server
  registerCommand('rust-analyzer.analyzerStatus', cmds.analyzerStatus.makeCommand(context));
  // registerCommand('rust-analyzer.matchingBrace', cmds.matchingBrace.handle);
  // registerCommand('rust-analyzer.joinLines', cmds.joinLines.handle);
  // registerCommand('rust-analyzer.parentModule', cmds.parentModule.handle);
  // registerCommand('rust-analyzer.run', cmds.runnables.handle);
  // Unlike the above this does not send requests to the language server
  // registerCommand('rust-analyzer.runSingle', cmds.runnables.handleSingle);
  registerCommand('rust-analyzer.collectGarbage', () => Server.client.sendRequest<null>('rust-analyzer/collectGarbage', null));
  // TODO
  // registerCommand('rust-analyzer.applySourceChange', cmds.applySourceChange.handle);
  // TODO
  // registerCommand('rust-analyzer.showReferences', (uri: string, position: Position, locations: Location[]) => {
  //   commands.executeCommand(
  //     'editor.action.showReferences',
  //     Uri.parse(uri),
  //     Server.client.protocol2CodeConverter.asPosition(position),
  //     locations.map(Server.client.protocol2CodeConverter.asLocation)
  //   );
  // });

  context.subscriptions.push(
    commands.registerCommand('coc-rust-analyzer.Command', async () => {
      workspace.showMessage(`coc-rust-analyzer Commands works!`);
    }),

    sources.createSource({
      name: 'coc-rust-analyzer completion source', // unique id
      shortcut: '[CS]', // [CS] is custom source
      priority: 1,
      triggerPatterns: [], // RegExp pattern
      doComplete: async () => {
        const items = await getItems();
        return items;
      }
    })
  );
}

async function getItems(): Promise<CompleteResult> {
  return {
    items: [
      {
        word: 'TestCompletionItem 1'
      },
      {
        word: 'TestCompletionItem 2'
      }
    ]
  };
}
