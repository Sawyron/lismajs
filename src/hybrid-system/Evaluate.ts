import {
  DerivativeSystem,
  IntegrationStep,
  Integrator,
} from './integration/Integrator';
import { HybridSystem } from './types/HybridSystem';
import { State } from './types/State';

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
  let step = { x: 0, values: values };
  while (step.x <= end) {
    steps.push(step);
    const state = system.activeState!;
    for (const transition of state.transitions) {
      if (transition.predicate.evaluate()) {
        system.activeState = stateFromName.get(transition.from);
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
