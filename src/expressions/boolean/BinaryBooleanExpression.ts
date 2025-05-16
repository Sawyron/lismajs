import { BinaryExpressionEvaluator } from '../BinaryExpressionEvaluator';
import { Expression } from '../Expression';
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
    throw Error('Expression operand types are incompatible');
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
    throw Error('Expression operand types are incompatible');
  });

  operationMap.set('<', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() < right.evaluate();
    }
    throw Error('Expression operand types are incompatible');
  });

  operationMap.set('<=', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() <= right.evaluate();
    }
    throw Error('Expression operand types are incompatible');
  });

  operationMap.set('>', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() > right.evaluate();
    }
    throw Error('Expression operand types are incompatible');
  });

  operationMap.set('>=', (left, right) => {
    if (left instanceof FloatExpression && right instanceof FloatExpression) {
      return left.evaluate() >= right.evaluate();
    }
    throw Error('Expression operand types are incompatible');
  });

  operationMap.set('||', (left, right) => {
    if (
      left instanceof BooleanExpression &&
      right instanceof BooleanExpression
    ) {
      return left.evaluate() || right.evaluate();
    }
    throw Error('Expression operand types are incompatible');
  });

  operationMap.set('&&', (left, right) => {
    if (
      left instanceof BooleanExpression &&
      right instanceof BooleanExpression
    ) {
      return left.evaluate() && right.evaluate();
    }
    throw Error('Expression operand types are incompatible');
  });
}

export class BinaryBooleanExpression extends BooleanExpression {
  static operations: ReadonlySet<string> = new Set(operationMap.keys());

  private readonly evaluator: BinaryExpressionEvaluator<boolean>;

  constructor(
    readonly left: Expression,
    readonly right: Expression,
    operation: string
  ) {
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
