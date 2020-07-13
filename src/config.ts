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
    const prompt = await workspace.showPrompt(`${msg}. Reload now?`);
    if (prompt) {
      await commands.executeCommand(`workbench.action.reloadWindow`);
    }
  }

  get serverPath() {
    return this.cfg.get<null | string>('serverPath')!;
  }

  get inlayHints() {
    const hasVirtualText = workspace.isNvim && workspace.nvim.hasFunction('nvim_buf_set_virtual_text');
    return {
      chainingHints: hasVirtualText && this.cfg.get<boolean>('inlayHints.chainingHints'),
      refreshOnInsertMode: hasVirtualText && this.cfg.get<boolean>('inlayHints.refreshOnInsertMode'),
    };
  }

  get channel() {
    return this.cfg.get<UpdatesChannel>('updates.channel')!;
  }
}
