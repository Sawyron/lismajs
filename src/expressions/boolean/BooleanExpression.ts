import Expression from '../Expression';

export abstract class BooleanExpression extends Expression {
  abstract evaluate(): boolean;
}

export class BooleanConstExpression extends BooleanExpression {
  constructor(private readonly value: boolean) {
    super();
  }

  evaluate(): boolean {
    return this.value;
  }

  toString(): string {
    return `${this.value}`;
  }
}
