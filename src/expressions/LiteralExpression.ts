import Expression from './Expression';

export default class LiteralExpression extends Expression {
  constructor(
    private readonly _type: string,
    readonly value: string
  ) {
    super();
  }

  get type(): string {
    return this._type;
  }
}
