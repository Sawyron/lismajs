import Expression from '../Expression';

export abstract class FloatExpression extends Expression {
  public abstract evaluate(): number;
}

export class FloatConstExpression extends FloatExpression {
  constructor(private readonly value: number) {
    super();
  }

  public evaluate(): number {
    return this.value;
  }

  toString(): string {
    return `${this.value}`;
  }
}
