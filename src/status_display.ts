import { Disposable, StatusBarItem, workspace } from 'coc.nvim';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';

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

  public handleProgressNotification(params: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd) {
    switch (params.kind) {
      case 'begin':
        this.show();
        break;
      case 'report':
        if (params.message) {
          this.packageName = params.message;
        }
        break;
      case 'end':
        this.hide();
        break;
    }
  }
}
