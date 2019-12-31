import { workspace } from 'coc.nvim';
import { Ctx, Cmd } from '../ctx';

export async function handler() {}

export function analyzerStatus(ctx: Ctx): Cmd {
  return async () => {
    const ret = await ctx.client.sendRequest<string>('rust-analyzer/analyzerStatus', null);
    workspace.echoLines(ret.split('\n'));
  };
}
