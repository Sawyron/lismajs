import { AssignExpression } from '../expressions/assign/AssignExpression';
import {
  DerivativeSystem,
  IntegrationStep,
  Integrator,
} from './integration/Integrator';
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
  let transitions = getTransitionsToState(system.activeState!, system);
  let step = {
    x: 0,
    values: system.diffVariableNames.map(value => system.table.get(value)!),
  } as IntegrationStep;
  while (step.x <= end) {
    steps.push(step);
    for (const [state, transition] of transitions) {
      if (transition.predicate.evaluate()) {
        system.activeState = state;
        transitions = getTransitionsToState(state, system);
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

const getTransitionsToState = (
  state: State,
  hs: HybridSystem
): [State, Transition][] =>
  hs.states
    .filter(s => s.name !== state.name)
    .flatMap(state =>
      state.transitions
        .filter(t => t.from === state.name)
        .map<[State, Transition]>(t => [state, t])
    );

const mapHsToDs = (hs: HybridSystem): DerivativeSystem => {
  return (x, y) => {
    const state = hs.activeState;
    if (state === undefined) {
      throw Error();
    }
    hs.diffVariableNames.forEach((name, index) => {
      hs.table.set(name, y[index]);
    });
    hs.table.set('time', x);
    return state.diffVariables.map(d => d.expression.evaluate());
  };
};

export { evaluateHybridSystem };
