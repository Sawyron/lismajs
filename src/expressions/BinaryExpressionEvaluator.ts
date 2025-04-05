import Expression from './Expression';

export class BinaryExpressionEvaluator<T> {
  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
    private readonly operation: string,
    private readonly operationMap: Map<
      string,
      (left: Expression, right: Expression) => T
    >
  ) {
    if (!operationMap.has(operation)) {
      throw new Error(`Unknown operation: ${operation}`);
    }
  }

  public evaluate(): T {
    const operation = this.operationMap.get(this.operation);
    if (operation === undefined) {
      throw new Error(
        `Could not find mapping for operation: ${this.operation}`
      );
    }
    return operation(this.left, this.right);
  }

  toString(): string {
    return `${this.left} ${this.right} ${this.operation}`;
  }
}
