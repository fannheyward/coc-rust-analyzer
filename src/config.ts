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
}

export class Config {
  private static readonly rootSection = 'rust-analyzer';
  private static readonly requiresReloadOpts = ['cargoFeatures', 'cargo-watch'].map(opt => `${Config.rootSection}.${opt}`);
  private cfg!: WorkspaceConfiguration;

  constructor() {
    workspace.onDidChangeConfiguration(event => this.onConfigChange(event));
    this.cfg = workspace.getConfiguration(Config.rootSection);
  }

  private async onConfigChange(event: ConfigurationChangeEvent) {
    this.cfg = workspace.getConfiguration(Config.rootSection);

    const requiresReloadOpt = Config.requiresReloadOpts.find(opt => event.affectsConfiguration(opt));
    if (!requiresReloadOpt) return;

    const msg = `Changing "${requiresReloadOpt}" requires a reload`;
    workspace.showPrompt(`${msg}. Reload Now?`).then(prompt => {
      if (prompt) {
        commands.executeCommand(`workbench.action.reloadWindow`);
      }
    });
  }

  get raLspServerPath() {
    return this.cfg.get('raLspServerPath', '');
  }

  get highlightingOn() {
    return this.cfg.get('highlightingOn', true);
  }

  get rainbowHighlightingOn() {
    return this.cfg.get('rainbowHighlightingOn', false);
  }

  get lruCapacity() {
    return this.cfg.get('lruCapacity') as number | null;
  }

  get displayInlayHints() {
    return this.cfg.get('displayInlayHints', true);
  }

  get maxInlayHintLength() {
    return this.cfg.get('maxInlayHintLength') as number;
  }

  get excludeGlobs() {
    return this.cfg.get<string[]>('excludeGlobs', []);
  }

  get useClientWatching() {
    return this.cfg.get('useClientWatching', true);
  }

  get featureFlags() {
    return this.cfg.get('featureFlags') as Record<string, boolean>;
  }

  get cargoWatchOptions(): CargoWatchOptions {
    return {
      enable: this.cfg.get('cargo-watch.enable', true),
      arguments: this.cfg.get('cargo-watch.arguments', []),
      command: this.cfg.get('cargo-watch.command', ''),
      allTargets: this.cfg.get('cargo-watch.allTargets', true)
    };
  }

  get cargoFeatures(): CargoFeatures {
    return {
      noDefaultFeatures: this.cfg.get('cargoFeatures.noDefaultFeatures', false),
      allFeatures: this.cfg.get('cargoFeatures.allFeatures', true),
      features: this.cfg.get('cargoFeatures.features', [])
    };
  }
}
