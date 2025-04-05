import { BinaryExpressionEvaluator } from '../BinaryExpressionEvaluator';
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

  private readonly evaluator: BinaryExpressionEvaluator<boolean>;

  constructor(left: Expression, right: Expression, operation: string) {
    super();
    this.evaluator = new BinaryExpressionEvaluator(
      left,
      right,
      operation,
      operationMap
    );
  }

  evaluate(): boolean {
    return this.evaluator.evaluate();
  }

  toString(): string {
    return this.evaluator.toString();
  }
}
