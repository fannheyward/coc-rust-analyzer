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

export class HintsUpdater implements Disposable {
  private readonly disposables: Disposable[] = [];
  private inlayHintsNS = workspace.createNameSpace('rust-inlay-hint');
  private inlayHintsEnabled: boolean;

  constructor(private readonly ctx: Ctx) {
    this.inlayHintsEnabled = !!this.ctx.config.inlayHints.enable;
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
  }

  async activate() {
    events.on('InsertLeave', async (bufnr) => {
      const doc = workspace.getDocument(bufnr);
      if (doc && isRustDocument(doc.textDocument)) {
        doc.buffer.clearNamespace(this.inlayHintsNS);
        this.syncAndRenderHints(doc);
      }
    });

    workspace.onDidChangeTextDocument(
      (e) => {
        const doc = workspace.getDocument(e.bufnr);
        if (doc && isRustDocument(doc.textDocument)) {
          doc.buffer.clearNamespace(this.inlayHintsNS);
          if (workspace.insertMode && !this.ctx.config.inlayHints.refreshOnInsertMode) {
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
          doc.buffer.clearNamespace(this.inlayHintsNS);
          this.syncAndRenderHints(doc);
        }
      },
      this,
      this.disposables
    );

    const current = await workspace.document;
    if (isRustDocument(current.textDocument)) {
      current.buffer.clearNamespace(this.inlayHintsNS);
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

  async syncAndRenderHints(doc: Document) {
    if (!this.inlayHintsEnabled) return;
    if (doc && isRustDocument(doc.textDocument)) {
      const file: RustSourceFile = { document: doc.textDocument, inlaysRequest: null };
      this.fetchHints(file).then(async (hints) => {
        if (!hints) return;

        this.renderHints(doc, hints);
      });
    }
  }

  private async renderHints(doc: Document, hints: ra.InlayHint[]) {
    const decorations: InlaysDecorations = { type: [], param: [], chaining: [] };
    for (const hint of hints) {
      switch (hint.kind) {
        case ra.InlayHint.Kind.TypeHint:
          decorations.type.push(hint);
          break;
        case ra.InlayHint.Kind.ChainingHint:
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
        const sn_start = item.range.start.character;
        const sn_end = item.range.end.character;
        const line = doc.getline(item.range.start.line);
        const symbol_name = line.substring(sn_start, sn_end);
        const chunks: [[string, string]] = [[`${sep}${symbol_name}: ${item.label}`, 'CocRustTypeHint']];
        if (chaining_hints[item.range.end.line] === undefined) {
          chaining_hints[item.range.end.line] = chunks;
        } else {
          chaining_hints[item.range.end.line].push(split);
          chaining_hints[item.range.end.line].push(chunks[0]);
        }
        doc.buffer.setVirtualText(this.inlayHintsNS, item.range.end.line, chaining_hints[item.range.end.line], {});
      }
    }
    if (this.ctx.config.inlayHints.chainingHints) {
      const sep = this.ctx.config.inlayHints.chainingHintsSeparator;
      for (const item of decorations.chaining) {
        const chunks: [[string, string]] = [[`${sep}${item.label}`, 'CocRustChainingHint']];
        if (chaining_hints[item.range.end.line] === undefined) {
          chaining_hints[item.range.end.line] = chunks;
        } else {
          chaining_hints[item.range.end.line].push(split);
          chaining_hints[item.range.end.line].push(chunks[0]);
        }
        doc.buffer.setVirtualText(this.inlayHintsNS, item.range.end.line, chaining_hints[item.range.end.line], {});
      }
    }
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
