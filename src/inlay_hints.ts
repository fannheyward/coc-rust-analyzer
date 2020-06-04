import { Disposable, Document, events, workspace } from 'coc.nvim';
import { CancellationTokenSource } from 'vscode-languageserver-protocol';
import { Ctx, isRustDocument, RustDocument } from './ctx';
import * as ra from './lsp_ext';

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

  document: RustDocument;
}

class HintsUpdater implements Disposable {
  private sourceFiles = new Map<string, RustSourceFile>(); // map Uri -> RustSourceFile
  private readonly disposables: Disposable[] = [];
  private chainingHintNS = workspace.createNameSpace('rust-chaining-hint');
  private chainingHintShowing = true;

  constructor(private readonly ctx: Ctx) {
    // Set up initial cache shape
    workspace.documents.forEach((doc) => {
      if (isRustDocument(doc.textDocument)) {
        doc.buffer.clearNamespace(this.chainingHintNS);
        this.sourceFiles.set(doc.uri, { document: doc.textDocument, inlaysRequest: null });
      }
    });

    events.on('InsertLeave', async (bufnr) => {
      const doc = workspace.getDocument(bufnr);
      if (isRustDocument(doc.textDocument)) {
        doc.buffer.clearNamespace(this.chainingHintNS);
        this.syncAndRenderHints();
      }
    });

    workspace.onDidChangeTextDocument(
      (e) => {
        const doc = workspace.getDocument(e.bufnr);
        if (isRustDocument(doc.textDocument)) {
          doc.buffer.clearNamespace(this.chainingHintNS);
          if (workspace.insertMode && !this.ctx.config.inlayHints.refreshOnInsertMode) {
            return;
          }
          this.syncAndRenderHints();
        }
      },
      this,
      this.disposables
    );

    workspace.onDidOpenTextDocument(
      (e) => {
        if (isRustDocument(e)) {
          const file = this.sourceFiles.get(e.uri) ?? {
            document: e,
            inlaysRequest: null,
          };
          this.sourceFiles.set(e.uri, file);

          const doc = workspace.getDocument(e.uri);
          doc.buffer.clearNamespace(this.chainingHintNS);
          this.syncAndRenderHints();
        }
      },
      this,
      this.disposables
    );

    this.syncAndRenderHints();
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
      this.syncAndRenderHints();
    }
  }

  async syncAndRenderHints() {
    const current = await workspace.document;
    // FIXME: make inlayHints request pass an array of files?
    this.sourceFiles.forEach((file, uri) =>
      this.fetchHints(file).then(async (hints) => {
        if (!hints) return;

        if (current && current.uri === uri && isRustDocument(current.textDocument)) {
          const decorations = this.hintsToDecorations(hints);
          this.renderDecorations(current, decorations);
        }
      })
    );
  }

  private async renderDecorations(doc: Document, decorations: InlaysDecorations) {
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
        this.updater.syncAndRenderHints();
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
