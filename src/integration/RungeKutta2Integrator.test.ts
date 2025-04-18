import RungeKutta2Integrator from './RungeKutta2Integrator';
import { DerivativeSystem } from './types/DerivativeSystem';
import { solveOdeSystem } from './solve';
import { describe, it } from '@jest/globals';

describe('RungeKutta2Integrator', () => {
  it('should work', () => {
    const system: DerivativeSystem = (x, [y]) => {
      return [y];
    };
    const h = 0.00001;
    const integrator = new RungeKutta2Integrator(h);
    const end = 5;

    const values = [1];
    const steps = solveOdeSystem(system, { x: 0, values }, end, integrator);

    console.log(steps.at(-1));
  });
});
