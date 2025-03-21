import { DataType } from './DataType';

const booleanOpearations = new Set<string>();
booleanOpearations.add('==');
booleanOpearations.add('!=');
booleanOpearations.add('||');
booleanOpearations.add('&&');
booleanOpearations.add('>');
booleanOpearations.add('>=');
booleanOpearations.add('<');
booleanOpearations.add('<=');
booleanOpearations.add('!');

export function checkExpressionType(expression: string[]): DataType {
  const operation = expression.find(token => booleanOpearations.has(token));
  return operation ? DataType.Boolean : DataType.Float;
}
