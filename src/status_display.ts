import { Disposable, StatusBarItem, workspace } from 'coc.nvim';

// FIXME: Replace this once vscode-languageclient is updated to LSP 3.15
interface ProgressParams {
  token: string;
  value: WorkDoneProgress;
}

enum WorkDoneProgressKind {
  Begin = 'begin',
  Report = 'report',
  End = 'end'
}

interface WorkDoneProgress {
  kind: WorkDoneProgressKind;
  message?: string;
  cancelable?: boolean;
  percentage?: string;
}

export class StatusDisplay implements Disposable {
  private packageName?: string;
  private statusBarItem: StatusBarItem;
  private command: string;

  constructor(command: string) {
    this.statusBarItem = workspace.createStatusBarItem(0, { progress: true });
    this.command = command;
    this.statusBarItem.hide();
  }

  private show() {
    this.packageName = undefined;

    if (this.packageName) {
      this.statusBarItem!.text = `cargo ${this.command} [${this.packageName}]`;
    } else {
      this.statusBarItem!.text = `cargo ${this.command}`;
    }

    this.statusBarItem.show();
  }

  private hide() {
    this.statusBarItem.hide();
  }

  public dispose() {
    this.statusBarItem.dispose();
  }

  public handleProgressNotification(params: ProgressParams) {
    const { token, value } = params;
    if (token !== 'rustAnalyzer/cargoWatcher') {
      return;
    }

    switch (value.kind) {
      case 'begin':
        this.show();
        break;
      case 'report':
        if (value.message) {
          this.packageName = value.message;
        }
        break;
      case 'end':
        this.hide();
        break;
    }
  }
}
