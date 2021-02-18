# coc-rust-analyzer

[rust-analyzer](https://github.com/rust-analyzer/rust-analyzer) for Vim/Neovim, works as an extension with coc.nvim.

<!-- markdownlint-disable-next-line -->
<img width="567" alt="10" src="https://user-images.githubusercontent.com/345274/67060118-34808a00-f18e-11e9-9d76-22fff11b5802.png">

## Install

`:CocInstall coc-rust-analyzer`

> remove `rust-analyzer` config from `coc-settings.json` if you set

## Configurations

This extension is configured using a jsonc file. You can open this configuration file using the command `:CocConfig`, and it is typically located at `$HOME/.config/nvim/coc-settings.json`.

- `rust-analyzer.enable`: Enable coc-rust-analyzer extension, default `true`
- `rust-analyzer.server.path`: Path to custom `rust-analyzer` executable, default: `''`
- `rust-analyzer.updates.prompt`: Prompt the user before downloading, default: `true`
- `rust-analyzer.updates.channel`: Use `stable` or `nightly` updates, default: `stable`
- `rust-analyzer.diagnostics.enable`: Whether to show native rust-analyzer diagnostics, default: `true`
- `rust-analyzer.diagnostics.enableExperimental`: Whether to show experimental rust-analyzer diagnostics that might have more false positives than usual, default: `true`
- `rust-analyzer.diagnostics.disabled`: List of rust-analyzer diagnostics to disable, default: `[]`
- `rust-analyzer.diagnostics.warningsAsInfo`: List of warnings that should be displayed with info severity, default: `[]`
- `rust-analyzer.diagnostics.warningsAsHint`: List of warnings that should be displayed with hint severity, default: `[]`
- `rust-analyzer.lruCapacity`: Number of syntax trees rust-analyzer keeps in memory, default: `null`
- `rust-analyzer.inlayHints.enable`: Whether to show inlay hints, default `true`
- `rust-analyzer.inlayHints.typeHints`: Whether to show inlay type hints for variables, **Neovim Only**, default `true`
- `rust-analyzer.inlayHints.typeHintsSeparator`: Separator text for typeHints in virtual text, default `‣`
- `rust-analyzer.inlayHints.chainingHints`: Whether to show inlay type hints for method chains, **Neovim Only**, default `true`
- `rust-analyzer.inlayHints.chainingHintsSeparator`: Separator text for chainingHints in virtual text, default `‣`
- `rust-analyzer.inlayHints.refreshOnInsertMode`: Whether to refresh inlayHints on insert mode, default `false`
- `rust-analyzer.files.watcher`: Controls file watching implementation, default: `client`
- `rust-analyzer.notifications.cargoTomlNotFound`: Whether to show `can't find Cargo.toml` error message, default: `true`
- `rust-analyzer.cargo.autoreload`: Automatically refresh project info via `cargo metadata` on Cargo.toml changes, default: `true`
- `rust-analyzer.cargo.allFeatures`: Activate all available features, default: `false`
- `rust-analyzer.cargo.features`: List of features to activate, default: `[]`
- `rust-analyzer.cargo.noDefaultFeatures`: Do not activate the `default` feature, default: `false`
- `rust-analyzer.cargo.loadOutDirsFromCheck`: Run `cargo check` on startup to get the correct value for package OUT_DIRs, default: `false`
- `rust-analyzer.procMacro.enable`: Enable Proc macro support, `cargo.loadOutDirsFromCheck` must be enabled, default: `false`
- `rust-analyzer.rustfmt.extraArgs`: Additional arguments to rustfmt, default: `[]`
- `rust-analyzer.rustfmt.overrideCommand`: Advanced option, fully override the command rust-analyzer uses for formatting, default: `null`
- `rust-analyzer.checkOnSave.enable`: Run specified `cargo check` command for diagnostics on save, default: `true`
- `rust-analyzer.checkOnSave.target`: Check for a specific target.
- `rust-analyzer.checkOnSave.extraArgs`: Extra arguments for `cargo check`, default: `[]`
- `rust-analyzer.checkOnSave.command`: Cargo command to use for `cargo check`, default: `check`
- `rust-analyzer.checkOnSave.overrideCommand`: Advanced option, fully override the command rust-analyzer uses for checking. The command should include `--message=format=json` or similar option, default: `null`
- `rust-analyzer.checkOnSave.allTargets`: Check all targets and tests (will be passed as `--all-targets`), default: `true`
- `rust-analyzer.checkOnSave.noDefaultFeatures`: Do not activate the `default` feature
- `rust-analyzer.checkOnSave.allFeatures`: Check with all features (will be passed as `--all-features`), default: `null`
- `rust-analyzer.checkOnSave.features`: List of features to activate, default: `null`
- `rust-analyzer.completion.addCallParenthesis`: Whether to add parenthesis when completing functions, default: `true`
- `rust-analyzer.completion.addCallArgumentSnippets`: Whether to add argument snippets when completing functions, default: `true`
- `rust-analyzer.completion.postfix.enable`: Whether to show postfix snippets like `dbg`, `if`, `not`, etc, default: `true`
- `rust-analyzer.lens.enable`: Whether to show CodeLens in Rust files, default: `true`
- `rust-analyzer.lens.run`: Whether to show Run lens, default: `true`
- `rust-analyzer.lens.implementations`: Whether to show Implementations lens, default: `true`
- `rust-analyzer.lens.methodReferences`: Whether to show `Method References` lens, default: `false`
- `rust-analyzer.hoverActions.linksInHover`: Whether to show document links in hover, default: `false`
- `rust-analyzer.callInfo.full`: Show function name and docs in parameter hints, default: `true`
- `rust-analyzer.trace.server`: Trace requests to server, default: `off`
- `rust-analyzer.debug.runtime`: Which runtime debug to use, default: `termdebug`, options: `vimspector`, `termdebug`
- `rust-analyzer.debug.vimspector.configuration.name`: The name of the vimspector configuration. The following variables will be passed to the configuration: `Executable` and `Args`. Make sure to add them to the configuration

Settings not specific to `rust-analyzer` can be found at `:help coc-configuration`.

## Commands

You can use these commands by `:CocCommand XYZ`.

- `rust-analyzer.analyzerStatus`: Show rust-analyzer status
- `rust-analyzer.expandMacro`: Expand macro recursively
- `rust-analyzer.joinLines`: Join lines
- `rust-analyzer.matchingBrace`: Find matching brace
- `rust-analyzer.memoryUsage`: Memory Usage (Clears Database)
- `rust-analyzer.openDocs`: Open docs under cursor
- `rust-analyzer.parentModule`: Locate parent module
- `rust-analyzer.reload`: Restart rust-analyzer server
- `rust-analyzer.reloadWorkspace`: Reload workspace
- `rust-analyzer.run`: List available runnables of current file
- `rust-analyzer.syntaxTree`: Show syntax tree
- `rust-analyzer.ssr`: Structural Search Replace
- `rust-analyzer.serverVersion`: Show current Rust Analyzer server version
- `rust-analyzer.toggleInlayHints`: Toggle inlay hints on/off
- `rust-analyzer.explainError`: Explain the currently hovered error message
- `rust-analyzer.viewHir`: View Hir
- `rust-analyzer.upgrade`: Download latest `rust-analyzer` from [GitHub release](https://github.com/rust-analyzer/rust-analyzer/releases)

## Highlight Group

- `CocRustTypeHint`: highlight name for `typeHints`, default link to `CocHintSign`
- `CocRustChainingHint`: highlight name for `chainingHints`, default link to `CocHintSign`

## Supporting

If this extension is helpful to you, please support me via Patreon or PayPal:

<!-- markdownlint-disable-next-line -->
<a href="https://patreon.com/fannheyward"><img src="https://c5.patreon.com/external/logo/become_a_patron_button.png" alt="Patreon donate button" /> </a>
<!-- markdownlint-disable-next-line -->
<a href="https://paypal.me/fannheyward"><img src="https://user-images.githubusercontent.com/345274/104303610-41149f00-5505-11eb-88b2-5a95c53187b4.png" alt="PayPal donate button" /> </a>

## License

MIT

---

> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
