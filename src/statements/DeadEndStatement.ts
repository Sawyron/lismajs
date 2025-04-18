import { LismaError } from '../types/LismaError';
import { Statement } from './Statement';

export class DeadEndStatement extends Statement {
  constructor(readonly error: LismaError) {
    super();
  }

  public execute(): void {
    throw new Error('Unreachable state');
  }
}
