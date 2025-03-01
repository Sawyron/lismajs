import { ExprContext } from './gen/LismaParser';

export class ExprConsumer {
  private readonly exprStack: string[] = [];

  public consume(context: ExprContext) {
    if (context.ID()) {
      this.exprStack.push(context.ID().getText());
    } else if (context.NUMBER()) {
      this.exprStack.push(context.NUMBER().getText());
    } else if (context._luop) {
      const operand = this.exprStack.pop()!;
      const operation = context._luop.text;
      this.exprStack.push(`${operand} ${operation}`);
    } else if (context._bop) {
      const left = this.exprStack.pop()!;
      const right = this.exprStack.pop()!;
      const opearation = context._bop.text;
      this.exprStack.push(`${right} ${left} ${opearation}`);
    }
  }

  public getTokens(): string[] {
    return this.exprStack.join('').split(' ');
  }
}
