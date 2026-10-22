import type { LineEdit } from '../shared/types';

const getBreak = (source: string): string => (source.includes('\r\n') ? '\r\n' : '\n');

const normalizeEdits = (edits: LineEdit[]): LineEdit[] => {
  const unique = new Map<string, LineEdit>();

  for (const edit of edits) {
    const key = `${edit.afterLine}:${edit.beforeLine}`;
    unique.set(key, edit);
  }

  return [...unique.values()].sort((left, right) => right.afterLine - left.afterLine);
};

export const applyLineEdits = (source: string, edits: LineEdit[]): string => {
  if (edits.length === 0) {
    return source;
  }

  const lineBreak = getBreak(source);
  const hasTrailingBreak = source.endsWith(lineBreak);
  const lines = source.split(/\r?\n/);

  for (const edit of normalizeEdits(edits)) {
    const replaceFrom = edit.afterLine;
    const replaceCount = Math.max(0, edit.beforeLine - edit.afterLine - 1);
    const replacement = Array.from({ length: edit.blankLines }, () => '');
    lines.splice(replaceFrom, replaceCount, ...replacement);
  }

  const output = lines.join(lineBreak);
  return hasTrailingBreak && !output.endsWith(lineBreak) ? `${output}${lineBreak}` : output;
};
