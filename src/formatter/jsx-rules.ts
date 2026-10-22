import traverse, { NodePath } from '@babel/traverse';
import type { File, JSXElement, JSXFragment, JSXText } from '@babel/types';
import type { LineEdit } from '../shared/types';

type JsxChild = JSXElement['children'][number];

type TextBounds = {
  startLine: number;
  endLine: number;
};

const getTextBounds = (node: JSXText): TextBounds | null => {
  const rows = node.value.split(/\r?\n/);
  const first = rows.findIndex((row: string) => row.trim().length > 0);
  let last = -1;

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].trim().length > 0) {
      last = index;
      break;
    }
  }

  if (!node.loc || first < 0 || last < 0) {
    return null;
  }

  return {
    startLine: node.loc.start.line + first,
    endLine: node.loc.start.line + last,
  };
};

const getBounds = (node: JsxChild): TextBounds | null => {
  if (node.type === 'JSXText') {
    return getTextBounds(node);
  }

  if (!node.loc) {
    return null;
  }

  return {
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
  };
};

const isVisualBlock = (node: JsxChild): boolean => getBounds(node) !== null;

const collectPairEdits = (children: JsxChild[], edits: LineEdit[]): void => {
  const blocks = children.filter(isVisualBlock);

  for (let index = 0; index < blocks.length - 1; index += 1) {
    const currentBounds = getBounds(blocks[index]);
    const nextBounds = getBounds(blocks[index + 1]);

    if (!currentBounds || !nextBounds) {
      continue;
    }

    if (nextBounds.startLine <= currentBounds.endLine) {
      continue;
    }

    edits.push({
      afterLine: currentBounds.endLine,
      beforeLine: nextBounds.startLine,
      blankLines: 1,
    });
  }
};

export const collectJsxEdits = (ast: File): LineEdit[] => {
  const edits: LineEdit[] = [];

  traverse(ast, {
    JSXElement(path: NodePath<JSXElement>): void {
      collectPairEdits(path.node.children, edits);
    },
    JSXFragment(path: NodePath<JSXFragment>): void {
      collectPairEdits(path.node.children, edits);
    },
  });

  return edits;
};
