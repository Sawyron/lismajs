import { ExprContext } from './gen/LismaParser';

export class ExprConsumer {
  private readonly exprStack: string[] = [];

  public consume(context: ExprContext) {
    if (context.ID()) {
      this.exprStack.push(context.ID().getText());
    } else if (context.NUMBER()) {
      this.exprStack.push(context.NUMBER().getText());
    } else if (context._luop) {
      const operation = context._luop.text;
      this.exprStack.push(operation);
    } else if (context._bop) {
      const opearation = context._bop.text;
      this.exprStack.push(opearation);
    }
  }

  public getTokens(): string[] {
    const output = [...this.exprStack];
    this.exprStack.splice(0, this.exprStack.length);
    return output;
  }
}
