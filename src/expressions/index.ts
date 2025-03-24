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
  const operation = expression
    .filter(token => booleanOpearations.has(token))
    .at(-1);
  return operation ? DataType.Boolean : DataType.Float;
}
