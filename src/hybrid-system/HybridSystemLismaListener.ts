import {
  AlgDefContext,
  ArrayDefinitionContext,
  ConstDefContext,
  DiffDefContext,
  ExprContext,
  IfStatementContext,
  InitCondContext,
  StateContext,
  StatePartContext,
  TransitionContext,
  VarDefContext,
  WhenStatementContext,
  WhileStatementContext,
} from '../gen/LismaParser';
import { LismaError } from '../types/LismaError';
import { Constant } from './types/Constant';
import { Variable } from './types/Variable';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';
import { Transition } from './types/Transition';
import { Expression } from '../expressions/Expression';
import { FloatExpression } from '../expressions/float/FloatExpression';
import { ConstFloatExpression } from '../expressions/float/ConstFloatExpression';
import { BooleanExpression } from '../expressions/boolean/BooleanExpression';
import { AssignStatement } from '../statements/AssignStatement';
import { ExpressionLismaVisitor } from '../expressions/ExpressionLismaVisitor';
import { DeadEndExpression } from '../expressions/DeadEndExpression';
import { WhenClause } from './types/WhenClause';
import { ParserRuleContext } from 'antlr4';
import { IfClause } from './types/IfClause';
import { errorFromRuleContext } from '../expressions/util';
import { topologicallySortEquations } from '../expressions/dependencyResolution';
import {
  bindContextToHs,
  createHsSandboxContext,
} from '../statements/native/context';
import { Context } from 'vm';
import { ArrayDef } from './types/ArrayDef';
import LismaParserListener from '../gen/LismaParserListener';
import { NativeStatement } from '../statements/native/NativeStatement';
import { StatementLismaVisitor } from '../statements/StatementLismaVisitor';
import { WhileClause } from './types/WhileClause';

export class HybridSystemLismaListener extends LismaParserListener {
  private readonly exprVisitor: ExpressionLismaVisitor;
  private readonly statementVisitor: StatementLismaVisitor;
  private assignments: { id: string; context: ParserRuleContext }[] = [];
  private states: State[] = [];
  private diffStack: Variable[] = [];
  private algStack: Variable[] = [];
  private transitionStack: Transition[] = [];
  private whenClauseStack: WhenClause[] = [];
  private ifClauseStack: IfClause[] = [];
  private whileClauseStack: WhileClause[] = [];
  private arrayStack: ArrayDef[] = [];
  private constants: Constant[] = [];
  private variables: Variable[] = [];
  private initials = new Map<string, FloatExpression>();
  private readonly variableTable = new Map<string, number>();
  private readonly arrayTable = new Map<string, number[]>();
  private readonly nativeContext: Context;
  private errors: LismaError[] = [];

  constructor() {
    super();
    this.exprVisitor = new ExpressionLismaVisitor(
      this.variableTable,
      this.arrayTable
    );
    this.nativeContext = createHsSandboxContext();
    this.statementVisitor = new StatementLismaVisitor(
      this.exprVisitor,
      code => new NativeStatement(this.nativeContext, code),
      (id, expr) => new AssignStatement(id, expr, this.variableTable)
    );
  }

  public getSystem(): HybridSystem {
    const initials = new Map(this.initials);
    this.states
      .flatMap(s => s.diffVariables)
      .forEach(diffVar => {
        if (!initials.has(diffVar.name)) {
          initials.set(diffVar.name, new ConstFloatExpression(0));
        }
      });
    for (const [name, expression] of initials) {
      this.variableTable.set(name, expression.evaluate());
    }
    for (const constant of this.constants) {
      this.variableTable.set(constant.name, constant.expression.evaluate());
    }
    for (const variable of this.variables) {
      this.variableTable.set(variable.name, variable.expression.evaluate());
    }

    const constantNames = new Set(this.constants.map(it => it.name));
    for (const { id, context } of this.assignments) {
      if (constantNames.has(id)) {
        this.errors.push(
          errorFromRuleContext(
            context,
            `Cannot assign to '${id}' because it is a constant`
          )
        );
      }
    }

    this.variableTable.set('time', 0);
    let sharedState = this.states.find(state => state.name === 'shared');
    if (sharedState === undefined) {
      sharedState = {
        name: 'shared',
        algVariables: [],
        diffVariables: [],
        onEnterStatements: [],
        transitions: [],
      };
      this.states.push(sharedState);
    }
    for (const arrayDef of this.arrayStack) {
      this.arrayTable.set(
        arrayDef.name,
        arrayDef.values.map(it => it.evaluate())
      );
    }
    const system = {
      diffVariableNames: [
        ...new Set(this.states.flatMap(s => s.diffVariables).map(d => d.name)),
      ],
      algVariableNames: [
        ...new Set(this.states.flatMap(s => s.algVariables).map(d => d.name)),
      ],
      arrayNames: this.arrayStack.map(it => it.name),
      states: [...this.states],
      constants: [...this.constants],
      variables: [...this.variables],
      variableTable: this.variableTable,
      arrayTable: this.arrayTable,
      sharedState: sharedState,
      activeState: sharedState,
      whenClauses: [...this.whenClauseStack],
      ifClauses: [...this.ifClauseStack],
      whileClauses: [...this.whileClauseStack],
      context: this.nativeContext,
    };
    this.states = [];
    this.constants = [];
    this.variables = [];
    this.variableTable.clear();
    this.whenClauseStack = [];
    this.ifClauseStack = [];
    this.whileClauseStack = [];
    bindContextToHs(system.context, system, this.exprVisitor);
    return system;
  }

  public getSemanticErrors(): LismaError[] {
    return [...this.exprVisitor.errors, ...this.errors];
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

  exitState = (ctx: StateContext) => {
    const state = this.states.at(-1);
    if (!state) {
      return;
    }
    const algVarIdToExpr = new Map(
      state.algVariables.map(alg => [alg.name, alg.expression])
    );
    const [sortedAlgVariables, cycledAlgVariables] =
      topologicallySortEquations(algVarIdToExpr);
    for (const cycleId of cycledAlgVariables) {
      this.errors.push(
        errorFromRuleContext(ctx, `Recursive dependency found for ${cycleId}`)
      );
    }
    const idToVariable = new Map(
      state.algVariables.map(alg => [alg.name, alg])
    );
    state.algVariables = sortedAlgVariables.map(alg => idToVariable.get(alg)!);
    state.transitions = [...this.transitionStack];
    this.transitionStack = [];
  };

  exitStatePart = (ctx: StatePartContext) => {
    if (ctx._part.text === 'body') {
      const state = this.states.at(-1);
      if (!state) {
        return;
      }
      if (state.algVariables.length > 0 || state.diffVariables.length > 0) {
        this.errors.push(
          errorFromRuleContext(ctx, 'State can only have one "body" block')
        );
      }
      state.diffVariables = [...this.diffStack];
      state.algVariables = [...this.algStack];
      this.diffStack = [];
      this.algStack = [];
    } else if (ctx._part.text === 'onEnter') {
      const state = this.states.at(-1);
      if (!state) {
        return;
      }
      if (state.onEnterStatements.length > 0) {
        this.errors.push(
          errorFromRuleContext(ctx, 'State can only have one "onEnter" block')
        );
      }
      state.onEnterStatements = ctx
        .discreteStatement_list()
        .map(it => this.statementVisitor.visit(it));
      this.algStack = [];
    }
  };

  exitDiffDef = (ctx: DiffDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'Diff variable should be defined by float type expression'
        )
      );
      return;
    }
    this.diffStack.push({
      name: ctx.ID().getText(),
      expression: expression,
    });
    this.assignments.push({ id: ctx.ID().getText(), context: ctx });
  };

  exitAlgDef = (ctx: AlgDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'Alg variable should be defined by float type expression'
        )
      );
      return;
    }
    this.algStack.push({
      name: ctx.ID().getText(),
      expression: expression,
    });
    this.assignments.push({ id: ctx.ID().getText(), context: ctx });
  };

  exitArrayDefinition = (ctx: ArrayDefinitionContext) => {
    const expressions: FloatExpression[] = [];
    for (const exprCtx of ctx.expr_list()) {
      const expression = this.exprVisitor.visit(exprCtx);
      if (!(expression instanceof FloatExpression)) {
        this.errors.push(
          errorFromRuleContext(exprCtx, 'Array values may only be floats')
        );
      } else {
        expressions.push(expression);
      }
    }
    this.arrayStack.push({
      name: ctx.ID().getText(),
      values: expressions,
    });
  };

  exitTransition = (ctx: TransitionContext) => {
    const predicate = this.getExpression(ctx, ctx => ctx.expr());
    if (!(predicate instanceof BooleanExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'Transition expression must be of boolean type.'
        )
      );
      return;
    }
    this.transitionStack.push(
      ...ctx.ID_list().map(id => ({
        from: id.getText(),
        predicate: predicate,
      }))
    );
  };

  exitVarDef = (ctx: VarDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.idDef().expr());
    if (!(expression instanceof FloatExpression)) {
      this.errors.push(
        errorFromRuleContext(ctx, 'Constants must be of float type')
      );
      return;
    }
    this.variables.push({
      name: ctx.idDef().ID().getText(),
      expression: expression,
    });
  };

  exitConstDef = (ctx: ConstDefContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.idDef().expr());
    if (!(expression instanceof FloatExpression)) {
      this.errors.push(
        errorFromRuleContext(ctx, 'Variables must be of float type')
      );
      return;
    }
    this.constants.push({
      name: ctx.idDef().ID().getText(),
      expression: expression,
    });
  };

  exitInitCond = (ctx: InitCondContext) => {
    const expression = this.getExpression(ctx, ctx => ctx.expr());
    if (!(expression instanceof FloatExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'Initial condition expression must be of float type'
        )
      );
      return;
    }
    this.initials.set(ctx.ID().getText(), expression);
  };

  exitWhenStatement = (ctx: WhenStatementContext) => {
    const predicate = this.getExpression(ctx, ctx => ctx.expr());
    if (!(predicate instanceof BooleanExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'expression for "when" statement must be of boolean type'
        )
      );
      return;
    }
    this.whenClauseStack.push({
      predicate: predicate,
      statements: ctx
        .discreteStatement_list()
        .map(it => this.statementVisitor.visit(it)),
    });
    this.algStack = [];
  };

  exitIfStatement = (ctx: IfStatementContext) => {
    const predicate = this.getExpression(ctx, ctx => ctx.expr());
    if (!(predicate instanceof BooleanExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'expression for "if" statement must be of boolean type'
        )
      );
      return;
    }
    this.ifClauseStack.push({
      predicate: predicate,
      algVariables: [...this.algStack],
      diffVariables: [...this.diffStack],
    });
    this.diffStack = [];
    this.algStack = [];
  };

  exitWhileStatement = (ctx: WhileStatementContext) => {
    const predicate = this.getExpression(ctx, ctx => ctx.expr());
    if (!(predicate instanceof BooleanExpression)) {
      this.errors.push(
        errorFromRuleContext(
          ctx,
          'expression for "while" statement must be of boolean type'
        )
      );
      return;
    }
    this.whileClauseStack.push({
      predicate: predicate,
      statements: ctx
        .discreteStatement_list()
        .map(it => this.statementVisitor.visit(it)),
    });
    this.algStack = [];
  };

  private getExpression<T extends ParserRuleContext>(
    ctx: T,
    expressionExtractor: (ctx: T) => ExprContext | undefined
  ): Expression {
    const exprCtx = expressionExtractor(ctx);
    if (!exprCtx) {
      return new DeadEndExpression(
        errorFromRuleContext(
          ctx,
          'Could not get expression context. Probably there are lex or syntax errors'
        )
      );
    }
    return this.exprVisitor.visit(exprCtx);
  }
}
