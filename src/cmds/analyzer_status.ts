import { workspace } from 'coc.nvim';
import { Cmd, Ctx } from '../ctx';
import * as ra from '../rust-analyzer-api';

export async function handler() {}

export function analyzerStatus(ctx: Ctx): Cmd {
  return async () => {
    if (!ctx.client) {
      return;
    }

    const ret = await ctx.client.sendRequest(ra.analyzerStatus, null);
    workspace.echoLines(ret.split('\n'));
  };
}
