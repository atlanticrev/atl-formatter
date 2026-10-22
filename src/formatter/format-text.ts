import { applyLineEdits } from './apply-line-edits';
import { collectBlockEdits } from './block-rules';
import { collectJsxEdits } from './jsx-rules';
import { parseModule } from './parse-module';
import type { FormatResult } from '../shared/types';

export const formatText = (source: string): FormatResult => {
  const ast = parseModule(source);
  const edits = [
    ...collectJsxEdits(ast),
    ...collectBlockEdits(ast),
  ];
  const output = applyLineEdits(source, edits);

  return {
    changed: output !== source,
    output,
  };
};
