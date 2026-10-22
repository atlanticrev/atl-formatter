import type { CliOptions } from '../shared/types';

export const parseArgs = (argv: string[]): CliOptions => {
  const patterns: string[] = [];
  let check = false;
  let write = false;

  for (const arg of argv) {
    if (arg === '--check') {
      check = true;
      continue;
    }

    if (arg === '--write') {
      write = true;
      continue;
    }

    patterns.push(arg);
  }

  if (!check && !write) {
    check = true;
  }

  return {
    check,
    write,
    patterns,
  };
};
