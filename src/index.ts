import { commands, CompleteResult, ExtensionContext, sources, workspace } from 'coc.nvim';

export async function activate(context: ExtensionContext): Promise<void> {
  workspace.showMessage(`coc-rust-analyzer is works!`);

  context.subscriptions.push(
    commands.registerCommand('coc-rust-analyzer.Command', async () => {
      workspace.showMessage(`coc-rust-analyzer Commands works!`);
    }),

    sources.createSource({
      name: 'coc-rust-analyzer completion source', // unique id
      shortcut: '[CS]', // [CS] is custom source
      priority: 1,
      triggerPatterns: [], // RegExp pattern
      doComplete: async () => {
        const items = await getItems();
        return items;
      }
    })
  );
}

async function getItems(): Promise<CompleteResult> {
  return {
    items: [
      {
        word: 'TestCompletionItem 1'
      },
      {
        word: 'TestCompletionItem 2'
      }
    ]
  };
}
