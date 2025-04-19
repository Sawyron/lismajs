import { Context, createContext } from 'vm';
import { HybridSystem, State, Variable } from '../../hybrid-system';
import { LismaParserVisitor } from '../../core';
import { Expression, FloatExpression } from '../../expressions';
import { visitText } from '../..';

const createHsSandboxContext = (): Context => {
  return createContext({ Math });
};

const bindContextToHs = (
  context: Context,
  hs: HybridSystem,
  exprVisitor: LismaParserVisitor<Expression>
) => {
  const getVar = (name: string) => hs.variableTable.get(name);
  const setVar = (name: string, value: number) =>
    hs.variableTable.set(name, value);
  const stateFromNameMap = new Map(hs.states.map(it => [it.name, it]));
  const setState = createSetState(hs, stateFromNameMap);
  const setExpr = createSetExpr(hs, stateFromNameMap, exprVisitor);

  context['setVar'] = setVar;
  context['getVar'] = getVar;
  context['setState'] = setState;
  context['setExpr'] = setExpr;
};

const createSetState =
  (
    hs: HybridSystem,
    stateFromName: Map<string, State>
  ): ((name: string) => void) =>
  (name: string) => {
    const state = stateFromName.get(name);
    if (state === undefined) {
      throw new Error(`State '${state}' not found`);
    }
    hs.activeState = state;
  };

const createSetExpr = (
  hs: HybridSystem,
  stateFromName: Map<string, State>,
  exprVisitor: LismaParserVisitor<Expression>
): ((variableName: string, exprCode: string, stateName: string) => void) => {
  const variableNames = new Set([
    ...hs.diffVariableNames,
    ...hs.algVariableNames,
  ]);
  return (variableName: string, exprCode: string, stateName: string) => {
    if (!variableNames.has(variableName)) {
      throw new Error(`Unknown variable '${variableName}'`);
    }
    const state = stateFromName.get(stateName);
    if (state === undefined) {
      throw new Error(`State ${stateName} not found`);
    }
    const expr = visitText(exprVisitor, exprCode, {}, parser => parser.expr());
    if (!(expr instanceof FloatExpression)) {
      throw new Error('Expression type must be float');
    }
    const setOrAdd = (variables: Variable[]) => {
      const variable = variables.find(it => it.name === variableName);
      if (variable !== undefined) {
        variable.expression = expr;
      } else {
        variables.push({ name: variableName, expression: expr });
      }
    };
    if (hs.diffVariableNames.find(it => it === variableName) !== undefined) {
      setOrAdd(state.diffVariables);
    } else if (hs.algVariableNames.find(it => it === variableName)) {
      setOrAdd(state.algVariables);
    }
  };
};

export { createHsSandboxContext, bindContextToHs };
