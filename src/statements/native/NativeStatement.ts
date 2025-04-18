import { Context, Script } from 'vm';
import { Statement } from '../Statement';

export class NativeStatement extends Statement {
  constructor(
    private readonly context: Context,
    private readonly code: string
  ) {
    super();
  }

  public execute(): void {
    const script = new Script(this.code);
    script.runInContext(this.context);
  }
}
