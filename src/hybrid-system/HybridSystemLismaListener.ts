/* eslint-disable @typescript-eslint/no-unused-vars */
import LismaListener from '../gen/LismaListener';
import {
  ConstDefContext,
  DiffDefContext,
  ExprContext,
  InitCondContext,
  StateContext,
} from '../gen/LismaParser';
import { Constant } from './types/Consant';
import { DiffVariable } from './types/DiffVariable';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';

export default class HybridSystemLismaListener extends LismaListener {
  private readonly states: State[] = [];
  private readonly diffStack: DiffVariable[] = [];
  private readonly exprStack: string[] = [];
  private readonly constants: Constant[] = [];
  private readonly initials = new Map<string, string[]>();

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

  enterState = (ctx: StateContext) => {
    this.states.push({
      name: ctx.ID(0).getText(),
      predicate: [],
      diffVariables: [],
      from: ctx
        .ID_list()
        .slice(1)
        .map(node => node.getText()),
    });
  };

  exitState = (ctx: StateContext) => {
    const state = this.states.at(-1)!;
    state.diffVariables = [...this.diffStack];
    this.diffStack.splice(0, this.diffStack.length);
  };

  exitDiffDef = (ctx: DiffDefContext) => {
    this.diffStack.push({
      name: ctx.ID().getText(),
      expression: [...this.exprStack],
    });
    this.exprStack.splice(0, this.exprStack.length);
  };

  exitExpr = (ctx: ExprContext) => {
    if (ctx.ID()) {
      this.exprStack.push(ctx.ID().getText());
    } else if (ctx.NUMBER()) {
      this.exprStack.push(ctx.NUMBER().getText());
    } else if (ctx._luop) {
      const operation = ctx._luop.text;
      this.exprStack.push(operation);
    } else if (ctx._bop) {
      const opearation = ctx._bop.text;
      this.exprStack.push(opearation);
    }
    if (ctx.parentCtx instanceof StateContext) {
      const state = this.states.at(-1)!;
      state.predicate = [...this.exprStack];
      this.exprStack.splice(0, this.exprStack.length);
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
