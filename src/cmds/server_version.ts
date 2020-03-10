import { spawnSync } from 'child_process';
import { workspace } from 'coc.nvim';
import { Cmd, Ctx } from '../ctx';

export function serverVersion(ctx: Ctx): Cmd {
  return async () => {
    const bin = ctx.resolveBin();
    if (!bin) {
      const msg = `Rust Analyzer is not found`;
      workspace.showMessage(msg, 'error');
      return;
    }

    const version = spawnSync(bin, ['--version'], { encoding: 'utf-8' }).stdout;
    workspace.showMessage(version);
  };
}
