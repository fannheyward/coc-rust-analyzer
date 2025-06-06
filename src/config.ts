import { commands, type ConfigurationChangeEvent, window, workspace, type WorkspaceConfiguration } from 'coc.nvim';

export type UpdatesChannel = 'stable' | 'nightly';

export interface Env {
  [name: string]: string;
}

export class Config {
  private readonly rootSection = 'rust-analyzer';
  private readonly requiresReloadOpts = ['server', 'cargo', 'procMacro', 'files', 'updates', 'lens', 'inlayHints'].map(
    (opt) => `${this.rootSection}.${opt}`,
  );
  private cfg: WorkspaceConfiguration;

  constructor() {
    workspace.onDidChangeConfiguration((event) => this.onConfigChange(event));
    this.cfg = workspace.getConfiguration(this.rootSection);
  }

  private async onConfigChange(event: ConfigurationChangeEvent) {
    this.cfg = workspace.getConfiguration(this.rootSection);

    const requiresReloadOpt = this.requiresReloadOpts.find((opt) => event.affectsConfiguration(opt));
    if (!requiresReloadOpt) return;

    let reload = !!this.restartServerOnConfigChange;
    if (!reload) {
      const msg = `Changing "${requiresReloadOpt}" requires a reload`;
      reload = await window.showPrompt(`${msg}. Reload now?`);
    }
    if (reload) {
      await commands.executeCommand('rust-analyzer.reload');
    }
  }

  get serverPath() {
    return this.cfg.get<null | string>('server.path') ?? this.cfg.get<null | string>('serverPath');
  }

  get serverExtraEnv() {
    return this.cfg.get<Env>('server.extraEnv') ?? {};
  }

  get restartServerOnConfigChange() {
    return this.cfg.get<boolean>('restartServerOnConfigChange');
  }

  get inlayHint() {
    return {
      enable: workspace.getConfiguration('inlayHint').get('enable', true),
    };
  }

  get debug() {
    return {
      runtime: this.cfg.get<string>('debug.runtime'),
      vimspectorConfiguration: {
        name: this.cfg.get<string>('debug.vimspector.configuration.name'),
      },
      nvimdapConfiguration: {
        template: this.cfg.get<string>('debug.nvimdap.configuration.template'),
      },
    };
  }

  get prompt() {
    return this.cfg.get<boolean | 'neverDownload'>('updates.prompt', true);
  }

  get channel() {
    return this.cfg.get<UpdatesChannel>('updates.channel')!;
  }

  get checkOnStartup() {
    return this.cfg.get<boolean>('updates.checkOnStartup');
  }

  get terminal() {
    return {
      startinsert: this.cfg.get<boolean>('terminal.startinsert'),
    };
  }

  get enable() {
    return this.cfg.get<boolean>('enable');
  }

  get disableProgressNotifications() {
    return this.cfg.get<boolean>('disableProgressNotifications');
  }

  get disablePullDiagnostic() {
    return this.cfg.get<boolean>('disablePullDiagnostic');
  }
}
