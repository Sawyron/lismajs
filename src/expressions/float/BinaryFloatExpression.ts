import { BinaryExpressionEvaluator } from '../BinaryExpressionEvaluator';
import { Expression } from '../Expression';
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
  static operations: ReadonlySet<string> = new Set(operationMap.keys());

  private readonly evaluator: BinaryExpressionEvaluator<number>;

  constructor(left: Expression, right: Expression, operation: string) {
    super();
    this.evaluator = new BinaryExpressionEvaluator(
      left,
      right,
      operation,
      operationMap
    );
  }

  public evaluate(): number {
    return this.evaluator.evaluate();
  }

  toString(): string {
    return this.evaluator.toString();
  }
}
