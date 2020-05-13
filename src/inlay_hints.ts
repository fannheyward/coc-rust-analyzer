import { Disposable, workspace } from 'coc.nvim';
import { CancellationTokenSource } from 'vscode-languageserver-protocol';
import { Ctx, isRustDocument, RustDocument } from './ctx';
import * as ra from './rust-analyzer-api';

interface InlaysDecorations {
  type: ra.InlayHint[];
  param: ra.InlayHint[];
  chaining: ra.InlayHint[];
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

class HintsUpdater implements Disposable {
  private sourceFiles = new Map<string, RustSourceFile>(); // map Uri -> RustSourceFile
  private readonly disposables: Disposable[] = [];
  private chainingHintNS = workspace.createNameSpace('rust-chaining-hint');
  private chainingHintShowing = true;

  constructor(private readonly ctx: Ctx) {
    workspace.onDidChangeTextDocument(
      async (e) => {
        const doc = workspace.getDocument(e.bufnr);
        if (isRustDocument(doc.textDocument)) {
          doc.buffer.clearNamespace(this.chainingHintNS);
          this.syncCacheAndRenderHints();
        }
      },
      this,
      this.disposables
    );

    // Set up initial cache shape
    workspace.documents.forEach((doc) => {
      if (isRustDocument(doc.textDocument)) {
        doc.buffer.clearNamespace(this.chainingHintNS);
        this.sourceFiles.set(doc.uri, { document: doc.textDocument, inlaysRequest: null, cachedDecorations: null });
      }
    });

    this.syncCacheAndRenderHints();
  }

  dispose() {
    this.sourceFiles.forEach((file) => file.inlaysRequest?.cancel());
    this.disposables.forEach((d) => d.dispose());
  }

  async toggle() {
    if (this.chainingHintShowing) {
      this.chainingHintShowing = false;
      this.dispose();

      const doc = await workspace.document;
      if (!doc) return;

      doc.buffer.clearNamespace(this.chainingHintNS);
    } else {
      this.chainingHintShowing = true;
      this.syncCacheAndRenderHints();
    }
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

  private async renderDecorations(decorations: InlaysDecorations) {
    const doc = await workspace.document;
    if (!doc) return;

    doc.buffer.clearNamespace(this.chainingHintNS);
    for (const item of decorations.chaining) {
      doc.buffer.setVirtualText(this.chainingHintNS, item.range.end.line, [[item.label, 'CocRustChainingHint']], {}).logError();
    }
  }

  private hintsToDecorations(hints: ra.InlayHint[]): InlaysDecorations {
    const decorations: InlaysDecorations = { type: [], param: [], chaining: [] };
    for (const hint of hints) {
      // ChainingHint only now
      if (hint.kind === ra.InlayHint.Kind.ChainingHint) {
        decorations.chaining.push(hint);
      }
    }

    return decorations;
  }

  private async fetchHints(file: RustSourceFile): Promise<null | ra.InlayHint[]> {
    file.inlaysRequest?.cancel();

    const tokenSource = new CancellationTokenSource();
    file.inlaysRequest = tokenSource;

    const param = { textDocument: { uri: file.document.uri.toString() } };
    return this.ctx
      .sendRequestWithRetry(ra.inlayHints, param, tokenSource.token)
      .catch(() => null)
      .finally(() => {
        if (file.inlaysRequest === tokenSource) {
          file.inlaysRequest = null;
        }
      });
  }
}

export function activateInlayHints(ctx: Ctx) {
  const maybeUpdater = {
    updater: null as null | HintsUpdater,
    async onConfigChange() {
      if (!ctx.config.inlayHints.chainingHints) {
        return this.dispose();
      }

      await ctx.sleep(100);
      await workspace.nvim.command('hi default link CocRustChainingHint CocHintSign');
      if (this.updater) {
        this.updater.syncCacheAndRenderHints();
      } else {
        this.updater = new HintsUpdater(ctx);
      }
    },
    toggle() {
      this.updater?.toggle();
    },
    dispose() {
      this.updater?.dispose();
      this.updater = null;
    },
  };

  ctx.pushCleanup(maybeUpdater);

  workspace.onDidChangeConfiguration(maybeUpdater.onConfigChange, maybeUpdater, ctx.subscriptions);
  maybeUpdater.onConfigChange();
}
