import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
const cliPath = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
const entryPath = join(process.cwd(), 'src', 'cli', 'index.ts');

const createTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'custom-formatter-'));
  tempDirs.push(dir);
  return dir;
};

const writeTempFile = (dir: string, relativePath: string, content: string): string => {
  const filePath = join(dir, relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  return filePath;
};

const runCli = (args: string[], cwd: string) => {
  return spawnSync(process.execPath, [cliPath, entryPath, ...args], {
    cwd,
    encoding: 'utf8',
  });
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, {
      recursive: true,
      force: true,
    });
  }
});

describe('cli integration', () => {
  it('returns exit code 1 in check mode when a file needs formatting', () => {
    const dir = createTempDir();
    writeTempFile(dir, 'sample.tsx', 'const view = (<div>\n  <A />\n  <B />\n</div>);\n');

    const result = runCli(['--check', '*.tsx'], dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('needs format');
  });

  it('writes changes in write mode', () => {
    const dir = createTempDir();
    const filePath = writeTempFile(dir, 'sample.tsx', 'const view = (<div>\n  <A />\n  <B />\n</div>);\n');

    execFileSync(process.execPath, [cliPath, entryPath, '--write', '*.tsx'], {
      cwd: dir,
      encoding: 'utf8',
    });

    expect(readFileSync(filePath, 'utf8')).toContain('<A />\n\n  <B />');
  });

  it('scans the project when no pattern is passed', () => {
    const dir = createTempDir();
    writeTempFile(dir, 'nested/sample.tsx', 'const view = (<div>\n  {title}\n  <B />\n</div>);\n');

    const result = runCli(['--check'], dir);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('nested/sample.tsx');
  });
});
