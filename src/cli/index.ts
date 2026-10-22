#!/usr/bin/env node
import { formatFile } from '../formatter/format-file';
import { parseArgs } from './parse-args';
import { resolveTargets } from './resolve-targets';

const run = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const targets = await resolveTargets(options.patterns);
  let changedFiles = 0;

  for (const target of targets) {
    const result = await formatFile(target, options.write);

    if (result.changed) {
      changedFiles += 1;
      const label = options.write ? 'updated' : 'needs format';
      process.stdout.write(`${label}: ${target}\n`);
    }
  }

  if (options.check && changedFiles > 0) {
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`processed ${targets.length} files\n`);
};

void run();
