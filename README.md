# coc-rust-analyzer

rust-analyzer extension for coc.nvim

## Install

`:CocInstall coc-rust-analyzer`

## Quick Start

You need `ra_lsp_server` installed. You can build it from source:

```sh
git clone https://github.com/rust-analyzer/rust-analyzer && cd rust-analyzer

rustup component add rust-src
cargo install-ra --server
```

## Notes

1. This extension is WIP, not all `rust-analyzer.*` configs are works
1. Remove `ra_lsp_server` config from `coc-settings.json` if you set

## Configurations

> works

1. `rust-analyzer.raLspServerPath`: Path to ra_lsp_server executable, default: `ra_lsp_server`
1. `rust-analyzer.featureFlags`: Fine grained feature flags to disable annoying features, default: `{}`
1. `rust-analyzer.excludeGlobs`: Paths to exclude from analysis, default: `[]`
1. `rust-analyzer.lruCapacity`: Number of syntax trees rust-analyzer keeps in memory, default: `null`
1. `rust-analyzer.enableCargoWatchOnStartup`: Whether to run `cargo watch` on startup, default: `ask`
1. `rust-analyzer.cargo-watch.arguments`: `cargo-watch` arguments, default: `""`
1. `rust-analyzer.cargo-watch.command`: `cargo-watch` arguments, default: `check`
1. `rust-analyzer.trace.server`: Trace requests to the ra_lsp_server, default: `off`
1. `rust-analyzer.trace.cargo-watch`: Trace output of cargo-watch, default: `off`

## Commands

> works

1. `rust-analyzer.analyzerStatus`: Show rust-analyzer status
1. `rust-analyzer.applySourceChange`: Apply source change
1. `rust-analyzer.collectGarbage`: Run garbage collection
1. `rust-analyzer.joinLines`: Join lines
1. `rust-analyzer.matchingBrace`: Find matching brace
1. `rust-analyzer.parentModule`: Locate parent module
1. `rust-analyzer.reload`: Restart rust-analyzer server
1. `rust-analyzer.run`: List available runnables of current file
1. `rust-analyzer.runSingle`: Run runnable at position
1. `rust-analyzer.startCargoWatch`: Start cargo-watch
1. `rust-analyzer.stopCargoWatch`: Stop cargo-watch
1. `rust-analyzer.syntaxTree`: Show syntax tree

## License

MIT

---
> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
