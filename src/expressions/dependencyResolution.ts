import { BinaryBooleanExpression } from './boolean';
import { Expression } from './Expression';
import { VariableFloatExpression, BinaryFloatExpression } from './float';

const resolveExpressionDependencies = (
  expression: Expression,
  idToExpression: Map<string, Expression>
): string[] => {
  const queue: Expression[] = [];
  const seen = new Set<string>();
  const dependencies: string[] = [];

  queue.push(expression);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current instanceof VariableFloatExpression) {
      const { id } = current;
      if (!seen.has(id)) {
        dependencies.push(id);
        const idExpression = idToExpression.get(id);
        if (idExpression !== undefined) {
          queue.push(idExpression);
        }
      }
      seen.add(id);
    } else if (current instanceof BinaryFloatExpression) {
      queue.push(current.left);
      queue.push(current.right);
    } else if (current instanceof BinaryBooleanExpression) {
      queue.push(current.left);
      queue.push(current.right);
    }
  }

  return dependencies;
};

const topologicallySortEquations = (
  idToExpression: Map<string, Expression>
): [sortedIds: string[], errors: string[]] => {
  const dependencyGraph: Map<string, Set<string>> = new Map(
    idToExpression
      .entries()
      .map(([id, expression]) => [
        id,
        new Set(resolveExpressionDependencies(expression, idToExpression)),
      ])
  );

  const errors: string[] = dependencyGraph
    .entries()
    .filter(([id, dependencies]) => dependencies.has(id))
    .map(entry => entry[0])
    .toArray();
  if (errors.length > 0) {
    return [[], errors];
  }

  dependencyGraph
    .values()
    .reduce((accumulator, current) => {
      current.forEach(id => accumulator.add(id));
      return accumulator;
    }, new Set())
    .values()
    .filter(id => !idToExpression.has(id))
    .forEach(id => {
      for (const deps of dependencyGraph.values()) {
        deps.delete(id);
      }
    });

  const getZeros = () =>
    dependencyGraph
      .entries()
      .filter(entry => entry[1].size === 0)
      .map(entry => entry[0]);
  const result: string[] = [];
  const queue: string[] = [...getZeros()];

  while (queue.length > 0) {
    const current = queue.shift()!;
    dependencyGraph.delete(current);
    result.push(current);
    for (const deps of dependencyGraph.values()) {
      deps.delete(current);
    }
    queue.push(...getZeros());
  }
  return [result, []];
};

export { resolveExpressionDependencies, topologicallySortEquations };
