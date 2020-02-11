import { workspace } from 'coc.nvim';
import { Cmd, Ctx } from '../ctx';
import { applySourceChange, SourceChange } from '../source_change';

interface SsrRequest {
  arg: string;
}

export function ssr(ctx: Ctx): Cmd {
  return async () => {
    const client = ctx.client;
    if (!client) {
      return;
    }

    const input = await workspace.callAsync<string>('input', ['Enter request like this: foo($a:expr, $b:expr) ==>> bar($a, foo($b)): ']);
    workspace.nvim.command('normal! :<C-u>', true);
    if (!input) {
      return;
    }

    if (!input.includes('==>>')) {
      return;
    }

    const req: SsrRequest = { arg: input };
    const change = await client.sendRequest<SourceChange>('rust-analyzer/ssr', req);
    if (!change) {
      return;
    }

    await applySourceChange(change);
  };
}
