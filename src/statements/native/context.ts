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
  const diffNames = new Set(hs.diffVariableNames);
  const algNames = new Set(hs.algVariableNames);
  const stateVariableMaps = new Map(
    hs.states.map(state => [
      state.name,
      {
        diff: new Map(state.diffVariables.map(diff => [diff.name, diff])),
        alg: new Map(state.algVariables.map(alg => [alg.name, alg])),
      },
    ])
  );
  return (variableName: string, exprCode: string, stateName: string) => {
    if (!diffNames.has(variableName) && !algNames.has(variableName)) {
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
    const setOrAdd = (
      variables: Variable[],
      variableMap: Map<string, Variable>
    ) => {
      const variable = variableMap.get(variableName);
      if (variable !== undefined) {
        variable.expression = expr;
      } else {
        variables.push({ name: variableName, expression: expr });
      }
    };
    const stateMap = stateVariableMaps.get(stateName)!;
    if (diffNames.has(variableName)) {
      setOrAdd(state.diffVariables, stateMap.diff);
    } else if (algNames.has(variableName)) {
      setOrAdd(state.algVariables, stateMap.diff);
    }
  };
};

export { createHsSandboxContext, bindContextToHs };
