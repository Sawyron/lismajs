import { describe, expect, it } from '@jest/globals';
import { visitText } from '..';
import { Expression } from './Expression';
import { ExpressionLismaVisitor } from './ExpressionLismaVisitor';
import {
  resolveExpressionDependencies,
  topologicallySortEquations,
} from './dependencyResolution';

describe('dependencyResolution', () => {
  it('resolveExpressionDependencies should work', () => {
    const visitor = new ExpressionLismaVisitor();
    const exprMap = new Map<string, Expression>();
    exprMap.set(
      'x',
      visitText(visitor, '3', {}, parser => parser.expr())
    );
    exprMap.set(
      'y',
      visitText(visitor, '3 * x + y', {}, parser => parser.expr())
    );
    exprMap.set(
      'z',
      visitText(visitor, '4 * y', {}, parser => parser.expr())
    );
    for (const [id, expr] of exprMap) {
      console.log(`${id} = ${expr}`);
    }

    let dep = resolveExpressionDependencies(exprMap.get('x')!, exprMap);
    expect(dep.sort()).toStrictEqual([]);
    dep = resolveExpressionDependencies(exprMap.get('y')!, exprMap);
    expect(dep.sort()).toStrictEqual(['x', 'y'].sort());
    dep = resolveExpressionDependencies(exprMap.get('z')!, exprMap);
    expect(dep.sort()).toStrictEqual(['x', 'y'].sort());
  });

  it('should topologicallySortEquations work', () => {
    const visitor = new ExpressionLismaVisitor();
    const exprMap = new Map<string, Expression>();
    exprMap.set(
      'z',
      visitText(visitor, '4 * y', {}, parser => parser.expr())
    );
    exprMap.set(
      'x',
      visitText(visitor, '3', {}, parser => parser.expr())
    );
    exprMap.set(
      'y',
      visitText(visitor, '3 * x', {}, parser => parser.expr())
    );

    const [sortedIds, errors] = topologicallySortEquations(exprMap);

    expect(errors.length).toBe(0);
    expect(sortedIds).toStrictEqual(['x', 'y', 'z']);
  });
});
