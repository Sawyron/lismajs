import { AssignExpression } from '../expressions/assign/AssignExpression';
import {
  DerivativeSystem,
  IntegrationStep,
  Integrator,
} from './integration/Integrator';
import { DiffVariable } from './types/DiffVariable';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';
import { Transition } from './types/Transition';

const evaluateHybridSystem = (
  system: HybridSystem,
  integrator: Integrator,
  end: number
): IntegrationStep[] => {
  const ds = mapHsToDs(system);
  const steps: IntegrationStep[] = [];
  let transitions = getTransitionsFromState(system.activeState, system);
  let step = {
    x: 0,
    values: system.diffVariableNames.map(value => system.table.get(value)!),
  } as IntegrationStep;
  while (step.x <= end) {
    steps.push(step);
    for (const [state, transition] of transitions) {
      if (transition.predicate.evaluate()) {
        system.activeState = state;
        transitions = getTransitionsFromState(state, system);
        for (const action of state.onEnterExpressions) {
          if (action instanceof AssignExpression) {
            action.execute();
          }
        }
        system.diffVariableNames.forEach((variable, index) => {
          step.values[index] = system.table.get(variable)!;
        });
        break;
      }
    }
    step = integrator.makeStep(ds, step);
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
  return (x, y) => {
    const { activeState } = hs;
    hs.diffVariableNames.forEach((name, index) => {
      hs.table.set(name, y[index]);
    });
    hs.table.set('time', x);
    const activeStateDiffMap = statesDiffMaps.get(activeState.name)!;
    const diffVariables = hs.diffVariableNames.map(
      diffName =>
        activeStateDiffMap.get(diffName) ?? sharedDiffMapMap.get(diffName)!
    );
    return diffVariables.map(d => d.expression.evaluate());
  };
};

const stateToDiffMap = (state: State): Map<string, DiffVariable> =>
  new Map(state.diffVariables.map(diff => [diff.name, diff]));

export { evaluateHybridSystem };
