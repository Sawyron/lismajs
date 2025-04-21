import { CompileConfig, LismaErrorListener, walkOnText } from '../..';
import { evaluateHybridSystem } from './Evaluate';
import { HybridSystemLismaListener } from '../HybridSystemLismaListener';
import EulerIntegrator from '../../integration/EulerIntegrator';
import fs from 'fs/promises';
import RungeKutta2Integrator from '../../integration/RungeKutta2Integrator';
import { Token } from 'antlr4';
import { describe, it } from '@jest/globals';
import { EvaluationStep, VariableValue } from './types/EvaluationStep';
import { createWriteStream } from 'fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { HybridSystem } from '../types/HybridSystem';
import { TransformCallback } from 'stream';

const mapStepToCsv = (step: EvaluationStep): string =>
  [step.x, ...step.values.map(variable => variable.value)].join(',');

class StepCsvTransform extends Transform {
  private headerWritten = false;

  constructor(
    private readonly hs: HybridSystem,
    private readonly delimiter: string = ','
  ) {
    super({ readableObjectMode: false, writableObjectMode: true });
  }

  _transform(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: TransformCallback
  ): void {
    if (!StepCsvTransform.isStep(chunk)) {
      callback(new Error(`${chunk} is not a step`));
      return;
    }
    try {
      if (!this.headerWritten) {
        this.push(
          [
            'time',
            ...this.hs.diffVariableNames,
            ...this.hs.algVariableNames,
            ...this.hs.arrayNames.flatMap(arrayName => {
              const array = this.hs.arrayTable.get(arrayName)!;
              return array.map((value, index) => `${arrayName}@${index}`);
            }),
          ].join(this.delimiter) + '\n'
        );
        this.headerWritten = true;
      }
      callback(null, mapStepToCsv(chunk) + '\n');
    } catch (error: unknown) {
      callback(error as Error);
    }
  }

  private static isStep(value: unknown): value is EvaluationStep {
    return (
      typeof value === 'object' &&
      value !== null &&
      'x' in value &&
      typeof value.x === 'number' &&
      'values' in value &&
      Array.isArray(value.values) &&
      value.values.every(item => this.isVariableValue(item))
    );
  }

  private static isVariableValue(value: unknown): value is VariableValue {
    return (
      typeof value === 'object' &&
      value !== null &&
      'name' in value &&
      typeof value.name === 'string' &&
      'value' in value &&
      typeof value.value === 'number'
    );
  }
}

const writeSolutionToCsv = (
  hs: HybridSystem,
  steps: EvaluationStep[],
  path: string
): Promise<void> =>
  pipeline(
    Readable.from(steps),
    new StepCsvTransform(hs),
    createWriteStream(path)
  );

describe('Evaluate', () => {
  it('should work', () => {
    const hsListener = new HybridSystemLismaListener();
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
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
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

  it('should work with "when" statement', async () => {
    const hsListener = new HybridSystemLismaListener();
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
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.001),
      0,
      1
    );
    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/when_test.csv');
  });

  it('should work with "if" statement', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          x' = 4;
          y = 2 * time;
      }
    };
    if (y > 4 && y < 5) {
        x' = -2;
    }
    if (x > 2 && x < 5) {
        y = -2 * time;
    }
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      10
    );
    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/if_test.csv');
  });

  it('should evaluate functions', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          e = exp(time);
          s = sqrt(time);
      }
    };
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      10
    );
    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/functions.csv');
  });

  it('should evaluate arrays', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          x' = 1;
      }
    };
    arr = [1, 4, 9];
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      10
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/arrays.csv');
  });

  it('should evaluate native', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          x' = 1;
      }
    };
    state dead {
        body {
            x' = 0.2;
        }
    };
    when (time > 1) {
        native\`\`\`
            setExpr('x', '20', 'shared');
        \`\`\`
    }
    when (time > 2) {
        native\`\`\`
            setState('dead');
        \`\`\`
    }
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      10
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/native.csv');
  });

  it('should evaluate ball', async () => {
    const hsListener = new HybridSystemLismaListener();
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
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.001),
      0,
      10
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/ball.csv');
  });

  it('should evaluate masses', async () => {
    const hsListener = new HybridSystemLismaListener();
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
    } from shared, separate on (x1 >= x2 && v1 >= v2);
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      10
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/masses.csv');
  });

  it('should evaluate tanks', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const pi = 3.141592653589793;
    const H = 0.39;
    const d1 = 0.12; 
    const d2 = 0.05; 
    const TIME1 = 60; 
    const TIME2 = 85;

    const L_plus = 0.9;
    const L_minus = 0.3;

    state shared {
        body {
            VInput = 1.11111E-4;
            p1'=0;
            p2'=0;

            S1 = pi*pow(d1, 2)/4;
            S2 = pi*pow(d2, 2)/4;
            K1 = 0.000185*exp(-0.000006*pow(p1, 3))*L1;
            K2 = 0.000226*exp(-0.0000057*pow(p2, 3))*L2;
            V12 = K1*sqrt(h1-(h2-H)*B);
            Vout = K2*sqrt(h2);

            L1 = 0;
            L2 = 0;
            B = 0;

            h1'= (VInput - V12)/S1;
            h2'= (V12 - Vout)/S2;
            st = 0;
        }
    };
    p1(t0)= 80; 
    p2(t0)= 80;

    if (h2 >  H) { B = 1; }
    if (h2 <= H) { B = 0; }
    if (p1 <  80) { L1 = 1; }
    if (p1 >= 80) { L1 = 0; }
    if (p2 <  80) { L2 = 1; }
    if (p2 >= 80) { L2 = 0; }

    when (p1 < 0) { p1=0.1; }
    if (p1 < 0) { p1'=0; }
    when (p2 < 0) { p2=0.1; }
    if (p2 < 0) { p2'=0; }

    state V12closed {
      body {
          p1'= 0;
          st = 1;
      }
    } from shared on (time > 0);

    state V12open  {
      body {
          p1'= -1;
          st = 2;
      }
    } from V12closed on (time > TIME1);

    state VoutOpen {
      body {
          p1'= -1;
          p2'= -1;
          st = 3;
      }
    } from V12open on (time > TIME2);

    state full {
      body {
          p1'= -1;
          p2'= -1;
          st = 4;
      }
    } from VoutOpen, empty on (h2 >= L_plus);

    state empty {
      body {
          p1'= -1;
          p2'= 1;
          st = 5;
      }
    } from full on (h2 <= L_minus);
    `;
    const lexErr = new LismaErrorListener<number>();
    const syntaxErr = new LismaErrorListener<Token>();
    walkOnText(hsListener, code, {
      lexerErrorListener: lexErr,
      parserErrorListener: syntaxErr,
    });
    if (lexErr.errors.length > 0) {
      console.error(lexErr.errors);
    }
    if (syntaxErr.errors.length > 0) {
      console.error(syntaxErr.errors);
    }
    const semErrors = hsListener.getSemanticErrors();
    if (semErrors.length > 0) {
      console.error(semErrors);
    }

    const system = hsListener.getSystem();

    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.1),
      0,
      1000
    );
    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/tanks.csv');
  });

  it('should evaluate pwm', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const kOmega = 100;
    const TPwm = 0.1;
    const kPwm = 0.1;
    const k = 0.1;
    const u = 1;

    state shared {
      body {
          omega' = kOmega * f;
          phi' = omega;
          saw = time - trunc(time / TPwm) * TPwm;
          x = u - k * omega - phi;
          f = sign(x) * z;
          z = 0;
      }
    };
    if (kPwm * abs(x) >= saw) {
        z = 1;
    }
    if (kPwm * abs(x) < saw) {
        z = 0;
    }
    `;
    const lexErrorListener = new LismaErrorListener<number>();
    const syntaxErrorListener = new LismaErrorListener<Token>();
    walkOnText(hsListener, code, {
      lexerErrorListener: lexErrorListener,
      parserErrorListener: syntaxErrorListener,
    });
    if (lexErrorListener.errors.length > 0) {
      console.log(lexErrorListener.errors);
    }
    if (syntaxErrorListener.errors.length > 0) {
      console.log(syntaxErrorListener.errors);
    }

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new RungeKutta2Integrator(0.001),
      0,
      2.5
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/pwm.csv');
  });
});
