import { Executable, LanguageClient, LanguageClientOptions, ServerOptions, Uri, workspace } from 'coc.nvim';
import { homedir } from 'os';
import { GenericNotificationHandler } from 'vscode-languageserver-protocol';
import which from 'which';
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

  public static prepare(): Executable | undefined {
    const bin = expandPathResolving(this.config.raLspServerPath);
    if (bin === 'ra_lsp_server') {
      if (!which.sync(bin, { nothrow: true })) {
        return;
      }
    }

    let folder = '.';
    if (workspace.workspaceFolder && workspace.workspaceFolder.uri.length > 0) {
      folder = Uri.parse(workspace.workspaceFolder.uri).fsPath;
    }

    const run: Executable = {
      command: bin,
      options: { cwd: folder }
    };

    return run;
  }

  public static start(notificationHandlers: Iterable<[string, GenericNotificationHandler]>) {
    const run = this.prepare();
    if (!run) {
      return;
    }

    const serverOptions: ServerOptions = {
      run,
      debug: run
    };
    const outputChannel = workspace.createOutputChannel('Rust Analyzer Language Server Trace');
    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ scheme: 'file', language: 'rust' }],
      initializationOptions: {
        publishDecorations: false,
        lruCapacity: Server.config.lruCapacity,
        excludeGlobs: Server.config.excludeGlobs,
        useClientWatching: Server.config.useClientWatching,
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
