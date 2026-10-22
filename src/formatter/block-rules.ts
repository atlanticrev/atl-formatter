import traverse, { NodePath } from '@babel/traverse';
import type {
  BlockStatement,
  File,
  ReturnStatement,
  Statement,
  VariableDeclaration,
} from '@babel/types';
import type { LineEdit } from '../shared/types';

const isSingleLineStatement = (statement: Statement): boolean => {
  return !!statement.loc && statement.loc.start.line === statement.loc.end.line;
};

const isVariableDeclaration = (statement: Statement): statement is VariableDeclaration => {
  return statement.type === 'VariableDeclaration';
};

const isReturnStatement = (statement: Statement): statement is ReturnStatement => {
  return statement.type === 'ReturnStatement';
};

const isCompactDeclarationReturnPair = (body: BlockStatement['body'], index: number): boolean => {
  const current = body[index];
  const next = body[index + 1];

  return (
    body.length === 2 &&
    isVariableDeclaration(current) &&
    isReturnStatement(next) &&
    isSingleLineStatement(current) &&
    isSingleLineStatement(next)
  );
};

const shouldInsertBlankLine = (body: BlockStatement['body'], index: number): boolean => {
  return !isCompactDeclarationReturnPair(body, index);
};

const collectFromBody = (body: BlockStatement['body'], edits: LineEdit[]): void => {
  for (let index = 0; index < body.length - 1; index += 1) {
    const current = body[index];
    const next = body[index + 1];

    if (!current.loc || !next.loc || !shouldInsertBlankLine(body, index)) {
      continue;
    }

    edits.push({
      afterLine: current.loc.end.line,
      beforeLine: next.loc.start.line,
      blankLines: 1,
    });
  }
};

export const collectBlockEdits = (ast: File): LineEdit[] => {
  const edits: LineEdit[] = [];

  traverse(ast, {
    BlockStatement(path: NodePath<BlockStatement>): void {
      collectFromBody(path.node.body, edits);
    },
  });

  return edits;
};
