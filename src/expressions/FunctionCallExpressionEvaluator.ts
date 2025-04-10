import { Expression } from './Expression';

export class FunctionCallExpressionEvaluator<T> {
  private readonly id: string;
  private readonly callArguments: Expression[];
  private readonly operationMap: Map<
    string,
    (callArguments: Expression[]) => T
  >;

  constructor(
    id: string,
    callArguments: Expression[],
    operationMap: Map<string, (callArguments: Expression[]) => T>
  ) {
    this.id = id;
    this.callArguments = [...callArguments];
    this.operationMap = new Map(operationMap);
  }

  public evaluate(): T {
    const operation = this.operationMap.get(this.id);
    if (operation === undefined) {
      throw new Error();
    }
    return operation(this.callArguments);
  }

  toString(): string {
    return `${this.callArguments.map(arg => String(arg)).join(' ')} ${this.id}`;
  }
}
