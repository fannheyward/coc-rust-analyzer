import { homedir } from 'os';
import { Uri, LanguageClientOptions, ServerOptions, Executable, LanguageClient, workspace } from 'coc.nvim';
import { GenericNotificationHandler } from 'vscode-languageserver-protocol';

import { Config } from './config';
// import { Highlighter } from './highlighting';

function expandPathResolving(path: string) {
  if (path.startsWith('~/')) {
    return path.replace('~', homedir());
  }
  return path;
}

export class Server {
  // public static highlighter = new Highlighter();
  public static config = new Config();
  public static client: LanguageClient;

  public static start(notificationHandlers: Iterable<[string, GenericNotificationHandler]>) {
    let folder: string = '.';
    if (workspace.workspaceFolder.uri.length > 0) {
      folder = Uri.parse(workspace.workspaceFolder.uri).fsPath;
    }

    const run: Executable = {
      command: expandPathResolving(this.config.raLspServerPath),
      options: { cwd: folder }
    };
    const serverOptions: ServerOptions = {
      run,
      debug: run
    };
    const outputChannel = workspace.createOutputChannel('Rust Analyzer Language Server Trace');
    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: 'file', language: 'rust' }],
      initializationOptions: {
        publishDecorations: true,
        showWorkspaceLoaded: Server.config.showWorkspaceLoadedNotification,
        lruCapacity: Server.config.lruCapacity,
        excludeGlobs: Server.config.excludeGlobs,
        featureFlags: Server.config.featureFlags
      },
      outputChannel
    };

    Server.client = new LanguageClient('rust-analyzer', 'Rust Analyzer Language Server', serverOptions, clientOptions);
    // HACK: This is an awful way of filtering out the decorations notifications
    // However, pending proper support, this is the most effecitve approach
    // Proper support for this would entail a change to vscode-languageclient to allow not notifying on certain messages
    // Or the ability to disable the serverside component of highlighting (but this means that to do tracing we need to disable hihlighting)
    // This also requires considering our settings strategy, which is work which needs doing
    // @ts-ignore The tracer is private to vscode-languageclient, but we need access to it to not log publishDecorations requests
    Server.client._tracer = {
      log: (messageOrDataObject: string | any, data?: string) => {
        if (typeof messageOrDataObject === 'string') {
          if (messageOrDataObject.includes('rust-analyzer/publishDecorations') || messageOrDataObject.includes('rust-analyzer/decorationsRequest')) {
            // Don't log publish decorations requests
          } else {
            // @ts-ignore This is just a utility function
            Server.client.logTrace(messageOrDataObject, data);
          }
        } else {
          // @ts-ignore
          Server.client.logObjectTrace(messageOrDataObject);
        }
      }
    };
    Server.client.registerProposedFeatures();
    Server.client.onReady().then(() => {
      for (const [type, handler] of notificationHandlers) {
        Server.client.onNotification(type, handler);
      }
    });
    Server.client.start();
  }
}
