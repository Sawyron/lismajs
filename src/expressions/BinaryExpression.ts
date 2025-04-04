import Expression from './Expression';

export class BinaryExpression extends Expression {
  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
    private readonly operation: string,
    private readonly operationMap: Map<
      string,
      (left: Expression, right: Expression) => unknown
    >
  ) {
    super();
    if (!operationMap.has(operation)) {
      throw new Error(`Unknown operation: ${operation}`);
    }
  }

  public evaluate<T>(): T {
    const operation = this.operationMap.get(this.operation);
    if (operation === undefined) {
      throw new Error(
        `Could not find mapping for operation: ${this.operation}`
      );
    }
    return operation(this.left, this.right) as T;
  }

  toString(): string {
    return `${this.left} ${this.right} ${this.operation}`;
  }
}
