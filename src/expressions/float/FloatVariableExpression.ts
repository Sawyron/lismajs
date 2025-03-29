import { FloatExpression } from './FloatExpression';

export class FloatVariableExpression extends FloatExpression {
  constructor(
    private readonly id: string,
    private readonly variableTable: Map<string, number>
  ) {
    super();
  }

  public evaluate(): number {
    const value = this.variableTable.get(this.id);
    if (value === undefined) {
      throw new Error();
    }
    return value;
  }

  toString(): string {
    return this.id;
  }
}
