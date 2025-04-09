import { Expression } from '../Expression';

export abstract class FloatExpression extends Expression {
  public abstract evaluate(): number;
}
