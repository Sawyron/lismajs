import { Context, Script } from 'vm';
import { Statement } from '../Statement';

export class NativeStatement extends Statement {
  private readonly script: Script;
  constructor(
    private readonly context: Context,
    code: string
  ) {
    super();
    this.script = new Script(code);
  }

  public execute(): void {
    this.script.runInContext(this.context);
  }
}
