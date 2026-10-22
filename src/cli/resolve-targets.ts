import fg from 'fast-glob';
import { DEFAULT_IGNORES, DEFAULT_PATTERNS } from '../shared/constants';

export const resolveTargets = async (patterns: string[]): Promise<string[]> => {
  const activePatterns = patterns.length > 0 ? patterns : DEFAULT_PATTERNS;

  return fg(activePatterns, {
    ignore: DEFAULT_IGNORES,
    onlyFiles: true,
    unique: true,
    dot: false,
  });
};
