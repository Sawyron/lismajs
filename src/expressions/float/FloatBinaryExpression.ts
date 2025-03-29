import Expression from '../Expression';
import { FloatExpression } from './FloatExpression';

const operationMap = new Map<
  string,
  (left: Expression, right: Expression) => number
>();

{
  operationMap.set('+', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() + right.evaluate();
    }
    throw Error();
  });
  operationMap.set('-', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() - right.evaluate();
    }
    throw Error();
  });
  operationMap.set('*', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() * right.evaluate();
    }
    throw Error();
  });
  operationMap.set('/', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() / right.evaluate();
    }
    throw Error();
  });
}

export class BinaryFloatExpression extends FloatExpression {
  static operations = new Set(operationMap.keys());

  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
    private readonly operation: string
  ) {
    super();
  }

  public evaluate(): number {
    const operation = operationMap.get(this.operation)!;
    return operation(this.left, this.right);
  }

  toString(): string {
    return `${this.left} ${this.right} ${this.operation}`;
  }
}
