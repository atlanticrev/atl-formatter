import { parse } from '@babel/parser';
import type { File } from '@babel/types';

const PARSER_PLUGINS = [
  'jsx',
  'typescript',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'topLevelAwait',
  'importAttributes',
] as const;

export const parseModule = (source: string): File => {
  return parse(source, {
    sourceType: 'unambiguous',
    plugins: [...PARSER_PLUGINS],
    errorRecovery: false,
  });
};
