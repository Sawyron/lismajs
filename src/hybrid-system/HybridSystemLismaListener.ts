import LismaListener from '../gen/LismaListener';
import {
  ConstDefContext,
  DiffDefContext,
  ExprContext,
  InitCondContext,
  StateContext,
  TransitionContext,
} from '../gen/LismaParser';
import { LismaError } from '../types/LismaError';
import { Constant } from './types/Constant';
import { DiffVariable } from './types/DiffVariable';
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

export default class HybridSystemLismaListener extends LismaListener {
  private states: State[] = [];
  private diffStack: DiffVariable[] = [];
  //private exprStack: string[] = [];
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
    return {
      diffVariableNames: [
        ...new Set(this.states.flatMap(s => s.diffVariables).map(d => d.name)),
      ],
      states: [...this.states],
      constants: [...this.constants],
      table: this.variableTable,
      activeState: this.states.at(0),
    };
  }

  public getSemanticErrors(): LismaError[] {
    return [...this.errors];
  }

  exitState = (ctx: StateContext) => {
    this.states.push({
      name: ctx.ID().getText(),
      diffVariables: [...this.diffStack],
      transitions: [...this.transitionStack],
    });
    this.diffStack = [];
    this.transitionStack = [];
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
      //this.exprStack.push(ctx._luop.text);
    } else if (ctx._bop) {
      const right = this.expressionStack.pop()!;
      const left = this.expressionStack.pop()!;
      const operation = ctx._bop.text;
      if (BinaryBooleanExpression.operations.has(operation)) {
        this.expressionStack.push(
          new BinaryBooleanExpression(left, right, operation)
        );
      }
      if (BinaryFloatExpression.operations.has(operation)) {
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
