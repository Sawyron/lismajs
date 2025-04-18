import { FloatExpression } from './FloatExpression';

export class ArrayItemFloatExpression extends FloatExpression {
  constructor(
    private readonly id: string,
    private readonly indexExpr: FloatExpression,
    private readonly table: Map<string, number[]>
  ) {
    super();
  }

  public evaluate(): number {
    const array = this.table.get(this.id);
    if (array === undefined) {
      throw new Error(`Array '${this.id}' is not defined`);
    }
    const index = this.indexExpr.evaluate();
    if (array.length <= index) {
      throw new RangeError(
        `Range error. Index ${index} out of range '${this.id} (len = ${array.length}).'`
      );
    }
    return array[index];
  }
}
