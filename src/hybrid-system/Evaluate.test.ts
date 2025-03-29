import { walkOnText } from '..';
import { evaluateHybridSystem } from './Evaluate';
import HybridSystemLismaListener from './HybridSystemLismaListener';
import EulerIntegrator from './integration/EulerIntegrator';

describe('Evaluate', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
      x' = 2 * time;
      y' = 3 * x;
    } from b on (1 >= 2)
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const result = evaluateHybridSystem(system, new EulerIntegrator(0.001), 1);
    console.log(result);
    const target = result.find(res => res.x >= 0.5);
    console.log(target);
  });
});
