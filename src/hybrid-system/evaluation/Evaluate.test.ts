import { walkOnText } from '../..';
import { evaluateHybridSystem } from './Evaluate';
import HybridSystemLismaListener from '../HybridSystemLismaListener';
import EulerIntegrator from '../integration/EulerIntegrator';
import fs from 'fs/promises';

describe('Evaluate', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          x' = 2 * time;
          y' = 3 * x;
      }
    } from b on (1 >= 2);
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.001),
      0,
      1
    );
    console.log(result);
    const target = result.find(res => res.x >= 0.5);
    console.log(target);
  });

  it('should evaluate ball', async () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    const g = 9.81;
    y(t0) = 10;

    state shared {
      body {
          v' = -g;
          y' = v;
      }
    };

    state vzlet {
        onEnter {
            v = -v;
        }
    } from shared, padenie on (y < 0);

    state padenie {
        body {
            v' = -g;
            y' = v;
        }
    } from shared, vzlet on (v < 0);
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.001),
      0,
      10
    );

    await fs.mkdir('./out', { recursive: true });
    await fs.writeFile('./out/ball.json', JSON.stringify(result));
  });
});
