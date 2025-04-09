import { FloatExpression } from '../expressions/float/FloatExpression';
import { Statement } from './Statement';

export class AssignStatement extends Statement {
  constructor(
    private readonly id: string,
    private readonly expression: FloatExpression,
    private readonly table: Map<string, number>
  ) {
    super();
  }

  public execute(): void {
    this.table.set(this.id, this.expression.evaluate());
  }
}
