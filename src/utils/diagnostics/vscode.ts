import { Diagnostic } from 'vscode-languageserver-protocol';

/** Compares two `vscode.Diagnostic`s for equality */
export function areDiagnosticsEqual(left: Diagnostic, right: Diagnostic): boolean {
  return (
    left.source === right.source &&
    left.severity === right.severity &&
    left.range.start === right.range.start &&
    left.range.end === right.range.end &&
    left.message === right.message
  );
}
