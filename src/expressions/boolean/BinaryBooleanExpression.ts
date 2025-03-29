import Expression from '../Expression';
import { FloatExpression } from '../float/FloatExpression';
import { BooleanExpression } from './BooleanExpression';

const operationMap = new Map<
  string,
  (left: Expression, right: Expression) => boolean
>();

{
  operationMap.set('==', (left, right) => {
    if (
      left instanceof BooleanExpression &&
      right instanceof BooleanExpression
    ) {
      return left.evaluate() === right.evaluate();
    }
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() === right.evaluate();
    }
    throw Error();
  });
  operationMap.set('!=', (left, right) => {
    if (
      left instanceof BooleanExpression &&
      right instanceof BooleanExpression
    ) {
      return left.evaluate() !== right.evaluate();
    }
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() !== right.evaluate();
    }
    throw Error();
  });
  operationMap.set('<', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() < right.evaluate();
    }
    throw Error();
  });
  operationMap.set('<=', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() <= right.evaluate();
    }
    throw Error();
  });
  operationMap.set('>', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() > right.evaluate();
    }
    throw Error();
  });
  operationMap.set('>=', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() >= right.evaluate();
    }
    throw Error();
  });
  operationMap.set('||', (left, right) => {
    if (
      left instanceof BooleanExpression &&
      right instanceof BooleanExpression
    ) {
      return left.evaluate() || right.evaluate();
    }
    throw Error();
  });
  operationMap.set('&&', (left, right) => {
    if (
      left instanceof BooleanExpression &&
      right instanceof BooleanExpression
    ) {
      return left.evaluate() && right.evaluate();
    }
    throw Error();
  });
}

export class BinaryBooleanExpression extends BooleanExpression {
  static operations = new Set<string>(operationMap.keys());

  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
    private readonly operation: string
  ) {
    super();
    if (!operationMap.has(operation)) {
      throw new Error(`Unknown operation: ${operation}`);
    }
  }

  evaluate(): boolean {
    const operation = operationMap.get(this.operation)!;
    return operation(this.left, this.right);
  }

  toString(): string {
    return `${this.left} ${this.right} ${this.operation}`;
  }
}
