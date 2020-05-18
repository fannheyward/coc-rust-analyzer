import { commands, ConfigurationChangeEvent, workspace, WorkspaceConfiguration } from 'coc.nvim';

export interface CargoWatchOptions {
  enable: boolean;
  arguments: string[];
  command: string;
  allTargets: boolean;
}

export interface CargoFeatures {
  noDefaultFeatures: boolean;
  allFeatures: boolean;
  features: string[];
  loadOutDirsFromCheck: boolean;
}

export type UpdatesChannel = 'stable' | 'nightly';

export class Config {
  private static readonly rootSection = 'rust-analyzer';
  private static readonly requiresReloadOpts = ['serverPath', 'cargo', 'procMacro', 'files', 'updates', 'lens'].map((opt) => `${Config.rootSection}.${opt}`);
  private cfg: WorkspaceConfiguration;

  constructor() {
    workspace.onDidChangeConfiguration((event) => this.onConfigChange(event));
    this.cfg = workspace.getConfiguration(Config.rootSection);
  }

  private async onConfigChange(event: ConfigurationChangeEvent) {
    this.cfg = workspace.getConfiguration(Config.rootSection);

    const requiresReloadOpt = Config.requiresReloadOpts.find((opt) => event.affectsConfiguration(opt));
    if (!requiresReloadOpt) return;

    const msg = `Changing "${requiresReloadOpt}" requires a reload`;
    workspace.showPrompt(`${msg}. Reload Now?`).then((prompt) => {
      if (prompt) {
        commands.executeCommand(`workbench.action.reloadWindow`);
      }
    });
  }

  get serverPath() {
    return this.cfg.get<null | string>('serverPath')!;
  }

  get inlayHints() {
    const hasVirtualText = workspace.isNvim && workspace.nvim.hasFunction('nvim_buf_set_virtual_text');
    return {
      chainingHints: hasVirtualText && this.cfg.get<boolean>('inlayHints.chainingHints'),
    };
  }

  get checkOnSave() {
    return {
      command: this.cfg.get<string>('checkOnSave.command')!,
    };
  }

  get channel() {
    return this.cfg.get<UpdatesChannel>('updates.channel')!;
  }

  get lens() {
    return {
      enable: this.cfg.get<boolean>('lens.enable'),
      run: this.cfg.get<boolean>('lens.run'),
      debug: false,
      implementations: this.cfg.get<boolean>('lens.implementations'),
    };
  }
}
