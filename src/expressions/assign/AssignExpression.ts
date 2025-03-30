import Expression from '../Expression';
import { FloatExpression } from '../float/FloatExpression';

export class AssignExpression extends Expression {
  constructor(
    private readonly id: string,
    private readonly expression: FloatExpression,
    private readonly table: Map<string, number>
  ) {
    super();
  }

  execute() {
    this.table.set(this.id, this.expression.evaluate());
  }
}
