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

1. `rust-analyzer.raLspServerPath`
1. `rust-analyzer.featureFlags`
1. `rust-analyzer.excludeGlobs`
1. `rust-analyzer.lruCapacity`
1. `rust-analyzer.trace.server`

## Commands

> works

1. `rust-analyzer.analyzerStatus`
1. `rust-analyzer.applySourceChange`
1. `rust-analyzer.collectGarbage`
1. `rust-analyzer.joinLines`
1. `rust-analyzer.matchingBrace`
1. `rust-analyzer.parentModule`
1. `rust-analyzer.reload`
1. `rust-analyzer.run`
1. `rust-analyzer.runSingle`
1. `rust-analyzer.syntaxTree`

## License

MIT

---
> This extension is created by [create-coc-extension](https://github.com/fannheyward/create-coc-extension)
