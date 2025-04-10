import LismaListener from '../gen/LismaListener';
import {
  AlgDefContext,
  ConstDefContext,
  DiffDefContext,
  ExprContext,
  InitCondContext,
  StateContext,
  StatePartContext,
  TransitionContext,
  WhenStatementContext,
} from '../gen/LismaParser';
import { LismaError } from '../types/LismaError';
import { Constant } from './types/Constant';
import { Variable } from './types/Variable';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';
import { Transition } from './types/Transition';
import { Expression } from '../expressions/Expression';
import { FloatExpression } from '../expressions/float/FloatExpression';
import { FloatConstExpression } from '../expressions/float/FloatConstExpression';
import { BooleanExpression } from '../expressions/boolean/BooleanExpression';
import { AssignStatement } from '../statements/AssignStatement';
import { ExpressionLismaVisitor } from '../expressions/ExpressionLismaVisitor';
import { DeadEndExpression } from '../expressions/DeadEndExpression';
import { WhenClause } from './types/WhenClause';
import { ParserRuleContext } from 'antlr4';

export class HybridSystemLismaListener extends LismaListener {
  private readonly exprVisitor: ExpressionLismaVisitor;
  private states: State[] = [];
  private diffStack: Variable[] = [];
  private algStack: Variable[] = [];
  private transitionStack: Transition[] = [];
  private whenClauseStack: WhenClause[] = [];
  private constants: Constant[] = [];
  private initials = new Map<string, FloatExpression>();
  private readonly variableTable = new Map<string, number>();
  private errors: LismaError[] = [];

  constructor() {
    super();
    this.exprVisitor = new ExpressionLismaVisitor(this.variableTable);
  }

  public getSystem(): HybridSystem {
    const initials = new Map(this.initials);
    this.states
      .flatMap(s => s.diffVariables)
      .forEach(diffVar => {
        if (!initials.has(diffVar.name)) {
          initials.set(diffVar.name, new FloatConstExpression(0));
        }
      });
    for (const [name, expression] of initials) {
      this.variableTable.set(name, expression.evaluate());
    }
    for (const constant of this.constants) {
      this.variableTable.set(constant.name, constant.expression.evaluate());
    }
    this.variableTable.set('time', 0);
    const sharedState = this.states.find(state => state.name === 'shared') ?? {
      name: 'shared',
      algVariables: [],
      diffVariables: [],
      onEnterStatements: [],
      transitions: [],
    };
    return {
      diffVariableNames: [
        ...new Set(this.states.flatMap(s => s.diffVariables).map(d => d.name)),
      ],
      algVariableNames: [
        ...new Set(this.states.flatMap(s => s.algVariables).map(d => d.name)),
      ],
      states: [...this.states],
      constants: [...this.constants],
      table: this.variableTable,
      sharedState: sharedState,
      activeState: sharedState,
      whenClauses: [...this.whenClauseStack],
    };
  }

  public getSemanticErrors(): LismaError[] {
    return [...this.errors];
  }

  enterState = (ctx: StateContext) => {
    this.states.push({
      name: ctx.ID().getText(),
      diffVariables: [],
      algVariables: [],
      transitions: [],
      onEnterStatements: [],
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exitState = (ctx: StateContext) => {
    const state = this.states.at(-1)!;
    state.transitions = [...this.transitionStack];
    this.transitionStack = [];
  };

  exitStatePart = (ctx: StatePartContext) => {
    if (ctx._part.text === 'body') {
      const state = this.states.at(-1)!;
      state.diffVariables = [...this.diffStack];
      state.algVariables = [...this.algStack];
      this.diffStack = [];
      this.algStack = [];
    } else if (ctx._part.text === 'onEnter') {
      const state = this.states.at(-1)!;
      state.onEnterStatements = [
        ...this.algStack.map(
          def =>
            new AssignStatement(def.name, def.expression, this.variableTable)
        ),
      ];
      this.algStack = [];
    }
  };

  exitDiffDef = (ctx: DiffDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      const token = ctx.ID().symbol;
      this.errors.push({
        charPosition: token.start,
        line: token.line,
        message: 'Diff variable should be defined by float type expression',
      });
      return;
    }
    this.diffStack.push({
      name: ctx.ID().getText(),
      expression: expression,
    });
  };

  exitAlgDef = (ctx: AlgDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      const token = ctx.ID().symbol;
      this.errors.push({
        charPosition: token.start,
        line: token.line,
        message: 'Alg variable should be defined by float type expression',
      });
      return;
    }
    this.algStack.push({
      name: ctx.ID().getText(),
      expression: expression,
    });
  };

  exitTransition = (ctx: TransitionContext) => {
    const predicate = this.getExpression(ctx, ctx => ctx.expr());
    if (!(predicate instanceof BooleanExpression)) {
      const token = ctx.LPAREN().symbol;
      this.errors.push({
        message: 'Transition expression must be of boolean type.',
        charPosition: token.column,
        line: token.line,
      });
      return;
    }
    this.transitionStack.push(
      ...ctx.ID_list().map(id => ({
        from: id.getText(),
        predicate: predicate,
      }))
    );
  };

  exitConstDef = (ctx: ConstDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      const token = ctx.ID().symbol;
      this.errors.push({
        charPosition: token.start,
        line: token.line,
        message: 'Constants must be of float type',
      });
      return;
    }
    this.constants.push({
      name: ctx.ID().getText(),
      expression: expression,
    });
  };

  exitInitCond = (ctx: InitCondContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      const token = ctx._eq;
      this.errors.push({
        charPosition: token.start + 1,
        line: token.line,
        message: 'Initial condition expression must be of float type',
      });
      return;
    }
    this.initials.set(ctx.ID().getText(), expression);
  };

  exitWhenStatement = (ctx: WhenStatementContext) => {
    const predicate = this.getExpression(ctx, ctx => ctx.expr());
    if (!(predicate instanceof BooleanExpression)) {
      this.errors.push({
        message: 'expression for "when" statement must be of boolean type',
        charPosition: ctx.start.start,
        line: ctx.start.line,
      });
      return;
    }
    this.whenClauseStack.push({
      predicate: predicate,
      statements: [
        ...this.algStack.map(
          def =>
            new AssignStatement(def.name, def.expression, this.variableTable)
        ),
      ],
    });
    this.algStack = [];
  };

  private getExpression<T extends ParserRuleContext>(
    ctx: T,
    expressionExtractor: (ctx: T) => ExprContext | undefined
  ): Expression {
    const exprCtx = expressionExtractor(ctx);
    if (!exprCtx) {
      return new DeadEndExpression({
        message:
          'Could not get expression context. Probably there are lex or syntax errors',
        charPosition: ctx.start.start,
        line: ctx.start.line,
      });
    }
    const expression = this.exprVisitor.visit(exprCtx);
    if (expression instanceof DeadEndExpression) {
      this.errors.push(expression.error);
    }
    return expression;
  }
}
