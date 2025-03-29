export default abstract class Expression {}

export class BinaryExpression<T> extends Expression {
  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
    private readonly operation: string,
    private readonly operationMap: Map<string, string>
  ) {
    super();
  }

  public evaluate(): T {
    throw new Error('Method not implemented.');
  }
}
