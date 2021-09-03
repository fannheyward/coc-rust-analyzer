# coc-rust-analyzer

[rust-analyzer](https://github.com/rust-analyzer/rust-analyzer) for Vim/Neovim, works as an extension with coc.nvim.

<!-- markdownlint-disable-next-line -->
<img width="567" alt="10" src="https://user-images.githubusercontent.com/345274/67060118-34808a00-f18e-11e9-9d76-22fff11b5802.png">

## Install

`:CocInstall coc-rust-analyzer`

> remove `rust-analyzer` config from `coc-settings.json` if you've set

## Configurations

This extension is configured using a jsonc file. You can open this configuration file using the command `:CocConfig`, and it is typically located at `$HOME/.config/nvim/coc-settings.json`.

| Configuration | Description | Default |
| -- | -- | -- |
| `rust-analyzer.enable` | Enable coc-rust-analyzer extension |`true`|
| `rust-analyzer.server.path` | Path to custom `rust-analyzer` executable |`''`|
| `rust-analyzer.updates.prompt` | Prompt the user before downloading |`true`|
| `rust-analyzer.updates.channel` | Use `stable` or `nightly` updates |`stable`|
| `rust-analyzer.diagnostics.enable` | Whether to show native rust-analyzer diagnostics |`true`|
| `rust-analyzer.diagnostics.enableExperimental` | Whether to show experimental rust-analyzer diagnostics that might have more false positives than usual |`true`|
| `rust-analyzer.diagnostics.disabled`| List of rust-analyzer diagnostics to disable |`[]`|
| `rust-analyzer.diagnostics.warningsAsInfo`| List of warnings that should be displayed with info severity |`[]`|
| `rust-analyzer.diagnostics.warningsAsHint`| List of warnings that should be displayed with hint severity |`[]`|
| `rust-analyzer.experimental.procAttrMacros` | Expand attribute macros | `false` |
| `rust-analyzer.lruCapacity` | Number of syntax trees rust-analyzer keeps in memory |`null`|
| `rust-analyzer.inlayHints.enable`| Whether to show inlay hints |`true`|
| `rust-analyzer.inlayHints.typeHints`| Whether to show inlay type hints for variables, **Neovim Only** | `true`|
| `rust-analyzer.inlayHints.typeHintsSeparator`| Separator text for typeHints in virtual text |`‣`|
| `rust-analyzer.inlayHints.chainingHints` | Whether to show inlay type hints for method chains, **Neovim Only** | `true` |
| `rust-analyzer.inlayHints.chainingHintsSeparator` | Separator text for chainingHints in virtual text |`‣`|
| `rust-analyzer.inlayHints.refreshOnInsertMode` | Whether to refresh inlayHints on insert mode | `false` |
| `rust-analyzer.files.watcher` | Controls file watching implementation |`client`|
| `rust-analyzer.notifications.cargoTomlNotFound` | Whether to show `can't find Cargo.toml` error message | `true` |
| `rust-analyzer.cargo.autoreload` | Automatically refresh project info via `cargo metadata` on Cargo.toml changes | `true`|
| `rust-analyzer.cargo.allFeatures` | Activate all available features | `false` |
| `rust-analyzer.cargo.features` | List of features to activate |`[]`|
| `rust-analyzer.cargo.noDefaultFeatures` | Do not activate the `default` feature | `false` |
| `rust-analyzer.cargo.runBuildScripts` | Run build scripts (`build.rs`) for more precise code analysis | `false` |
| `rust-analyzer.procMacro.enable` | Enable support for procedural macros, implies `#rust-analyzer.cargo.runBuildScripts#` | `false` |
| `rust-analyzer.rustfmt.extraArgs` | Additional arguments to rustfmt | `[]` |
| `rust-analyzer.rustfmt.overrideCommand` | Advanced option, fully override the command rust-analyzer uses for formatting | `null` |
| `rust-analyzer.rustfmt.enableRangeFormatting` | Enables rustfmt's unstable range formatting, only available on a nightly build. | `false` |
| `rust-analyzer.checkOnSave.enable` | Run specified `cargo check` command for diagnostics on save | `true` |
| `rust-analyzer.checkOnSave.target` | Check for a specific target | `null` |
| `rust-analyzer.checkOnSave.extraArgs` | Extra arguments for `cargo check` | `[]` |
| `rust-analyzer.checkOnSave.command` | Cargo command to use for `cargo check` | `check` |
| `rust-analyzer.checkOnSave.overrideCommand` | Advanced option, fully override the command rust-analyzer uses for checking. The command should include `--message=format=json` or similar option | `null` |
| `rust-analyzer.checkOnSave.allTargets` | Check all targets and tests (will be passed as `--all-targets`) | `true` |
| `rust-analyzer.checkOnSave.noDefaultFeatures` | Do not activate the `default` feature | `null` |
| `rust-analyzer.checkOnSave.allFeatures` | Check with all features (will be passed as `--all-features`) | `null` |
| `rust-analyzer.checkOnSave.features` | List of features to activate | `null` |
| `rust-analyzer.completion.addCallParenthesis` | Whether to add parenthesis when completing functions | `true` |
| `rust-analyzer.completion.addCallArgumentSnippets` | Whether to add argument snippets when completing functions | `true` |
| `rust-analyzer.completion.postfix.enable` | Whether to show postfix snippets like `dbg`, `if`, `not`, etc | `true` |
| `rust-analyzer.completion.autoimport.enable` | Whether to enable additional completions that automatically add imports when completed | `true` |
| `rust-analyzer.lens.enable` | Whether to show CodeLens in Rust files, you also need to enable `codeLens.enable` in coc-settings.json | `true` |
| `rust-analyzer.lens.run` | Whether to show Run lens | `true` |
| `rust-analyzer.lens.implementations` | Whether to show Implementations lens | `true` |
| `rust-analyzer.lens.methodReferences` | Whether to show `Method References` lens | `false` |
| `rust-analyzer.hoverActions.linksInHover` | Whether to show document links in hover | `false` |
| `rust-analyzer.assist.importGranularity` | How imports should be grouped into use statements | `crate` |
| `rust-analyzer.assist.importEnforceGranularity` | Whether to enforce the import granularity setting for all files | `false` |
| `rust-analyzer.assist.allowMergingIntoGlobImports` | Whether to allow import insertion to merge new imports into single path glob imports like `use std::fmt::*;` | true |
| `rust-analyzer.assist.importPrefix` | The path structure for newly inserted paths to use | `plain` |
| `rust-analyzer.assist.importGroup` | Group inserted imports by the [following order](https://rust-analyzer.github.io/manual.html#auto-import). Groups are separated by newlines | `true` |
| `rust-analyzer.callInfo.full` | Show function name and docs in parameter hints | `true` |
| `rust-analyzer.trace.server` | Trace requests to server | `off` |
| `rust-analyzer.debug.runtime` | Which runtime debug to use, options: `vimspector`, `termdebug`. FYI [Debugging Rust in (Neo)Vim](https://youtu.be/U3uvbdgFMRE?t=293) | `termdebug` |
| `rust-analyzer.debug.vimspector.configuration.name` | The name of the vimspector configuration. The following variables will be passed to the configuration  `Executable` and `Args`. Make sure to add them to the configuration | `launch` |

Settings not specific to `rust-analyzer` can be found at `:help coc-configuration`.

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
| rust-analyzer.syntaxTree | Show syntax tree |
| rust-analyzer.toggleInlayHints | Toggle inlay hints on/off |
| rust-analyzer.upgrade | Download latest `rust-analyzer` from [GitHub release](https://github.com/rust-analyzer/rust-analyzer/releases) |
| rust-analyzer.viewHir | View Hir |
| rust-analyzer.viewCrateGraph | View Crate Graph |
| rust-analyzer.viewFullCrateGraph | View Crate Graph (Full) |

## Highlight Group

- `CocRustTypeHint`: highlight name for `typeHints`, default link to `CocHintSign`
- `CocRustChainingHint`: highlight name for `chainingHints`, default link to `CocHintSign`

## Supporting

If this extension is helpful to you, please support me via Patreon or PayPal:

<!-- markdownlint-disable no-inline-html -->
<a href="https://patreon.com/fannheyward"><img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Patreon donate button" /></a>
<a href="https://paypal.me/fannheyward"><img src="https://user-images.githubusercontent.com/345274/104303610-41149f00-5505-11eb-88b2-5a95c53187b4.png" alt="PayPal donate button" /></a>

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
