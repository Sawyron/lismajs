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
} from '../gen/LismaParser';
import { LismaError } from '../types/LismaError';
import { Constant } from './types/Constant';
import { Variable } from './types/Variable';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';
import { Transition } from './types/Transition';
import Expression from '../expressions/Expression';
import {
  FloatConstExpression,
  FloatExpression,
} from '../expressions/float/FloatExpression';
import { BinaryBooleanExpression } from '../expressions/boolean/BinaryBooleanExpression';
import { BinaryFloatExpression } from '../expressions/float/FloatBinaryExpression';
import { BooleanExpression } from '../expressions/boolean/BooleanExpression';
import { FloatVariableExpression } from '../expressions/float/FloatVariableExpression';
import { AssignExpression } from '../expressions/assign/AssignExpression';
import { FloatUnaryExpression } from '../expressions/float/FloatUnaryExpression';

export default class HybridSystemLismaListener extends LismaListener {
  private states: State[] = [];
  private diffStack: Variable[] = [];
  private algStack: Variable[] = [];
  private expressionStack: Expression[] = [];
  private transitionStack: Transition[] = [];
  private constants: Constant[] = [];
  private initials = new Map<string, FloatExpression>();
  private readonly variableTable = new Map<string, number>();
  private errors: LismaError[] = [];

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
    const sharedState = this.states.find(state => state.name === 'shared');
    if (sharedState === undefined) {
      this.errors.push({
        line: 0,
        charPosition: 0,
        message: 'Shared state is not defined',
      });
    }
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
      sharedState: sharedState!,
      activeState: sharedState!,
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
      onEnterExpressions: [],
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
      state.onEnterExpressions = [
        ...this.algStack.map(
          def =>
            new AssignExpression(def.name, def.expression, this.variableTable)
        ),
      ];
      this.algStack = [];
    }
  };

  exitDiffDef = (ctx: DiffDefContext) => {
    const expression = this.expressionStack.pop();
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
    const expression = this.expressionStack.pop();
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
    const predicate = this.expressionStack.pop()!;
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

  exitExpr = (ctx: ExprContext) => {
    if (ctx.ID()) {
      this.expressionStack.push(
        new FloatVariableExpression(ctx.ID().getText(), this.variableTable)
      );
    } else if (ctx.NUMBER()) {
      this.expressionStack.push(
        new FloatConstExpression(Number(ctx.NUMBER().getText()))
      );
    } else if (ctx._luop) {
      const operation = ctx._luop.text;
      if (FloatUnaryExpression.operations.has(operation)) {
        const expression = this.expressionStack.pop()!;
        if (!(expression instanceof FloatExpression)) {
          return;
        }
        this.expressionStack.push(
          new FloatUnaryExpression(expression, operation)
        );
      } else {
        this.errors.push({
          charPosition: ctx._luop.start,
          line: ctx._luop.line,
          message: 'Can not apply unary operation',
        });
      }
    } else if (ctx._bop) {
      const right = this.expressionStack.pop()!;
      const left = this.expressionStack.pop()!;
      const operation = ctx._bop.text;
      if (BinaryBooleanExpression.operations.has(operation)) {
        this.expressionStack.push(
          new BinaryBooleanExpression(left, right, operation)
        );
      } else if (BinaryFloatExpression.operations.has(operation)) {
        this.expressionStack.push(
          new BinaryFloatExpression(left, right, operation)
        );
      }
    }
  };

  exitConstDef = (ctx: ConstDefContext) => {
    const expression = this.expressionStack.pop();
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
    const expression = this.expressionStack.pop();
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
}
