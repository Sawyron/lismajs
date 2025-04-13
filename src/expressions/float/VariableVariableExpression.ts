import { FloatExpression } from './FloatExpression';

export class VariableFloatExpression extends FloatExpression {
  constructor(
    readonly id: string,
    private readonly variableTable: Map<string, number>
  ) {
    super();
  }

  public evaluate(): number {
    const value = this.variableTable.get(this.id);
    if (value === undefined) {
      throw new Error(`Could not find value for '${this.id}'`);
    }
    return value;
  }

  toString(): string {
    return this.id;
  }
}
