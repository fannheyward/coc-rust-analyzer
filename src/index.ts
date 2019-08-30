import { commands, Disposable, ExtensionContext, workspace } from 'coc.nvim';
import { GenericNotificationHandler } from 'vscode-languageserver-protocol';
import * as cmds from './cmds';
import * as notifications from './notifications';
import { Server } from './server';

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.showMessage(`coc-rust-analyzer is works!`);
  function disposeOnDeactivation(disposable: Disposable) {
    context.subscriptions.push(disposable);
  }

  function registerCommand(name: string, f: any) {
    disposeOnDeactivation(commands.registerCommand(name, f));
  }

  // Notifications are events triggered by the language server
  const allNotifications: Iterable<[string, GenericNotificationHandler]> = [['rust-analyzer/publishDecorations', notifications.publishDecorations.handle]];

  // Commands are requests from vscode to the language server
  registerCommand('rust-analyzer.analyzerStatus', cmds.analyzerStatus.handler);
  // registerCommand('rust-analyzer.matchingBrace', cmds.matchingBrace.handle);
  // registerCommand('rust-analyzer.joinLines', cmds.joinLines.handle);
  // registerCommand('rust-analyzer.parentModule', cmds.parentModule.handle);
  // registerCommand('rust-analyzer.run', cmds.runnables.handle);
  // Unlike the above this does not send requests to the language server
  // registerCommand('rust-analyzer.runSingle', cmds.runnables.handleSingle);
  registerCommand('rust-analyzer.collectGarbage', () => Server.client.sendRequest<null>('rust-analyzer/collectGarbage', null));
  // TODO
  registerCommand('rust-analyzer.applySourceChange', cmds.applySourceChange.handle);
  // TODO
  // registerCommand('rust-analyzer.showReferences', (uri: string, position: Position, locations: Location[]) => {
  //   commands.executeCommand(
  //     'editor.action.showReferences',
  //     Uri.parse(uri),
  //     Server.client.protocol2CodeConverter.asPosition(position),
  //     locations.map(Server.client.protocol2CodeConverter.asLocation)
  //   );
  // });

  // Executing `cargo watch` provides us with inline diagnostics on save
  // let provider: CargoWatchProvider | undefined;
  // registerCommand('rust-analyzer.startCargoWatch', () => {
  //   if (provider) {
  //     provider.start();
  //   } else {
  //     startCargoWatch(context).then(p => {
  //       provider = p;
  //     });
  //   }
  // });
  // registerCommand('rust-analyzer.stopCargoWatch', () => {
  //   if (provider) {
  //     provider.stop();
  //   }
  // });

  registerCommand('rust-analyzer.reload', async () => {
    if (Server.client != null) {
      workspace.showMessage(`Reloading rust-analyzer...`);
      await Server.client.stop();
      Server.start(allNotifications);
    }
  });

  Server.start(allNotifications);
}

export function deactivate(): Thenable<void> {
  if (!Server.client) {
    return Promise.resolve();
  }
  return Server.client.stop();
}
