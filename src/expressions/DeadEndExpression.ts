import { LismaError } from '../types/LismaError';
import { Expression } from './Expression';

export class DeadEndExpression extends Expression {
  constructor(readonly error: LismaError) {
    super();
  }
}
