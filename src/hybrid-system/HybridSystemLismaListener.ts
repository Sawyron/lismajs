/* eslint-disable @typescript-eslint/no-unused-vars */
import LismaListener from '../gen/LismaListener';
import { DiffDefContext, ExprContext, StateContext } from '../gen/LismaParser';

type DiffVariable = {
  name: string;
  expression: string[];
};

type State = {
  name: string;
  predicate: string[];
  diffVariables: DiffVariable[];
  from: string[];
};

export default class HybridSystemLismaListener extends LismaListener {
  private readonly states: State[] = [];

  private readonly diffStack: DiffVariable[] = [];
  private readonly exprStack: string[] = [];

  public getStates(): State[] {
    return [...this.states];
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
}
