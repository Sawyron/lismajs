import { Expression } from '../Expression';
import { FunctionCallExpressionEvaluator } from '../FunctionCallExpressionEvaluator';
import { FloatExpression } from './FloatExpression';

const buildInFunctions = new Map<
  string,
  (callArguments: Expression[]) => number
>();

{
  buildInFunctions.set('abs', args => {
    if (args.length !== 1) {
      throw new Error('Invalid number of arguments');
    }
    const [argument] = args;
    if (!(argument instanceof FloatExpression)) {
      throw new Error('Invalid types of arguments');
    }
    return Math.abs(argument.evaluate());
  });
  buildInFunctions.set('pow', args => {
    if (args.length !== 2) {
      throw new Error('Invalid number of arguments');
    }
    const [target, power] = args;
    if (
      !(target instanceof FloatExpression) ||
      !(power instanceof FloatExpression)
    ) {
      throw new Error('Invalid types of arguments');
    }
    return Math.pow(target.evaluate(), power.evaluate());
  });
  buildInFunctions.set('exp', args => {
    if (args.length !== 1) {
      throw new Error('Invalid number of arguments');
    }
    const [target] = args;
    if (!(target instanceof FloatExpression)) {
      throw new Error('Invalid types of arguments');
    }
    return Math.exp(target.evaluate());
  });
  buildInFunctions.set('sqrt', args => {
    if (args.length !== 1) {
      throw new Error('Invalid number of arguments');
    }
    const [target] = args;
    if (!(target instanceof FloatExpression)) {
      throw new Error('Invalid types of arguments');
    }
    return Math.sqrt(target.evaluate());
  });
}

export class FloatFunctionCallExpression extends FloatExpression {
  static buildInFunctionNames: ReadonlySet<string> = new Set(
    buildInFunctions.keys()
  );

  private readonly evaluator: FunctionCallExpressionEvaluator<number>;

  constructor(id: string, callArguments: Expression[]) {
    super();
    this.evaluator = new FunctionCallExpressionEvaluator(
      id,
      callArguments,
      buildInFunctions
    );
  }

  public evaluate(): number {
    return this.evaluator.evaluate();
  }

  toString(): string {
    return String(this.evaluator);
  }
}
