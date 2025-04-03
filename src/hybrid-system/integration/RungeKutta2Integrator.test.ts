import RungeKutta2Integrator from './RungeKutta2Integrator';
import { DerivativeSystem } from './types/DerivativeSystem';
import { solve } from './solve';

describe('RungeKutta2Integrator', () => {
  it('should work', () => {
    const system: DerivativeSystem = (x, [y]) => {
      return [y];
    };
    const h = 0.00001;
    const integrator = new RungeKutta2Integrator(h);
    const end = 5;

    const values = [1];
    const steps = solve(system, { x: 0, values }, end, integrator);

    const target = steps.find(step => step.x >= 0.4);
    console.log(steps[steps.length - 1]);
  });
});
