import { visitText } from '..';
import { ExpressionLismaVisitor } from './ExpressionLismaVisitor';
import { BinaryFloatExpression } from './float/FloatBinaryExpression';
import { FloatConstExpression } from './float/FloatConstExpression';
import { FloatExpression } from './float/FloatExpression';
import { FloatVariableExpression } from './float/FloatVariableExpression';

describe('ExpressionLismaVisitor', () => {
  it('should parse atom value expr', () => {
    const code = '50';
    const visitor = new ExpressionLismaVisitor();
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(FloatConstExpression);
    expect((expression as FloatConstExpression).evaluate()).toBe(50);
  });
  it('should parse atom id expr', () => {
    const code = 't';
    const table = new Map<string, number>([['t', 10]]);
    const visitor = new ExpressionLismaVisitor(table);
    const expression = visitText(visitor, code, {}, parser => parser.expr());

    expect(expression).toBeInstanceOf(FloatVariableExpression);
    expect((expression as FloatVariableExpression).evaluate()).toBe(10);
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
});
