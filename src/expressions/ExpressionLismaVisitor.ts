import {
  AtomExprContext,
  BinaryExprContext,
  CallExprContext,
  ParenExprContext,
  UnaryExprContext,
} from '../gen/LismaParser';
import LismaVisitor from '../gen/LismaVisitor';
import { BinaryBooleanExpression } from './boolean/BinaryBooleanExpression';
import { DeadEndExpression } from './DeadEndExpression';
import { Expression } from './Expression';
import { BinaryFloatExpression } from './float/FloatBinaryExpression';
import { FloatExpression } from './float/FloatExpression';
import { FloatConstExpression } from './float/FloatConstExpression';
import { FloatUnaryExpression } from './float/FloatUnaryExpression';
import { FloatVariableExpression } from './float/FloatVariableExpression';
import { FloatFunctionCallExpression } from './float/FloatFunctionCallExpression';
import { errorFromRuleContext } from './util';
import { LismaError } from '../types/LismaError';

export class ExpressionLismaVisitor extends LismaVisitor<Expression> {
  private _errors: LismaError[] = [];

  public get errors(): LismaError[] {
    return [...this._errors];
  }

  constructor(private readonly variableTable: Map<string, number> = new Map()) {
    super();
  }

  visitBinaryExpr = (ctx: BinaryExprContext): Expression => {
    const operation = ctx._bop.text;
    const [left, right] = ctx.expr_list().map(expr => this.visit(expr));
    if (BinaryFloatExpression.operations.has(operation)) {
      return new BinaryFloatExpression(left, right, operation);
    }
    if (BinaryBooleanExpression.operations.has(operation)) {
      return new BinaryBooleanExpression(left, right, operation);
    }
    const error = errorFromRuleContext(ctx, 'Unreachable state');
    this._errors.push(error);
    return new DeadEndExpression(error);
  };

  visitUnaryExpr = (ctx: UnaryExprContext): Expression => {
    const operation = ctx._luop.text;
    if (FloatUnaryExpression.operations.has(operation)) {
      const expr = this.visit(ctx.expr());
      if (!(expr instanceof FloatExpression)) {
        return new DeadEndExpression(
          errorFromRuleContext(ctx, 'Can not apply unary operation')
        );
      }
      return new FloatUnaryExpression(expr, operation);
    }
    const error = errorFromRuleContext(ctx, 'Unreachable state');
    this._errors.push(error);
    return new DeadEndExpression(error);
  };

  visitCallExpr = (ctx: CallExprContext): Expression => {
    const id = ctx.ID().getText();
    const callArguments = ctx.expr_list().map(expr => this.visit(expr));
    if (FloatFunctionCallExpression.buildInFunctionNames.has(id)) {
      return new FloatFunctionCallExpression(id, callArguments);
    }
    const error = errorFromRuleContext(ctx, `Undefined function '${id}'`);
    this._errors.push(error);
    return new DeadEndExpression(error);
  };

  visitParenExpr = (ctx: ParenExprContext): Expression => {
    return this.visit(ctx.expr());
  };

  visitAtomExpr = (ctx: AtomExprContext): Expression => {
    if (ctx.NUMBER()) {
      return new FloatConstExpression(Number(ctx.NUMBER().getText()));
    }
    if (ctx.ID()) {
      return new FloatVariableExpression(
        ctx.ID().getText(),
        this.variableTable
      );
    }
    const error = errorFromRuleContext(ctx, 'Unreachable state');
    this._errors.push(error);
    return new DeadEndExpression(error);
  };
}
