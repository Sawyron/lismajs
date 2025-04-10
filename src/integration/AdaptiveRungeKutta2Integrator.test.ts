import AdaptiveRungeKutta2Integrator from './AdaptiveRungeKutta2Integrator';
import { DerivativeSystem } from './types/DerivativeSystem';
import { solveOdeSystem } from './solve';

describe('AdaptiveRungeKutta2Integrator', () => {
  it('should work', () => {
    const system: DerivativeSystem = (x, [y]) => {
      return [y];
    };
    const tol = 1e-3;
    const h = 0.00001;
    const integrator = new AdaptiveRungeKutta2Integrator(h, tol);
    const end = 5;

    const values = [1];
    const steps = solveOdeSystem(system, { x: 0, values }, end, integrator);

    console.log(steps.at(-1));
  });
});
