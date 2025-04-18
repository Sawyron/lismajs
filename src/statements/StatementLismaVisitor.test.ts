import { describe, expect, it } from '@jest/globals';
import { StatementLismaVisitor } from './StatementLismaVisitor';
import { ExpressionLismaVisitor } from '../expressions';
import { NativeStatement } from './native/NativeStatement';
import { createContext } from 'vm';
import { AssignStatement } from './AssignStatement';
import { visitText } from '..';

describe('StatementLismaVisitor', () => {
  it('should evaluate assign statement', () => {
    const code = 'x = 2;';
    const context = createContext({});
    const table = new Map();
    const visitor = new StatementLismaVisitor(
      new ExpressionLismaVisitor(),
      code => new NativeStatement(context, code),
      (id, expr) => new AssignStatement(id, expr, table)
    );

    const statement = visitText(visitor, code, {}, parser =>
      parser.discreteStatement()
    );
    expect(statement).toBeInstanceOf(AssignStatement);
    (statement as AssignStatement).execute();
    expect(table.get('x')).toBe(2);
  });

  it('should evaluate native statement', () => {
    const code = `
    native\`\`\`
      this.a = 'test';
      for (let i = 0; i < 5; i++) {
          this.a += i;
      }
    \`\`\`
    `;
    const context = createContext({});
    const table = new Map();
    const visitor = new StatementLismaVisitor(
      new ExpressionLismaVisitor(),
      code => new NativeStatement(context, code),
      (id, expr) => new AssignStatement(id, expr, table)
    );

    const statement = visitText(visitor, code, {}, parser =>
      parser.discreteStatement()
    );

    expect(statement).toBeInstanceOf(NativeStatement);
    (statement as NativeStatement).execute();
    expect(context['a']).toBe('test01234');
  });
});
