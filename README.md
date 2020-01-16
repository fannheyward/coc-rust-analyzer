# coc-rust-analyzer

[rust-analyzer](https://github.com/rust-analyzer/rust-analyzer) for Vim/Neovim, works as an extension with coc.nvim.

<img width="567" alt="10" src="https://user-images.githubusercontent.com/345274/67060118-34808a00-f18e-11e9-9d76-22fff11b5802.png">

## Install

`:CocInstall coc-rust-analyzer`

> remove `ra_lsp_server` config from `coc-settings.json` if you set

## Quick Start

You need `ra_lsp_server` installed. You can build it from source:

```sh
git clone https://github.com/rust-analyzer/rust-analyzer && cd rust-analyzer

rustup component add rust-src
cargo xtask install --server
```

## Configurations

This extension is configured using a jsonc file. You can open this configuration file using
the command `:CocConfig`, and it is typically located at `$HOME/.config/nvim/coc-settings.json`.

- `rust-analyzer.raLspServerPath`: Path to ra_lsp_server executable, default: `ra_lsp_server`
- `rust-analyzer.featureFlags`: Fine grained feature flags to disable annoying features, default: `{}`, available [flags](https://github.com/rust-analyzer/rust-analyzer/blob/master/crates/ra_ide/src/feature_flags.rs#L55)
- `rust-analyzer.excludeGlobs`: Paths to exclude from analysis, default: `[]`
- `rust-analyzer.lruCapacity`: Number of syntax trees rust-analyzer keeps in memory, default: `null`
- `rust-analyzer.useClientWatching`: use client provided file watching instead of notify watching, default: `true`
- `rust-analyzer.cargo-watch.enable`: Run `cargo check` for diagnostics on save, default: `true`
- `rust-analyzer.cargo-watch.arguments`: `cargo-watch` arguments, default: `[]`
- `rust-analyzer.cargo-watch.command`: `cargo-watch` arguments, default: `check`
- `rust-analyzer.cargo-watch.allTargets`: Check all targets and tests (will be passed as `--all-targets`)
- `rust-analyzer.cargoFeatures.noDefaultFeatures`: do not activate the `default` feature
- `rust-analyzer.cargoFeatures.allFeatures`: activate all available features
- `rust-analyzer.cargoFeatures.features`: list of features to activate
- `rust-analyzer.trace.server`: Trace requests to the ra_lsp_server, default: `off`

Settings not specific to `rust-analyzer` can be found at `:help coc-configuration`.

## Commands

- `rust-analyzer.analyzerStatus`: Show rust-analyzer status
- `rust-analyzer.applySourceChange`: Apply source change
- `rust-analyzer.selectAndApplySourceChange`: Apply selected source change
- `rust-analyzer.collectGarbage`: Run garbage collection
- `rust-analyzer.expandMacro`: Expand macro recursively
- `rust-analyzer.joinLines`: Join lines
- `rust-analyzer.matchingBrace`: Find matching brace
- `rust-analyzer.parentModule`: Locate parent module
- `rust-analyzer.reload`: Restart rust-analyzer server
- `rust-analyzer.run`: List available runnables of current file
- `rust-analyzer.runSingle`: Run runnable at position
- `rust-analyzer.syntaxTree`: Show syntax tree
- `rust-analyzer.upgrade`: Download latest `ra_lsp_server` from [GitHub release](https://github.com/rust-analyzer/rust-analyzer/releases)

## License

MIT

---
> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
