import { commands, ConfigurationChangeEvent, window, workspace, WorkspaceConfiguration } from 'coc.nvim';

export type UpdatesChannel = 'stable' | 'nightly';

export interface Env {
  [name: string]: string;
}

export class Config {
  private readonly rootSection = 'rust-analyzer';
  private readonly requiresReloadOpts = ['server', 'cargo', 'procMacro', 'files', 'updates', 'lens', 'inlayHints'].map((opt) => `${this.rootSection}.${opt}`);
  private cfg: WorkspaceConfiguration;

  constructor() {
    workspace.onDidChangeConfiguration((event) => this.onConfigChange(event));
    this.cfg = workspace.getConfiguration(this.rootSection);
  }

  private async onConfigChange(event: ConfigurationChangeEvent) {
    this.cfg = workspace.getConfiguration(this.rootSection);

    const requiresReloadOpt = this.requiresReloadOpts.find((opt) => event.affectsConfiguration(opt));
    if (!requiresReloadOpt) return;

    let reload = this.restartServerOnConfigChange ? true : false;
    if (!reload) {
      const msg = `Changing "${requiresReloadOpt}" requires a reload`;
      reload = await window.showPrompt(`${msg}. Reload now?`);
    }
    if (reload) {
      await commands.executeCommand(`rust-analyzer.reload`);
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

  get inlayHints() {
    const hasVirtualText = workspace.isNvim && workspace.nvim.hasFunction('nvim_buf_set_virtual_text');
    return {
      enable: hasVirtualText && this.cfg.get<boolean>('inlayHints.enable'),
      typeHints: hasVirtualText && this.cfg.get<boolean>('inlayHints.typeHints'),
      typeHintsSeparator: this.cfg.get<string>('inlayHints.typeHintsSeparator'),
      typeHintsWithVariable: this.cfg.get<boolean>('inlayHints.typeHintsWithVariable'),
      chainingHints: hasVirtualText && this.cfg.get<boolean>('inlayHints.chainingHints'),
      chainingHintsSeparator: this.cfg.get<string>('inlayHints.chainingHintsSeparator'),
      refreshOnInsertMode: hasVirtualText && this.cfg.get<boolean>('inlayHints.refreshOnInsertMode'),
    };
  }

  get debug() {
    return {
      runtime: this.cfg.get<string>('debug.runtime'),
      vimspectorConfiguration: {
        name: this.cfg.get<string>('debug.vimspector.configuration.name'),
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
}
