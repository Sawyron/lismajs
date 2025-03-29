import { booleanOperations } from './boolean';
import { DataType } from './DataType';

export function checkExpressionType(expression: string[]): DataType {
  const operation = expression
    .filter(token => booleanOperations.has(token))
    .at(-1);
  return operation ? DataType.Boolean : DataType.Float;
}
