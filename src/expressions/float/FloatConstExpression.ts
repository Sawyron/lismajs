import { FloatExpression } from './FloatExpression';

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
