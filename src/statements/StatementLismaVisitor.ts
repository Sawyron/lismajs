import {
  AlgDefContext,
  DiscreteStatementContext,
  NativeStatementContext,
} from '../gen/LismaParser';
import LismaParserVisitor from '../gen/LismaParserVisitor';
import { Statement } from './Statement';
import { NativeStatement } from './native/NativeStatement';
import { DeadEndStatement } from './DeadEndStatement';
import { errorFromRuleContext } from '../expressions/util';
import { AssignStatement } from './AssignStatement';
import { Expression, FloatExpression } from '../expressions';
import { LismaError } from '../types/LismaError';
import { ParserRuleContext } from 'antlr4';

export class StatementLismaVisitor extends LismaParserVisitor<Statement> {
  private _errors: LismaError[] = [];
  public get errors(): LismaError[] {
    return this._errors;
  }

  constructor(
    private readonly expressionVisitor: LismaParserVisitor<Expression>,
    private readonly nativeFactory: (code: string) => NativeStatement,
    private readonly assignFactory: (
      id: string,
      expression: FloatExpression
    ) => AssignStatement
  ) {
    super();
  }

  visitDiscreteStatement = (ctx: DiscreteStatementContext): Statement => {
    if (ctx.algDef()) {
      return this.visitAlgDef(ctx.algDef());
    }
    if (ctx.nativeStatement()) {
      return this.visitNativeStatement(ctx.nativeStatement());
    }
    return new DeadEndStatement(this.extractError(ctx, 'Unreachable state'));
  };

  visitNativeStatement = (ctx: NativeStatementContext): Statement => {
    if (!ctx.CODE_CONTENT()) {
      return new DeadEndStatement(this.extractError(ctx, 'Unreachable state'));
    }
    return this.nativeFactory(ctx.CODE_CONTENT().getText());
  };

  visitAlgDef = (ctx: AlgDefContext): Statement => {
    const exprCtx = ctx.expr();
    if (!ctx.ID() || !exprCtx) {
      return new DeadEndStatement(this.extractError(ctx, 'Unreachable state'));
    }
    const expression = this.expressionVisitor.visit(exprCtx);
    if (!(expression instanceof FloatExpression)) {
      return new DeadEndStatement(this.extractError(exprCtx, ''));
    }
    return this.assignFactory(ctx.ID().getText(), expression);
  };

  private extractError(ctx: ParserRuleContext, message: string) {
    const error = errorFromRuleContext(ctx, message);
    this._errors.push(error);
    return error;
  }
}
