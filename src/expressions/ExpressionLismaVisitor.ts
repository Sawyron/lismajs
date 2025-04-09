import { ParserRuleContext } from 'antlr4';
import {
  AtomExprContext,
  BinaryExprContext,
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
import { LismaError } from '../types/LismaError';

export class ExpressionLismaVisitor extends LismaVisitor<Expression> {
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
    return new DeadEndExpression(
      errorFromRuleContext(ctx, 'Unreachable state')
    );
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
    return new DeadEndExpression(
      errorFromRuleContext(ctx, 'Unreachable state')
    );
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
    return new DeadEndExpression(
      errorFromRuleContext(ctx, 'Unreachable state')
    );
  };
}

const errorFromRuleContext = (
  ctx: ParserRuleContext,
  message: string
): LismaError => ({
  message: message,
  charPosition: ctx.start.start,
  line: ctx.start.line,
});
