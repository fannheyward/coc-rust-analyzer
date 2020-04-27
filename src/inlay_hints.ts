import { workspace, Disposable } from 'coc.nvim';
import { Ctx, RustDocument, isRustDocument } from './ctx';
import * as ra from './rust-analyzer-api';
import { CancellationTokenSource, DidChangeTextDocumentParams } from 'vscode-languageserver-protocol';

// const chainingHints = {
//   decorationType: vscode.window.createTextEditorDecorationType({
//     after: {
//       color: new vscode.ThemeColor('rust_analyzer.inlayHint'),
//       fontStyle: 'normal',
//     },
//   }),

//   toDecoration(hint: ra.InlayHint.ChainingHint, conv: lc.Protocol2CodeConverter): vscode.DecorationOptions {
//     return {
//       range: conv.asRange(hint.range),
//       renderOptions: { after: { contentText: ` ${hint.label}` } },
//     };
//   },
// };

class HintsUpdater implements Disposable {
  private sourceFiles = new Map<string, RustSourceFile>(); // map Uri -> RustSourceFile
  private readonly disposables: Disposable[] = [];

  constructor(private readonly ctx: Ctx) {
    workspace.onDidChangeTextDocument(this.onDidChangeTextDocument, this, this.disposables);

    // Set up initial cache shape
    workspace.documents.forEach((doc) => {
      this.sourceFiles.set(doc.uri, { document: doc.textDocument as RustDocument, inlaysRequest: null, cachedDecorations: null });
    });

    this.syncCacheAndRenderHints();
  }

  dispose() {
    this.sourceFiles.forEach((file) => file.inlaysRequest?.cancel());
    // this.ctx.visibleRustEditors.forEach((editor) => this.renderDecorations(editor, { param: [], type: [], chaining: [] }));
    this.disposables.forEach((d) => d.dispose());
  }

  onDidChangeTextDocument({ textDocument, contentChanges }: DidChangeTextDocumentParams) {
    // if (contentChanges.length === 0 || !isRustDocument(textDocument)) return;
    this.syncCacheAndRenderHints();
  }

  syncCacheAndRenderHints() {
    // FIXME: make inlayHints request pass an array of files?
    this.sourceFiles.forEach((file, uri) =>
      this.fetchHints(file).then((hints) => {
        if (!hints) return;

        file.cachedDecorations = this.hintsToDecorations(hints);

        for (const doc of workspace.documents) {
          if (doc.uri === uri) {
            this.renderDecorations(file.cachedDecorations);
          }
        }
      })
    );
  }

  onDidChangeVisibleTextEditors() {
    const newSourceFiles = new Map<string, RustSourceFile>();

    // Rerendering all, even up-to-date editors for simplicity
    // this.ctx.visibleRustEditors.forEach(async (editor) => {
    //   const uri = editor.document.uri.toString();
    //   const file = this.sourceFiles.get(uri) ?? {
    //     document: editor.document,
    //     inlaysRequest: null,
    //     cachedDecorations: null,
    //   };
    //   newSourceFiles.set(uri, file);

    //   // No text documents changed, so we may try to use the cache
    //   if (!file.cachedDecorations) {
    //     const hints = await this.fetchHints(file);
    //     if (!hints) return;

    //     file.cachedDecorations = this.hintsToDecorations(hints);
    //   }

    //   this.renderDecorations(file.cachedDecorations);
    // });
    // workspace;

    // // Cancel requests for no longer visible (disposed) source files
    // this.sourceFiles.forEach((file, uri) => {
    //   if (!newSourceFiles.has(uri)) file.inlaysRequest?.cancel();
    // });

    // this.sourceFiles = newSourceFiles;
  }

  private renderDecorations(decorations: InlaysDecorations) {
    // editor.setDecorations(chainingHints.decorationType, decorations.chaining);
  }

  private hintsToDecorations(hints: ra.InlayHint[]): InlaysDecorations {
    const decorations: InlaysDecorations = { type: [], param: [], chaining: [] };
    // const conv = this.ctx.client.protocol2CodeConverter;

    // for (const hint of hints) {
    //   switch (hint.kind) {
    //     case ra.InlayHint.Kind.TypeHint: {
    //       decorations.type.push(typeHints.toDecoration(hint, conv));
    //       continue;
    //     }
    //     case ra.InlayHint.Kind.ParamHint: {
    //       decorations.param.push(paramHints.toDecoration(hint, conv));
    //       continue;
    //     }
    //     case ra.InlayHint.Kind.ChainingHint: {
    //       decorations.chaining.push(chainingHints.toDecoration(hint, conv));
    //       continue;
    //     }
    //   }
    // }
    return decorations;
  }

  private async fetchHints(file: RustSourceFile): Promise<null | ra.InlayHint[]> {
    file.inlaysRequest?.cancel();

    const tokenSource = new CancellationTokenSource();
    file.inlaysRequest = tokenSource;

    const request = { textDocument: { uri: file.document.uri.toString() } };

    // return sendRequestWithRetry(this.ctx.client, ra.inlayHints, request, tokenSource.token)
    //   .catch((_) => null)
    //   .finally(() => {
    //     if (file.inlaysRequest === tokenSource) {
    //       file.inlaysRequest = null;
    //     }
    //   });
    return this.ctx.client
      .sendRequest(ra.inlayHints, request, tokenSource.token)
      .catch((_) => null)
      .finally(() => {
        if (file.inlaysRequest === tokenSource) {
          file.inlaysRequest = null;
        }
      });
  }
}

interface InlaysDecorations {
  type: any[];
  param: any[];
  chaining: any[];
}

interface RustSourceFile {
  /**
   * Source of the token to cancel in-flight inlay hints request if any.
   */
  inlaysRequest: null | CancellationTokenSource;
  /**
   * Last applied decorations.
   */
  cachedDecorations: null | InlaysDecorations;

  document: RustDocument;
}

export function activateInlayHints(ctx: Ctx) {
  const maybeUpdater = {
    updater: null as null | HintsUpdater,
    async onConfigChange() {
      if (!ctx.config.inlayHints.chainingHints) {
        return this.dispose();
      }
      // await sleep(100);
      if (this.updater) {
        this.updater.syncCacheAndRenderHints();
      } else {
        this.updater = new HintsUpdater(ctx);
      }
    },
    dispose() {
      this.updater?.dispose();
      this.updater = null;
    },
  };

  // ctx.pushCleanup(maybeUpdater);

  workspace.onDidChangeConfiguration(maybeUpdater.onConfigChange, maybeUpdater, ctx.subscriptions);

  maybeUpdater.onConfigChange();
}
