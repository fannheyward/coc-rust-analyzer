# coc-rust-analyzer

<!-- markdownlint-disable no-inline-html -->
<a href="https://github.com/sponsors/fannheyward"><img src="https://user-images.githubusercontent.com/345274/133218454-014a4101-b36a-48c6-a1f6-342881974938.png" alt="GitHub Sponsors" /></a>
<a href="https://patreon.com/fannheyward"><img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Patreon donate button" /></a>
<a href="https://paypal.me/fannheyward"><img src="https://user-images.githubusercontent.com/345274/104303610-41149f00-5505-11eb-88b2-5a95c53187b4.png" alt="PayPal donate button" /></a>

[rust-analyzer](https://github.com/rust-lang/rust-analyzer) for Vim/Neovim, works as an extension with coc.nvim.

<!-- markdownlint-disable-next-line -->
<img width="567" alt="10" src="https://user-images.githubusercontent.com/345274/67060118-34808a00-f18e-11e9-9d76-22fff11b5802.png">

## Install

`:CocInstall coc-rust-analyzer`

> remove `rust-analyzer` config from `coc-settings.json` if you've set

## Notes

It's recommended to add `$CARGO_HOME` to `workspace.ignoredFolders` to stop rust-analyzer runs `cargo check` on sysroot crates:

```json
"workspace.ignoredFolders": [
  "$HOME",
  "$HOME/.cargo/**",
  "$HOME/.rustup/**"
],
```

## Configurations

This extension is configured using a jsonc file. You can open this configuration file using the command `:CocConfig`, and it is typically located at `$HOME/.config/nvim/coc-settings.json`. You can get the configurations list from the [package.json](https://github.com/fannheyward/coc-rust-analyzer/blob/master/package.json#L72) file of this extension.

## Commands

You can use these commands by `:CocCommand XYZ`.

| Command | Description |
| -- | -- |
| rust-analyzer.analyzerStatus | Show rust-analyzer status |
| rust-analyzer.debug | List available runnables of current file and debug the selected one |
| rust-analyzer.expandMacro | Expand macro recursively |
| rust-analyzer.explainError | Explain the currently hovered error message |
| rust-analyzer.joinLines | Join lines |
| rust-analyzer.matchingBrace | Find matching brace |
| rust-analyzer.memoryUsage | Memory Usage (Clears Database) |
| rust-analyzer.moveItemUp | Move item up |
| rust-analyzer.moveItemDown | Move item down |
| rust-analyzer.openDocs | Open docs under cursor |
| rust-analyzer.parentModule | Locate parent module |
| rust-analyzer.peekTests | Peek related tests |
| rust-analyzer.reload | Restart rust-analyzer server |
| rust-analyzer.reloadWorkspace | Reload workspace |
| rust-analyzer.run | List available runnables of current file and run the selected one |
| rust-analyzer.serverVersion | Show current Rust Analyzer server version |
| rust-analyzer.ssr | Structural Search Replace |
| rust-analyzer.viewSyntaxTree | Show syntax tree |
| rust-analyzer.testCurrent | Test Current |
| rust-analyzer.install | Install latest `rust-analyzer` from [GitHub release](https://github.com/rust-lang/rust-analyzer/releases) |
| rust-analyzer.upgrade | Download latest `rust-analyzer` from [GitHub release](https://github.com/rust-lang/rust-analyzer/releases) |
| rust-analyzer.viewHir | View Hir |
| rust-analyzer.viewMir | View Mir |
| rust-analyzer.viewFileText | View File Text |
| rust-analyzer.viewCrateGraph | View Crate Graph |
| rust-analyzer.viewFullCrateGraph | View Crate Graph (Full) |
| rust-analyzer.shuffleCrateGraph | Shuffle Crate Graph |
| rust-analyzer.runFlycheck | Run flycheck |
| rust-analyzer.cancelFlycheck | Cancel running flychecks |
| rust-analyzer.clearFlycheck | Clear flycheck diagnostics |
| rust-analyzer.rebuildProcMacros | Rebuild proc macros and build scripts |
| rust-analyzer.interpretFunction | Interpret Function |

## License

MIT

---

> This extension is built with [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
