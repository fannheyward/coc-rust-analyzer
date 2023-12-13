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
>  
> **NOTE**: For Apple Silicon users, you shouldn't use Node.js v15, checkout [#975](https://github.com/fannheyward/coc-rust-analyzer/issues/975) for more.

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

This extension is configured using a jsonc file. You can open this configuration file using the command `:CocConfig`, and it is typically located at `$HOME/.config/nvim/coc-settings.json`.

| Configuration | Description | Default |
|---|---|---|
| `rust-analyzer.enable` | Enable `coc-rust-analyzer` | `true` |
| `rust-analyzer.assist.emitMustUse` | Whether to insert #[must_use] when generating `as_` methods for enum variants. | `false` |
| `rust-analyzer.assist.expressionFillDefault` | Placeholder expression to use for missing expressions in assists. | `todo` |
| `rust-analyzer.cachePriming.enable` | Warm up caches on project load. | `true` |
| `rust-analyzer.cachePriming.numThreads` | How many worker threads to handle priming caches. The default `0` means to pick automatically. | `0` |
| `rust-analyzer.cargo.autoreload` | Automatically refresh project info via `cargo metadata` on `Cargo.toml` or `.cargo/config.toml` changes. | `true` |
| `rust-analyzer.cargo.buildScripts.enable` | Run build scripts (`build.rs`) for more precise code analysis. | `true` |
| `rust-analyzer.cargo.buildScripts.invocationLocation` | Specifies the working directory for running build scripts. | `workspace` |
| `rust-analyzer.cargo.buildScripts.invocationStrategy` | Specifies the invocation strategy to use when running the build scripts command. | `null` |
| `rust-analyzer.cargo.buildScripts.useRustcWrapper` | Use `RUSTC_WRAPPER=rust-analyzer` when running build scripts to avoid checking unnecessary things. | `true` |
| `rust-analyzer.cargo.extraEnv` | Extra environment variables that will be set when running cargo, rustc or other commands within the workspace. Useful for setting RUSTFLAGS. | `null` |
| `rust-analyzer.cargo.features` | List of features to activate. Set this to `"all"` to pass `--all-features` to cargo. | `` |
| `rust-analyzer.cargo.noDefaultFeatures` | Whether to pass `--no-default-features` to cargo. | `false` |
| `rust-analyzer.cargo.sysroot` | Relative path to the sysroot, or "discover" to try to automatically find it via "rustc --print sysroot". | `discover` |
| `rust-analyzer.cargo.sysrootSrc` | Relative path to the sysroot library sources. If left unset, this will default to `{cargo.sysroot}/lib/rustlib/src/rust/library`. | `null` |
| `rust-analyzer.cargo.target` | Compilation target override (target triple). | `null` |
| `rust-analyzer.cargo.unsetTest` | Unsets `#[cfg(test)]` for the specified crates. | `core` |
| `rust-analyzer.check.allTargets` | Check all targets and tests (`--all-targets`). | `true` |
| `rust-analyzer.check.command` | Cargo command to use for `cargo check`. | `check` |
| `rust-analyzer.check.extraArgs` | Extra arguments for `cargo check`. | `[]` |
| `rust-analyzer.check.extraEnv` | Extra environment variables that will be set when running `cargo check`. Extends `#rust-analyzer.cargo.extraEnv#`. | `{}` |
| `rust-analyzer.check.features` | List of features to activate. Defaults to `#rust-analyzer.cargo.features#`. Set to `"all"` to pass `--all-features` to Cargo. | `null` |
| `rust-analyzer.check.invocationLocation` | Specifies the working directory for running checks. | `workspace` |
| `rust-analyzer.check.invocationStrategy` | Specifies the invocation strategy to use when running the checkOnSave command. | `per_workspace` |
| `rust-analyzer.check.noDefaultFeatures` | Whether to pass `--no-default-features` to Cargo. Defaults to `#rust-analyzer.cargo.noDefaultFeatures#`. | `null` |
| `rust-analyzer.check.overrideCommand` | Override the command rust-analyzer uses instead of `cargo check` for diagnostics on save. | `null` |
| `rust-analyzer.check.targets` | Check for specific targets. Defaults to `#rust-analyzer.cargo.target#` if empty. | `null` |
| `rust-analyzer.checkOnSave` | Run the check command for diagnostics on save. | `true` |
| `rust-analyzer.completion.autoimport.enable` | Toggles the additional completions that automatically add imports when completed | `true` |
| `rust-analyzer.completion.autoself.enable` | Toggles the additional completions that automatically show method calls and field accesses with `self` prefixed to them when inside a method. | `true` |
| `rust-analyzer.completion.callable.snippets` | Whether to add parenthesis and argument snippets when completing function. | `fill_arguments` |
| `rust-analyzer.completion.limit` | Maximum number of completions to return. If `None`, the limit is infinite. | `null` |
| `rust-analyzer.completion.postfix.enable` | Whether to show postfix snippets like `dbg`, `if`, `not`, etc. | `true` |
| `rust-analyzer.completion.privateEditable.enable` | Enables completions of private items and fields that are defined in the current workspace even if they are not visible at the current position. | `false` |
| `rust-analyzer.completion.snippets.custom` | Custom completion snippets. | |
| `rust-analyzer.debug.runtime` | Choose which debug runtime to use | `termdebug` |
| `rust-analyzer.debug.vimspector.configuration.name` | Specify the name of the vimspector configuration name. The following args will be passed to the configuration: `Executable` and `Args` (both strings) | `launch` |
| `rust-analyzer.debug.nvimdap.configuration.template` | Configuration template used to invoked dap.run([conf](https://github.com/mfussenegger/nvim-dap/blob/0e6b7c47dd70e80793ed39271b2aa712d9366dbc/doc/dap.txt#L656C2-L656C2)). The template will be instantiate like thie: `$exe` will be replaced with executable path, `$args` will be replaced with arguments. An example template: `{ name = \"Debug (with args)\", type = \"codelldb\", request = \"launch\", program = $exe, args = $args, cwd = \"${workspaceFolder}\", stopOnEntry = false, terminal = \"integrated\" }` | `""`|
| `rust-analyzer.diagnostics.disabled` | List of rust-analyzer diagnostics to disable. | `` |
| `rust-analyzer.diagnostics.enable` | Whether to show native rust-analyzer diagnostics. | `true` |
| `rust-analyzer.diagnostics.experimental.enable` | Whether to show experimental rust-analyzer diagnostics that might have more false positives than usual. | `false` |
| `rust-analyzer.diagnostics.remapPrefix` | Map of prefixes to be substituted when parsing diagnostic file paths. This should be the reverse mapping of what is passed to `rustc` as `--remap-path-prefix`. | `{}` |
| `rust-analyzer.diagnostics.warningsAsHint` | List of warnings that should be displayed with hint severity. | `` |
| `rust-analyzer.diagnostics.warningsAsInfo` | List of warnings that should be displayed with info severity. | `` |
| `rust-analyzer.disableProgressNotifications` | Disable initialization and workdone progress notifications | `false` |
| `rust-analyzer.files.excludeDirs` | These directories will be ignored by rust-analyzer. | `` |
| `rust-analyzer.files.watcher` | Controls file watching implementation. | `client` |
| `rust-analyzer.highlightRelated.breakPoints.enable` | Enables highlighting of related references while the cursor is on `break`, `loop`, `while`, or `for` keywords. | `true` |
| `rust-analyzer.highlightRelated.exitPoints.enable` | Enables highlighting of all exit points while the cursor is on any `return`, `?`, `fn`, or return type arrow (`->`). | `true` |
| `rust-analyzer.highlightRelated.references.enable` | Enables highlighting of related references while the cursor is on any identifier. | `true` |
| `rust-analyzer.highlightRelated.yieldPoints.enable` | Enables highlighting of all break points for a loop or block context while the cursor is on any `async` or `await` keywords. | `true` |
| `rust-analyzer.hover.documentation.enable` | Whether to show documentation on hover. | `true` |
| `rust-analyzer.hover.documentation.keywords.enable` | Whether to show keyword hover popups. Only applies when `#rust-analyzer.hover.documentation.enable#` is set. | `true` |
| `rust-analyzer.hover.links.enable` | Use markdown syntax for links in hover. | `true` |
| `rust-analyzer.imports.granularity.enforce` | Whether to enforce the import granularity setting for all files. If set to false rust-analyzer will try to keep import styles consistent per file. | `false` |
| `rust-analyzer.imports.granularity.group` | How imports should be grouped into use statements. | `crate` |
| `rust-analyzer.imports.group.enable` | Group inserted imports by the <https://rust-analyzer.github.io/manual.html#auto-import[following> order]. Groups are separated by newlines. | `true` |
| `rust-analyzer.imports.merge.glob` | Whether to allow import insertion to merge new imports into single path glob imports like `use std::fmt::*;`. | `true` |
| `rust-analyzer.imports.prefer.no.std` | Prefer to unconditionally use imports of the core and alloc crate, over the std crate. | `false` |
| `rust-analyzer.imports.prefix` | The path structure for newly inserted paths to use. | `plain` |
| `rust-analyzer.inlayHints.bindingModeHints.enable` | Whether to show inlay type hints for binding modes. | `false` |
| `rust-analyzer.inlayHints.chainingHints.enable` | Whether to show inlay type hints for method chains. | `true` |
| `rust-analyzer.inlayHints.closingBraceHints.enable` | Whether to show inlay hints after a closing `}` to indicate what item it belongs to. | `true` |
| `rust-analyzer.inlayHints.closingBraceHints.minLines` | Minimum number of lines required before the `}` until the hint is shown (set to 0 or 1 to always show them). | `25` |
| `rust-analyzer.inlayHints.closureReturnTypeHints.enable` | Whether to show inlay type hints for return types of closures. | `never` |
| `rust-analyzer.inlayHints.discriminantHints.enable` | Whether to show enum variant discriminant hints. | `never` |
| `rust-analyzer.inlayHints.expressionAdjustmentHints.enable` | Whether to show inlay hints for type adjustments. | `never` |
| `rust-analyzer.inlayHints.expressionAdjustmentHints.hideOutsideUnsafe` | Whether to hide inlay hints for type adjustments outside of `unsafe` blocks. | `false` |
| `rust-analyzer.inlayHints.expressionAdjustmentHints.mode` | Whether to show inlay hints as postfix ops (`.*` instead of `*`, etc). | `prefix` |
| `rust-analyzer.inlayHints.lifetimeElisionHints.enable` | Whether to show inlay type hints for elided lifetimes in function signatures. | `never` |
| `rust-analyzer.inlayHints.lifetimeElisionHints.useParameterNames` | Whether to prefer using parameter names as the name for elided lifetime hints if possible. | `false` |
| `rust-analyzer.inlayHints.maxLength` | Maximum length for inlay hints. Set to null to have an unlimited length. | `25` |
| `rust-analyzer.inlayHints.parameterHints.enable` | Whether to show function parameter name inlay hints at the call site. | `true` |
| `rust-analyzer.inlayHints.reborrowHints.enable` | Whether to show inlay hints for compiler inserted reborrows. This setting is deprecated in favor of #rust-analyzer.inlayHints.expressionAdjustmentHints.enable#. | `never` |
| `rust-analyzer.inlayHints.renderColons` | Whether to render leading colons for type hints, and trailing colons for parameter hints. | `true` |
| `rust-analyzer.inlayHints.typeHints.enable` | Whether to show inlay type hints for variables. | `true` |
| `rust-analyzer.inlayHints.typeHints.hideClosureInitialization` | Whether to hide inlay type hints for `let` statements that initialize to a closure. Only applies to closures with blocks, same as `#rust-analyzer.inlayHints.closureReturnTypeHints.enable#`. | `false` |
| `rust-analyzer.inlayHints.typeHints.hideNamedConstructor` | Whether to hide inlay type hints for constructors. | `false` |
| `rust-analyzer.joinLines.joinAssignments` | Join lines merges consecutive declaration and initialization of an assignment. | `true` |
| `rust-analyzer.joinLines.joinElseIf` | Join lines inserts else between consecutive ifs. | `true` |
| `rust-analyzer.joinLines.removeTrailingComma` | Join lines removes trailing commas. | `true` |
| `rust-analyzer.joinLines.unwrapTrivialBlock` | Join lines unwraps trivial blocks. | `true` |
| `rust-analyzer.lens.debug.enable` | Whether to show `Debug` lens. Only applies when `#rust-analyzer.lens.enable#` is set. | `true` |
| `rust-analyzer.lens.enable` | Whether to show CodeLens in Rust files. | `true` |
| `rust-analyzer.lens.forceCustomCommands` | Internal config: use custom client-side commands even when the client doesn't set the corresponding capability. | `true` |
| `rust-analyzer.lens.implementations.enable` | Whether to show `Implementations` lens. Only applies when `#rust-analyzer.lens.enable#` is set. | `true` |
| `rust-analyzer.lens.location` | Where to render annotations. | `above_name` |
| `rust-analyzer.lens.references.adt.enable` | Whether to show `References` lens for Struct, Enum, and Union. Only applies when `#rust-analyzer.lens.enable#` is set. | `false` |
| `rust-analyzer.lens.references.enumVariant.enable` | Whether to show `References` lens for Enum Variants. Only applies when `#rust-analyzer.lens.enable#` is set. | `false` |
| `rust-analyzer.lens.references.method.enable` | Whether to show `Method References` lens. Only applies when `#rust-analyzer.lens.enable#` is set. | `false` |
| `rust-analyzer.lens.references.trait.enable` | Whether to show `References` lens for Trait. Only applies when `#rust-analyzer.lens.enable#` is set. | `false` |
| `rust-analyzer.lens.run.enable` | Whether to show `Run` lens. Only applies when `#rust-analyzer.lens.enable#` is set. | `true` |
| `rust-analyzer.linkedProjects` | Disable project auto-discovery in favor of explicitly specified set of projects. | `` |
| `rust-analyzer.lru.capacity` | Number of syntax trees rust-analyzer keeps in memory. Defaults to 128. | `null` |
| `rust-analyzer.notifications.cargoTomlNotFound` | Whether to show `can't find Cargo.toml` error message. | `true` |
| `rust-analyzer.numThreads` | How many worker threads in the main loop. The default `null` means to pick automatically. | `null` |
| `rust-analyzer.procMacro.attributes.enable` | Expand attribute macros. Requires `#rust-analyzer.procMacro.enable#` to be set. | `true` |
| `rust-analyzer.procMacro.enable` | Enable support for procedural macros, implies `#rust-analyzer.cargo.buildScripts.enable#`. | `true` |
| `rust-analyzer.procMacro.ignored` | These proc-macros will be ignored when trying to expand them. | `{}` |
| `rust-analyzer.procMacro.server` | Internal config, path to proc-macro server executable (typically, this is rust-analyzer itself, but we override this in tests). | `null` |
| `rust-analyzer.references.excludeImports` | Exclude imports from find-all-references. | `false` |
| `rust-analyzer.restartServerOnConfigChange` | Whether to restart the server automatically when certain settings that require a restart are changed. | `false` |
| `rust-analyzer.runnables.command` | Command to be executed instead of 'cargo' for runnables. | `null` |
| `rust-analyzer.runnables.extraArgs` | Additional arguments to be passed to cargo for runnables such as tests or binaries. For example, it may be `--release`. | `` |
| `rust-analyzer.rustc.source` | Path to the Cargo.toml of the rust compiler workspace, for usage in rustc_private projects, or "discover" to try to automatically find it if the `rustc-dev` component is installed. | `null` |
| `rust-analyzer.rustfmt.extraArgs` | Additional arguments to `rustfmt`. | `` |
| `rust-analyzer.rustfmt.overrideCommand` | Advanced option, fully override the command rust-analyzer uses for formatting. | `null` |
| `rust-analyzer.rustfmt.rangeFormatting.enable` | Enables the use of rustfmt's unstable range formatting command for the `textDocument/rangeFormatting` request. The rustfmt option is unstable and only available on a nightly build. | `false` |
| `rust-analyzer.semanticHighlighting.doc.comment.inject.enable` | Inject additional highlighting into doc comments. | `true` |
| `rust-analyzer.semanticHighlighting.operator.enable` | Use semantic tokens for operators. | `true` |
| `rust-analyzer.semanticHighlighting.operator.specialization.enable` | Use specialized semantic tokens for operators. | `false` |
| `rust-analyzer.semanticHighlighting.punctuation.enable` | Use semantic tokens for punctuations. | `false` |
| `rust-analyzer.semanticHighlighting.punctuation.separate.macro.bang` | When enabled, rust-analyzer will emit a punctuation semantic token for the `!` of macro calls. | `false` |
| `rust-analyzer.semanticHighlighting.punctuation.specialization.enable` | Use specialized semantic tokens for punctuations. | `false` |
| `rust-analyzer.semanticHighlighting.strings.enable` | Use semantic tokens for strings. | `true` |
| `rust-analyzer.server.extraEnv` | Extra environment variables that will be passed to the rust-analyzer executable. Useful for passing e.g. `RA_LOG` for debugging. | `null` |
| `rust-analyzer.server.path` | Path to rust-analyzer executable (points to bundled binary by default). If this is set, then "rust-analyzer.updates.channel" setting is not used | `null` |
| `rust-analyzer.signatureInfo.detail` | Show full signature of the callable. Only shows parameters if disabled. | `full` |
| `rust-analyzer.signatureInfo.documentation.enable` | Show documentation. | `true` |
| `rust-analyzer.terminal.startinsert` | Enter insert mode after terminal displayed | `false` |
| `rust-analyzer.trace.server` | Trace requests to the rust-analyzer | `off` |
| `rust-analyzer.typing.autoClosingAngleBrackets.enable` | Whether to insert closing angle brackets when typing an opening angle bracket of a generic argument list. | `false` |
| `rust-analyzer.updates.channel` | Choose `"nightly"` updates to get the latest features and bug fixes every day. While `"stable"` releases occur weekly and don't contain cutting-edge features from VSCode proposed APIs | `stable` |
| `rust-analyzer.updates.checkOnStartup` | Auto-check rust-analyzer updates on startup | `true` |
| `rust-analyzer.updates.prompt` | Prompt the user before downloading rust-analyzer | `true` |
| `rust-analyzer.workspace.symbol.search.kind` | Workspace symbol search kind. | `only_types` |
| `rust-analyzer.workspace.symbol.search.limit` | Limits the number of items returned from a workspace symbol search (Defaults to 128). | `128` |
| `rust-analyzer.workspace.symbol.search.scope` | Workspace symbol search scope. | `workspace` |

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
| rust-analyzer.testCurrent | Test Current |
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
