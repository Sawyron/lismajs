import { FloatExpression } from './FloatExpression';

const operationMap = new Map<string, (expression: FloatExpression) => number>();

{
  operationMap.set('-', expression => {
    return -expression.evaluate();
  });
}

export class UnaryFloatExpression extends FloatExpression {
  static operations: ReadonlySet<string> = new Set(operationMap.keys());

  constructor(
    readonly inner: FloatExpression,
    private readonly operation: string
  ) {
    super();
    if (!operationMap.has(operation)) {
      throw new Error(`Unknown operation: ${operation}`);
    }
  }

  public evaluate(): number {
    const operation = operationMap.get(this.operation)!;
    return operation(this.inner);
  }

  toString(): string {
    return `${this.inner} ${this.operation}`;
  }
}
