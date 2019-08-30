import { workspace } from 'coc.nvim';
import { Server } from '../server';

export async function handler() {
  const ret = await Server.client.sendRequest<string>('rust-analyzer/analyzerStatus', null);
  workspace.echoLines(ret.split('\n'));
}
