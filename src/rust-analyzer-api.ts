/**
 * This file mirrors `crates/rust-analyzer/src/req.rs` declarations.
 */

import {
  Location,
  NotificationType,
  Position,
  Range,
  RequestType,
  TextDocumentIdentifier,
  TextDocumentPositionParams,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver-protocol';

type Option<T> = null | T;
type Vec<T> = T[];
type FxHashMap<K extends PropertyKey, V> = Record<K, V>;

function request<TParams, TResult>(method: string) {
  return new RequestType<TParams, TResult, unknown>(`rust-analyzer/${method}`);
}
function notification<TParam>(method: string) {
  return new NotificationType<TParam>(method);
}

export const analyzerStatus = request<null, string>('analyzerStatus');

export const collectGarbage = request<null, null>('collectGarbage');

export interface SyntaxTreeParams {
  textDocument: TextDocumentIdentifier;
  range: Option<Range>;
}
export const syntaxTree = request<SyntaxTreeParams, string>('syntaxTree');

export interface ExpandMacroParams {
  textDocument: TextDocumentIdentifier;
  position: Option<Position>;
}
export interface ExpandedMacro {
  name: string;
  expansion: string;
}
export const expandMacro = request<ExpandMacroParams, Option<ExpandedMacro>>('expandMacro');

export interface MatchingBraceParams {
  textDocument: TextDocumentIdentifier;
  positions: Position[];
}
export const matchingBrace = new RequestType<MatchingBraceParams, Position[], unknown>('experimental/matchingBrace');

export interface PublishDecorationsParams {
  uri: string;
  decorations: Vec<Decoration>;
}
export interface Decoration {
  range: Range;
  tag: string;
  bindingHash: Option<string>;
}
export const decorationsRequest = request<TextDocumentIdentifier, Vec<Decoration>>('decorationsRequest');

export const parentModule = request<TextDocumentPositionParams, Vec<Location>>('parentModule');

export interface JoinLinesParams {
  textDocument: TextDocumentIdentifier;
  ranges: Range[];
}
export const joinLines = new RequestType<JoinLinesParams, TextEdit[], unknown>('experimental/joinLines');

export const onEnter = request<TextDocumentPositionParams, Option<SourceChange>>('onEnter');

export interface RunnablesParams {
  textDocument: TextDocumentIdentifier;
  position: Option<Position>;
}
export interface Runnable {
  range: Range;
  label: string;
  bin: string;
  args: Vec<string>;
  extraArgs: Vec<string>;
  env: FxHashMap<string, string>;
  cwd: Option<string>;
}
export const runnables = request<RunnablesParams, Vec<Runnable>>('runnables');

export type InlayHint = InlayHint.TypeHint | InlayHint.ParamHint | InlayHint.ChainingHint;

export namespace InlayHint {
  export const enum Kind {
    TypeHint = 'TypeHint',
    ParamHint = 'ParameterHint',
    ChainingHint = 'ChainingHint',
  }
  interface Common {
    range: Range;
    label: string;
  }
  export type TypeHint = Common & { kind: Kind.TypeHint };
  export type ParamHint = Common & { kind: Kind.ParamHint };
  export type ChainingHint = Common & { kind: Kind.ChainingHint };
}
export interface InlayHintsParams {
  textDocument: TextDocumentIdentifier;
}
export const inlayHints = request<InlayHintsParams, Vec<InlayHint>>('inlayHints');

export interface SsrParams {
  query: string;
  parseOnly: boolean;
}
export const ssr = new RequestType<SsrParams, WorkspaceEdit, unknown>('experimental/ssr');

export const publishDecorations = notification<PublishDecorationsParams>('publishDecorations');

export interface SourceChange {
  label: string;
  workspaceEdit: WorkspaceEdit;
  cursorPosition: Option<TextDocumentPositionParams>;
}
