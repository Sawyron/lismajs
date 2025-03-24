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
  private states: State[] = [];
  private diffStack: DiffVariable[] = [];
  private exprStack: string[] = [];
  private transitionStack: Transition[] = [];
  private constants: Constant[] = [];
  private initials = new Map<string, string[]>();
  private errors: LismaError[] = [];

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
    this.diffStack.push({
      name: ctx.ID().getText(),
      expression: [...this.exprStack],
    });
    this.exprStack = [];
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
        message: 'Transition expression must be of boolean type.',
        charPosition: token.column,
        line: token.line,
      });
    }
    this.exprStack = [];
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
    this.exprStack = [];
  };

  exitInitCond = (ctx: InitCondContext) => {
    this.initials.set(ctx.ID().getText(), [...this.exprStack]);
    this.exprStack = [];
  };
}
