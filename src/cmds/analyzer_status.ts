import { workspace } from 'coc.nvim';
import { Cmd, Ctx } from '../ctx';

export async function handler() {}

export function analyzerStatus(ctx: Ctx): Cmd {
  return async () => {
    if (!ctx.client) {
      return;
    }

    const ret = await ctx.client.sendRequest<string>('rust-analyzer/analyzerStatus', null);
    workspace.echoLines(ret.split('\n'));
  };
}
