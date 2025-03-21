/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Constant } from './types/Consant';
import { DiffVariable } from './types/DiffVariable';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';
import { Transtion as Transition } from './types/Transition';
import { checkExpressionType } from '../expressions';
import { DataType } from '../expressions/DataType';

export default class HybridSystemLismaListener extends LismaListener {
  private readonly states: State[] = [];
  private readonly diffStack: DiffVariable[] = [];
  private readonly exprStack: string[] = [];
  private readonly transitionStack: Transition[] = [];
  private readonly constants: Constant[] = [];
  private readonly initials = new Map<string, string[]>();
  private readonly errors: LismaError[] = [];

  public getSystem(): HybridSystem {
    const initials = new Map(this.initials);
    this.states
      .flatMap(s => s.diffVariables)
      .forEach(diffVar => {
        if (!initials.has(diffVar.name)) {
          initials.set(diffVar.name, ['0']);
        }
      });
    return {
      diffVariableNames: [
        ...new Set(this.states.flatMap(s => s.diffVariables).map(d => d.name)),
      ],
      states: [...this.states],
      constants: [...this.constants],
      initials: initials,
    };
  }

  public getSemanticErrors(): LismaError[] {
    return [...this.errors];
  }

  enterState = (ctx: StateContext) => {
    this.states.push({
      name: ctx.ID().getText(),
      diffVariables: [],
      transitions: [],
    });
  };

  exitState = (ctx: StateContext) => {
    const state = this.states.at(-1)!;
    state.diffVariables = [...this.diffStack];
    state.transitions = [...this.transitionStack];
    this.diffStack.splice(0, this.diffStack.length);
    this.transitionStack.splice(0, this.transitionStack.length);
  };

  exitDiffDef = (ctx: DiffDefContext) => {
    this.diffStack.push({
      name: ctx.ID().getText(),
      expression: [...this.exprStack],
    });
    this.exprStack.splice(0, this.exprStack.length);
  };

  exitTransition = (ctx: TransitionContext) => {
    this.transitionStack.push(
      ...ctx.ID_list().map(id => ({
        from: id.getText(),
        condition: [...this.exprStack],
      }))
    );
    if (checkExpressionType(this.exprStack) !== DataType.Boolean) {
      const token = ctx.LPAREN().symbol;
      this.errors.push({
        message: 'Transtion expression must be of boolean type.',
        charPosition: token.column,
        line: token.line,
      });
    }
    this.exprStack.splice(0, this.exprStack.length);
  };

  exitExpr = (ctx: ExprContext) => {
    if (ctx.ID()) {
      this.exprStack.push(ctx.ID().getText());
    } else if (ctx.NUMBER()) {
      this.exprStack.push(ctx.NUMBER().getText());
    } else if (ctx._luop) {
      this.exprStack.push(ctx._luop.text);
    } else if (ctx._bop) {
      this.exprStack.push(ctx._bop.text);
    }
  };

  exitConstDef = (ctx: ConstDefContext) => {
    this.constants.push({
      name: ctx.ID().getText(),
      expression: [...this.exprStack],
    });
    this.exprStack.splice(0, this.exprStack.length);
  };

  exitInitCond = (ctx: InitCondContext) => {
    this.initials.set(ctx.ID().getText(), [...this.exprStack]);
    this.exprStack.splice(0, this.exprStack.length);
  };
}
