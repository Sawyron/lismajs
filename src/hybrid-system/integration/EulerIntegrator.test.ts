import EulerIntegrator from './EulerIntegrator';
import { DerivativeSystem } from './types/DerivativeSystem';
import { solve } from './solve';

describe('EulerIntegrator', () => {
  it('should work', () => {
    const system: DerivativeSystem = (x, [y]) => {
      return [2 * x, 3 * y];
    };
    const h = 0.00001;
    const integrator = new EulerIntegrator(h);
    const end = 2;

    const values = [0, 0];
    const steps = solve(system, { x: 0, values: values }, end, integrator);

    const target = steps.find(step => step.x >= 0.5);
    console.log(target);
  });
});
