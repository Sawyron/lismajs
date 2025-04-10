import { walkOnText } from '../..';
import { evaluateHybridSystem } from './Evaluate';
import { HybridSystemLismaListener } from '../HybridSystemLismaListener';
import EulerIntegrator from '../../integration/EulerIntegrator';
import fs from 'fs/promises';
import RungeKutta2Integrator from '../../integration/RungeKutta2Integrator';

describe('Evaluate', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          x' = 2 * time;
          y' = 3 * x;
          z = 3 * time;
          t' = z;
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
    console.log(JSON.stringify(result.slice(0, 10), null, 2));
    const target = result.find(res => res.x >= 0.5);
    console.log(target);
  });

  it('should work with when statement', async () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          x' = 2;
      }
    };
    when (x >= 0.5) {
        x = 0;
    }
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.001),
      0,
      1
    );
    await fs.mkdir('./out', { recursive: true });
    await fs.writeFile('./out/when_test.json', JSON.stringify(result, null, 4));
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

    state up {
        onEnter {
            v = -v;
        }
    } from shared, down on (y < 0);

    state down {
        body {
            v' = -g;
            y' = v;
        }
    } from shared, up on (v < 0);
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
    await fs.writeFile('./out/ball.json', JSON.stringify(result, null, 4));
  });

  it('should evaluate masses', async () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    const k1 = 1;
    const n1 = 1;
    const m1 = 1;
    const m2 = 1;
    const k2 = 2;
    const n2 = 2;

    x1 (t0) = 0;
    x2 (t0) = 3; 

    state shared {
      body {
          x1 '= 0;
          x2 '= 0;
          v1 '= 0;
          v2 '= 0;
          a1 = 0;
          a2 = 0;
          st '= 0;
      }
    };

    state separate {
        body {
          x1'= v1;
          v1'= k1 * (n1 - x1) / m1;
          x2'= v2;
          v2'= k2 * (n2 - x2) / m2;

          a1 = k1 * (n1 - x1) / m1;
          a2 = k2 * (n2 - x2) / m2;
          st '= 0;
        }
        onEnter {
            st = 10;
        }
    } from shared, together on (st < abs(k1 * n1 - k2 * n2- x1 * (k1 - k2)));

    state together {
        body {
            v1' = (k1 * n1 + k2 * n2 - x1 * (k1 + k2)) / (m1 + m2);
            v2' = (k1 * n1 + k2 * n2 - x2 * (k1 + k2)) / (m1 + m2);
            x1' = v1;
            x2' = v2;

            a1 = (k1 * n1 + k2 * n2 - x1 * (k1 + k2)) / (m1 + m2);
            a2 = (k1 * n1 + k2 * n2 - x2 * (k1 + k2)) / (m1 + m2);
            st'= -st;
        }
        onEnter {
            st = 10;
            v1 = (m1 * v1 + m2 * v2) / (m1 + m2);
            v2 = v1;
        }
    } from shared, separate on (x1 > =x2 && v1 >= v2);
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      10
    );

    await fs.mkdir('./out', { recursive: true });
    await fs.writeFile('./out/masses.json', JSON.stringify(result, null, 4));
  });
});
