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
  const values = system.diffVariableNames.map(
    value => system.table.get(value)!
  );
  const stateFromName = new Map<string, State>(
    system.states.map(state => [state.name, state])
  );
  const steps: IntegrationStep[] = [];
  const getCurrentTransitions = (): [string, Transition][] => {
    return system.states
      .filter(s => s.name !== system.activeState?.name)
      .flatMap(state => {
        const transitions = state.transitions.filter(
          t => t.from === system.activeState?.name
        );
        return transitions.map<[string, Transition]>(t => [state.name, t]);
      });
  };
  let transitions = getCurrentTransitions();
  let step = { x: 0, values: values };
  while (step.x <= end) {
    steps.push(step);
    for (const [stateName, transition] of transitions) {
      if (transition.predicate.evaluate()) {
        const state = stateFromName.get(stateName);
        system.activeState = state;
        transitions = getCurrentTransitions();
        if (state) {
          for (const action of state.onEnterExpressions) {
            if (action instanceof AssignExpression) {
              action.execute();
            }
          }
          system.diffVariableNames.forEach((variable, index) => {
            step.values[index] = system.table.get(variable)!;
          });
        }
        break;
      }
    }
    step = integrator.makeStep(ds, step);
  }
  return steps;
};

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
    const values = state.diffVariables.map(d => d.expression.evaluate());
    return [...values];
  };
};

export { evaluateHybridSystem };
