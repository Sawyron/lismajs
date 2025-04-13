import { visitText } from '..';
import { DeadEndExpression } from './DeadEndExpression';
import { ExpressionLismaVisitor } from './ExpressionLismaVisitor';
import { BinaryFloatExpression } from './float/BinaryFloatExpression';
import { ConstFloatExpression } from './float/ConstConstExpression';
import { FloatExpression } from './float/FloatExpression';
import { FunctionCallFloatExpression } from './float/FunctionCallFloatExpression';
import { VariableFloatExpression } from './float/VariableVariableExpression';
import { describe, it, expect } from '@jest/globals';

describe('ExpressionLismaVisitor', () => {
  it('should parse atom value expr', () => {
    const code = '50';
    const visitor = new ExpressionLismaVisitor();
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(ConstFloatExpression);
    expect((expression as ConstFloatExpression).evaluate()).toBe(50);
  });

  it('should parse atom id expr', () => {
    const code = 't';
    const table = new Map<string, number>([['t', 10]]);
    const visitor = new ExpressionLismaVisitor(table);
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(VariableFloatExpression);
    expect((expression as VariableFloatExpression).evaluate()).toBe(10);
  });

  it('should parse bin expr', () => {
    const code = '1 + 2';
    const visitor = new ExpressionLismaVisitor();
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(BinaryFloatExpression);
    expect((expression as BinaryFloatExpression).evaluate()).toBe(3);
  });

  it('should parse complex expr', () => {
    const code = '1 + 2 * 3 * (1 + 20 / 3)';
    const answer = 1 + 2 * 3 * (1 + 20 / 3);
    const visitor = new ExpressionLismaVisitor();
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(FloatExpression);
    expect((expression as FloatExpression).evaluate()).toBe(answer);
  });

  it('should evaluate to dead end if unary "-" operator is applied to boolean expr', () => {
    const code = '-(2 >= 3)';
    const visitor = new ExpressionLismaVisitor();
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(DeadEndExpression);
  });

  it('should evaluate function expression', () => {
    const code = 'abs(-3)';
    const visitor = new ExpressionLismaVisitor();
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(FunctionCallFloatExpression);
    expect((expression as FloatExpression).evaluate()).toBe(3);
  });
});
