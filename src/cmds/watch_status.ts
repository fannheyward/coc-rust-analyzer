import { Disposable, StatusBarItem, workspace } from 'coc.nvim';

export class StatusDisplay implements Disposable {
  public packageName?: string;

  private statusBarItem: StatusBarItem;
  private command: string;

  constructor(command: string) {
    this.statusBarItem = workspace.createStatusBarItem(0, { progress: true });
    this.command = command;
    this.statusBarItem.hide();
  }

  public show() {
    this.packageName = undefined;

    if (this.packageName) {
      this.statusBarItem!.text = `cargo ${this.command} [${this.packageName}]`;
    } else {
      this.statusBarItem!.text = `cargo ${this.command}`;
    }

    this.statusBarItem.show();
  }

  public hide() {
    this.statusBarItem.hide();
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
