import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatText } from '../src';

const readFixture = (group: string, name: string, kind: 'input' | 'output'): string => {
  const fileName = `${name}.${kind}.${group === 'mixed' ? 'tsx' : group === 'jsx' ? 'tsx' : 'ts'}`;
  return readFileSync(join(process.cwd(), 'tests', 'fixtures', group, fileName), 'utf8');
};

const runFixture = (group: string, name: string): void => {
  const input = readFixture(group, name, 'input');
  const output = readFixture(group, name, 'output');
  expect(formatText(input).output).toBe(output);
};

describe('formatText', () => {
  it('formats jsx sibling elements', () => runFixture('jsx', 'elements'));
  it('formats jsx comments on both sides', () => runFixture('jsx', 'comments'));
  it('formats jsx expressions as standalone blocks', () => runFixture('jsx', 'expressions'));
  it('formats standalone text nodes as blocks', () => runFixture('jsx', 'text'));
  it('formats fragments and nested jsx children', () => runFixture('jsx', 'fragment'));
  it('formats member access and inline jsx blocks', () => runFixture('jsx', 'member-and-inline'));
  it('formats only within the current nesting scope', () => runFixture('jsx', 'nested-scope'));
  it('keeps jsx props untouched except inner jsx children', () => runFixture('jsx', 'no-props-change'));
  it('keeps an existing blank line unchanged', () => runFixture('jsx', 'existing-gap'));
  it('collapses multiple blank lines into one', () => runFixture('jsx', 'collapse-gap'));
  it('adds space between adjacent statements in a function body', () => runFixture('functions', 'const-if'));
  it('formats loops like any other adjacent block statements', () => runFixture('functions', 'loops'));
  it('formats sequential call steps', () => runFixture('functions', 'calls'));
  it('formats adjacent multi-line calls too', () => runFixture('functions', 'multi-to-multi'));
  it('does not split one multi-line expression internally', () => runFixture('functions', 'inside-expression'));
  it('keeps compact declaration-return blocks tight', () => runFixture('functions', 'compact-return-blocks'));
  it('formats nested block statements', () => runFixture('functions', 'nested-blocks'));
  it('does not change already spaced block bodies', () => runFixture('functions', 'no-change'));
  it('formats mixed real-world content', () => runFixture('mixed', 'real-world'));

  it('does not split inline jsx text and expressions', () => {
    const input = [
      'const view = (',
      '  <span>',
      '    Track #{shortId(run.id)} · post {run.postIndex ?? 0}',
      '  </span>',
      ');',
      '',
    ].join('\n');
    expect(formatText(input).output).toBe(input);
  });

  it('is idempotent after first pass', () => {
    const input = readFixture('mixed', 'real-world', 'input');
    const first = formatText(input).output;
    const second = formatText(first).output;
    expect(second).toBe(first);
  });
});
