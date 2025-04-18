import {
  ArrExprContext,
  AtomExprContext,
  BinaryExprContext,
  CallExprContext,
  ParenExprContext,
  UnaryExprContext,
} from '../gen/LismaParser';
import { BinaryBooleanExpression } from './boolean/BinaryBooleanExpression';
import { DeadEndExpression } from './DeadEndExpression';
import { Expression } from './Expression';
import { BinaryFloatExpression } from './float/BinaryFloatExpression';
import { FloatExpression } from './float/FloatExpression';
import { ConstFloatExpression } from './float/ConstFloatExpression';
import { UnaryFloatExpression } from './float/UnaryFloatExpression';
import { VariableFloatExpression } from './float/VariableFloatExpression';
import { FunctionCallFloatExpression } from './float/FunctionCallFloatExpression';
import { errorFromRuleContext } from './util';
import { LismaError } from '../types/LismaError';
import { ParserRuleContext } from 'antlr4';
import { ArrayItemFloatExpression } from './float/ArrayItemFloatExpression';
import LismaParserVisitor from '../gen/LismaParserVisitor';

export class ExpressionLismaVisitor extends LismaParserVisitor<Expression> {
  private _errors: LismaError[] = [];

  public get errors(): LismaError[] {
    return [...this._errors];
  }

  constructor(
    private readonly variableTable: Map<string, number> = new Map(),
    private readonly arrayTable: Map<string, number[]> = new Map()
  ) {
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
    return new DeadEndExpression(
      this.extractErrorFromRuleContext(ctx, 'Unreachable state')
    );
  };

  visitUnaryExpr = (ctx: UnaryExprContext): Expression => {
    const operation = ctx._luop.text;
    if (UnaryFloatExpression.operations.has(operation)) {
      const expr = this.visit(ctx.expr());
      if (!(expr instanceof FloatExpression)) {
        const error = errorFromRuleContext(
          ctx,
          'Can not apply unary operation'
        );
        this._errors.push(error);
        return new DeadEndExpression(error);
      }
      return new UnaryFloatExpression(expr, operation);
    }
    return new DeadEndExpression(
      this.extractErrorFromRuleContext(ctx, 'Unreachable state')
    );
  };

  visitCallExpr = (ctx: CallExprContext): Expression => {
    const id = ctx.ID().getText();
    const callArguments = ctx.expr_list().map(expr => this.visit(expr));
    if (FunctionCallFloatExpression.buildInFunctionNames.has(id)) {
      return new FunctionCallFloatExpression(id, callArguments);
    }
    return new DeadEndExpression(
      this.extractErrorFromRuleContext(ctx, `Undefined function '${id}'`)
    );
  };

  visitArrExpr = (ctx: ArrExprContext): Expression => {
    const id = ctx.ID().getText();
    const expr = this.visit(ctx.expr());
    if (!(expr instanceof FloatExpression)) {
      return new DeadEndExpression(
        this.extractErrorFromRuleContext(
          ctx.expr(),
          'Array index must be number'
        )
      );
    }
    return new ArrayItemFloatExpression(id, expr, this.arrayTable);
  };

  visitParenExpr = (ctx: ParenExprContext): Expression => {
    return this.visit(ctx.expr());
  };

  visitAtomExpr = (ctx: AtomExprContext): Expression => {
    if (ctx.NUMBER()) {
      return new ConstFloatExpression(Number(ctx.NUMBER().getText()));
    }
    if (ctx.ID()) {
      return new VariableFloatExpression(
        ctx.ID().getText(),
        this.variableTable
      );
    }
    return new DeadEndExpression(
      this.extractErrorFromRuleContext(ctx, 'Unreachable state')
    );
  };

  private extractErrorFromRuleContext(
    context: ParserRuleContext,
    message: string
  ): LismaError {
    const error = errorFromRuleContext(context, message);
    this._errors.push(error);
    return error;
  }
}
