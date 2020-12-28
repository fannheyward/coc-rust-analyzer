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
  private sourceFiles = new Map<string, RustSourceFile>(); // map Uri -> RustSourceFile
  private readonly disposables: Disposable[] = [];
  private inlayHintsNS = workspace.createNameSpace('rust-inlay-hint');
  private inlayHintsEnabled = true;

  constructor(private readonly ctx: Ctx) {
    // Set up initial cache shape
    workspace.documents.forEach((doc) => {
      if (doc && isRustDocument(doc.textDocument)) {
        doc.buffer.clearNamespace(this.inlayHintsNS);
        this.sourceFiles.set(doc.uri, { document: doc.textDocument, inlaysRequest: null });
      }
    });

    events.on('InsertLeave', async (bufnr) => {
      const doc = workspace.getDocument(bufnr);
      if (doc && isRustDocument(doc.textDocument)) {
        doc.buffer.clearNamespace(this.inlayHintsNS);
        this.syncAndRenderHints();
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
          this.syncAndRenderHints();
        }
      },
      this,
      this.disposables
    );

    workspace.onDidOpenTextDocument(
      (e) => {
        if (e && isRustDocument(e)) {
          const file = this.sourceFiles.get(e.uri) ?? {
            document: e,
            inlaysRequest: null,
          };
          this.sourceFiles.set(e.uri, file);

          const doc = workspace.getDocument(e.uri);
          doc.buffer.clearNamespace(this.inlayHintsNS);
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
    if (this.inlayHintsEnabled) {
      this.inlayHintsEnabled = false;

      const doc = await workspace.document;
      if (!doc) return;

      doc.buffer.clearNamespace(this.inlayHintsNS);
    } else {
      this.inlayHintsEnabled = true;
      this.syncAndRenderHints();
    }
  }

  async syncAndRenderHints() {
    if (!this.inlayHintsEnabled) return;
    const current = await workspace.document;
    this.sourceFiles.forEach((file, uri) =>
      this.fetchHints(file).then(async (hints) => {
        if (!hints) return;

        if (current && current.uri === uri && isRustDocument(current.textDocument)) {
          this.renderHints(current, hints);
        }
      })
    );
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
