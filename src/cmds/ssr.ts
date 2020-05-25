import { workspace } from 'coc.nvim';
import { Cmd, Ctx } from '../ctx';
import * as ra from '../rust-analyzer-api';

export function ssr(ctx: Ctx): Cmd {
  return async () => {
    const input = await workspace.callAsync<string>('input', ['Enter request like this: foo($a:expr, $b:expr) ==>> bar($a, foo($b)): ']);
    workspace.nvim.command('normal! :<C-u>', true);
    if (!input) {
      return;
    }

    if (!input.includes('==>>')) {
      return;
    }

    const param: ra.SsrParams = {
      query: input,
      parseOnly: false,
    };

    const edit = await ctx.client.sendRequest(ra.ssr, param);
    await workspace.applyEdit(edit);
  };
}
