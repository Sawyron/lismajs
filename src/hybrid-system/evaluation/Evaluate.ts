import { AssignExpression } from '../../expressions/assign/AssignExpression';
import { Integrator } from '../integration/types/Integrator';
import { IntegrationStep } from '../integration/types/IntegrationStep';
import { DerivativeSystem } from '../integration/types/DerivativeSystem';
import { Variable } from '../types/Variable';
import { HybridSystem } from '../types/HybridSystem';
import { State } from '../types/State';
import { Transition } from '../types/Transition';
import { EquationSystem } from './types/EquationSystem';

const evaluateHybridSystem = (
  hybridSystem: HybridSystem,
  integrator: Integrator,
  start: number,
  end: number
): IntegrationStep[] => {
  const ds = mapHsToDs(hybridSystem);
  const steps: IntegrationStep[] = [];
  let transitions = getTransitionsFromState(
    hybridSystem.activeState,
    hybridSystem
  );
  let integrationStep = {
    x: start,
    values: hybridSystem.diffVariableNames.map(
      value => hybridSystem.table.get(value)!
    ),
  } as IntegrationStep;
  while (integrationStep.x <= end) {
    for (const [state, transition] of transitions) {
      if (transition.predicate.evaluate()) {
        hybridSystem.activeState = state;
        transitions = getTransitionsFromState(state, hybridSystem);
        for (const action of state.onEnterExpressions) {
          if (action instanceof AssignExpression) {
            action.execute();
          }
        }
        hybridSystem.diffVariableNames.forEach((variable, index) => {
          integrationStep.values[index] = hybridSystem.table.get(variable)!;
        });
        break;
      }
    }
    steps.push(integrationStep);
    integrationStep = integrator.makeStep(ds, integrationStep);
    hybridSystem.table.set('time', integrationStep.x);
    hybridSystem.diffVariableNames.forEach((name, index) => {
      hybridSystem.table.set(name, integrationStep.values[index]);
    });
  }
  return steps;
};

const getTransitionsFromState = (
  targetState: State,
  hs: HybridSystem
): [State, Transition][] =>
  hs.states
    .filter(s => s.name !== targetState.name)
    .flatMap(state =>
      state.transitions
        .filter(t => t.from === targetState.name)
        .map<[State, Transition]>(t => [state, t])
    );

const mapHsToDs = (hs: HybridSystem): DerivativeSystem => {
  const sharedDiffMapMap = stateToDiffMap(hs.sharedState);
  const statesDiffMaps = new Map(
    hs.states.map(state => [state.name, stateToDiffMap(state)])
  );
  return () => {
    const { activeState } = hs;
    const activeStateDiffMap = statesDiffMaps.get(activeState.name)!;
    const diffVariables = hs.diffVariableNames.map(
      diffName =>
        activeStateDiffMap.get(diffName) ?? sharedDiffMapMap.get(diffName)!
    );
    return diffVariables.map(d => d.expression.evaluate());
  };
};

const mapHsToEs = (hs: HybridSystem): EquationSystem => {
  const sharedAlgMap = stateToAlgMap(hs.sharedState);
  const stateAlgMaps = new Map(
    hs.states.map(state => [state.name, stateToAlgMap(state)])
  );
  return () => {
    const { activeState } = hs;
    const activeStateAlgMap = stateAlgMaps.get(activeState.name)!;
    const algVariables = hs.algVariableNames.map(
      algName => activeStateAlgMap.get(algName) ?? sharedAlgMap.get(algName)!
    );
    return algVariables.map(a => a.expression.evaluate());
  };
};

const stateToDiffMap = (state: State): Map<string, Variable> =>
  new Map(state.diffVariables.map(diff => [diff.name, diff]));

const stateToAlgMap = (state: State): Map<string, Variable> =>
  new Map(state.algVariables.map(alg => [alg.name, alg]));

export { evaluateHybridSystem };
