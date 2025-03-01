import { ExprContext } from './gen/LismaParser';

const priotityMap = new Map<string, number>();
priotityMap.set('+', 1);
priotityMap.set('-', 1);
priotityMap.set('*', 2);
priotityMap.set('/', 2);

export class ExprConsumer {
  private readonly operatorStack: string[] = [];
  private readonly outputQueue: string[] = [];

  public consume(context: ExprContext) {
    if (context.ID()) {
      this.outputQueue.push(context.ID().getText());
    } else if (context.NUMBER()) {
      this.outputQueue.push(context.NUMBER().getText());
    } else if (context.BIN_OP()) {
      const operator = context.BIN_OP().getText();
      const priority = priotityMap.get(operator) ?? 0;
      let onStack = this.operatorStack.at(-1);
      while (
        onStack &&
        onStack !== '(' &&
        (priotityMap.get(onStack) ?? 0) > priority
      ) {
        this.outputQueue.push(onStack);
        this.operatorStack.pop();
        onStack = this.operatorStack.pop();
      }
      this.operatorStack.push(operator);
    }
  }

  public enterBrace() {
    this.operatorStack.push('(');
  }

  public exitBrace() {
    let onStack = this.operatorStack.at(-1);
    while (onStack && onStack !== '(') {
      this.outputQueue.push(onStack);
      this.operatorStack.pop();
      onStack = this.operatorStack.pop();
    }
    if (onStack !== '(') {
      throw Error('Mismatched parentheses');
    }
  }

  public getTokens(): string[] {
    if (this.operatorStack.at(-1) === '(') {
      throw Error('Mismatched parentheses');
    }
    if (this.operatorStack.length !== 0) {
      this.outputQueue.push(...this.operatorStack.reverse());
    }
    const output = [...this.outputQueue];
    this.operatorStack.splice(0, this.operatorStack.length);
    this.outputQueue.splice(0, this.outputQueue.length);
    return output;
  }
}
