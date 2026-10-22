import { readFile, writeFile } from 'node:fs/promises';
import { formatText } from './format-text';
import type { FormatResult } from '../shared/types';

export const formatFile = async (filePath: string, write: boolean): Promise<FormatResult> => {
  const source = await readFile(filePath, 'utf8');
  const result = formatText(source);

  if (write && result.changed) {
    await writeFile(filePath, result.output, 'utf8');
  }

  return result;
};
