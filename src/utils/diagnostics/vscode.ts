import { Diagnostic } from 'vscode-languageserver-protocol';

/** Compares two `vscode.Diagnostic`s for equality */
export function areDiagnosticsEqual(left: Diagnostic, right: Diagnostic): boolean {
  return (
    left.source === right.source &&
    left.severity === right.severity &&
    left.range.start.line === right.range.start.line &&
    left.range.end.line === right.range.end.line &&
    left.message === right.message
  );
}
