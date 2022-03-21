import { CancellationTokenSource, Disposable, Document, events, workspace } from 'coc.nvim';
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

export class HintsUpdater implements Disposable {
  private readonly disposables: Disposable[] = [];
  private sourceFiles = new Map<string, RustSourceFile>();
  private inlayHintsNS = workspace.createNameSpace('rust-inlay-hint');
  private inlayHintsEnabled: boolean;

  constructor(private readonly ctx: Ctx) {
    this.inlayHintsEnabled = !!this.ctx.config.inlayHints.enable;
  }

  dispose() {
    this.sourceFiles.forEach((file) => file.inlaysRequest?.cancel());
    this.disposables.forEach((d) => d.dispose());
  }

  async activate() {
    events.on('InsertLeave', async (bufnr) => {
      const doc = workspace.getDocument(bufnr);
      if (doc && isRustDocument(doc.textDocument)) {
        this.syncAndRenderHints(doc);
      }
    });

    workspace.onDidChangeTextDocument(
      (e) => {
        const doc = workspace.getDocument(e.bufnr);
        if (doc && isRustDocument(doc.textDocument)) {
          if (events.insertMode && !this.ctx.config.inlayHints.refreshOnInsertMode) {
            return;
          }
          this.syncAndRenderHints(doc);
        }
      },
      this,
      this.disposables
    );

    workspace.onDidOpenTextDocument(
      (e) => {
        if (e && isRustDocument(e)) {
          const doc = workspace.getDocument(e.uri);
          this.syncAndRenderHints(doc);
        }
      },
      this,
      this.disposables
    );

    const current = await workspace.document;
    if (isRustDocument(current.textDocument)) {
      this.syncAndRenderHints(current);
    }
  }

  async toggle() {
    if (this.inlayHintsEnabled) {
      this.inlayHintsEnabled = false;

      const doc = await workspace.document;
      if (!doc) return;

      doc.buffer.clearNamespace(this.inlayHintsNS);
    } else {
      this.inlayHintsEnabled = true;
      await this.activate();
    }
  }

  private async syncAndRenderHints(doc: Document) {
    if (!this.inlayHintsEnabled) return;
    if (doc && isRustDocument(doc.textDocument)) {
      const file = this.sourceFiles.get(doc.uri) || {
        document: doc.textDocument,
        inlaysRequest: null,
      };
      this.fetchHints(file).then(async (hints) => {
        if (!hints) return;

        this.renderHints(doc, hints);
      });
    }
  }

  private async renderHints(doc: Document, hints: ra.InlayHint[]) {
    const decorations: InlaysDecorations = {
      type: [],
      param: [],
      chaining: [],
    };
    for (const hint of hints) {
      switch (hint.kind) {
        case ra.InlayHintKind.Type:
          decorations.type.push(hint);
          break;
        case ra.InlayHintKind.Parameter:
          decorations.param.push(hint);
          break;
        case null:
          decorations.chaining.push(hint);
          break;
        default:
          continue;
      }
    }

    doc.buffer.clearNamespace(this.inlayHintsNS);
    const chaining_hints = {};
    const split: [string, string] = [' ', 'Normal'];
    if (this.ctx.config.inlayHints.typeHints) {
      const sep = this.ctx.config.inlayHints.typeHintsSeparator;
      for (const item of decorations.type) {
        let label = typeof item.label === 'string' ? item.label : item.label[0].value;
        if (label.startsWith(': ')) label = label.replace(': ', '');
        const chunks: [[string, string]] = [[`${sep}${label}`, 'CocRustTypeHint']];
        if (chaining_hints[item.position.line] === undefined) {
          chaining_hints[item.position.line] = chunks;
        } else {
          chaining_hints[item.position.line].push(split);
          chaining_hints[item.position.line].push(chunks[0]);
        }
      }
    }
    if (this.ctx.config.inlayHints.chainingHints) {
      const sep = this.ctx.config.inlayHints.chainingHintsSeparator;
      for (const item of decorations.chaining) {
        const label = typeof item.label === 'string' ? item.label : item.label[0].value;
        const chunks: [[string, string]] = [[`${sep}${label}`, 'CocRustChainingHint']];
        if (chaining_hints[item.position.line] === undefined) {
          chaining_hints[item.position.line] = chunks;
        } else {
          chaining_hints[item.position.line].push(split);
          chaining_hints[item.position.line].push(chunks[0]);
        }
      }
    }
    Object.keys(chaining_hints).forEach((line) => {
      doc.buffer.setVirtualText(this.inlayHintsNS, Number(line), chaining_hints[line], {});
    });
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
