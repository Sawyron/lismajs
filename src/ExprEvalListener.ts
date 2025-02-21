import LismaListener from './gen/LismaListener';
import { ExprContext } from './gen/LismaParser';

export class ExprEvalListener extends LismaListener {
  private outputQueue: string[] = [];
  private opStack: string[] = [];

  exitExpr = (ctx: ExprContext) => {
    if (ctx.NUMBER()) {
      this.outputQueue.push(ctx.NUMBER().getText());
    } else if (ctx.BIN_OP()) {
      this.opStack.push(ctx.BIN_OP().getText());
    }
  };

  evaluate(): string {
    let out = '';
    while (this.opStack.length !== 0) {
      const op = this.opStack.pop();
      const first = this.outputQueue.shift();
      const second = this.outputQueue.shift();
      if (out.length > 0) {
        out += ' ';
      }
      out += `${first} ${second} ${op}`;
    }
    return out;
  }
}
