import { LismaErrorListener, walkOnText } from '../..';
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
  [step.x, ...step.values.map(variable => variable.value), step.state].join(
    ','
  );

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
            ...this.hs.variables.map(it => it.name),
            ...this.hs.arrayNames.flatMap(arrayName => {
              const array = this.hs.arrayTable.get(arrayName)!;
              return array.map((value, index) => `${arrayName}@${index}`);
            }),
            'state',
          ].join(this.delimiter) + '\n'
        );
        this.headerWritten = true;
      }
      callback(null, mapStepToCsv(chunk) + '\n');
    } catch (ex: unknown) {
      const error =
        ex instanceof Error ? ex : new Error('Write error', { cause: ex });
      callback(error, null);
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

  it('remainder should work', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state shared {
      body {
          tick = time % 1;
      }
    };
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.01),
      0,
      10
    );
    console.log(JSON.stringify(result.slice(0, 10), null, 2));
    const target = result.find(res => res.x >= 5);
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

  it('should change var', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    var a = 2;
    state shared {
      body {
          x = a;
      }
    };
    when (time > 0.5) {
        a = 3;
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
    await writeSolutionToCsv(system, result, './out/assign_const.csv');
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
          y' = 0;
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
    while (time < 1) {
        native\`\`\`
            setVar('y', getVar('y') + 1e-3);
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

  it('should evaluate simple bridge', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const BRIDGE_LENGTH = 10;
    const CARS_VELOCITY = 2;
    const ISLAND_CAPACITY = 4;

    G1(t0) = 0;
    R1(t0) = 1;
    G2(t0) = 0;
    R2(t0) = 1;

    var direction = 0; // 0 для MI, 1 для IM
    var carReadyLeaveIsland = 0; // 0 когда нет машин на выезд, 1 когда есть
    var firstCarOnBridge = 0; // флаг наличия первой машины на мосту
    var firstCarRoute = 0; // пройденное расстояние первой машины
    var secondCarOnBridge = 0; // флаг наличия второй машины на мосту
    var secondCarRoute = 0; // пройденное расстояние второй машины
    var carsOnBridge = 0; // Общее количество машин на мосту
    var carsMainland = 1; // Очередь на материке
    var carMainlandOff = 0; // выезжающая машина с материка
    var carsIsland = 0; // Количество машин на острове и, частично, очередь на выезд
    var carIslandOff = 0; // выезжающая машина с острова

    // Условия набора машин на выезд
    while (time > 0) {
      carsMainland = carsMainland + 0.5;
    }

    while (carsIsland >= ISLAND_CAPACITY - 1) {
      carReadyLeaveIsland = 1;
    }

    // Заезд машины на мост (сделать  одну общую переменную carOff?)
    while (carMainlandOff > 0 && firstCarOnBridge < 1) {
      carMainlandOff = 0;
      carsOnBridge = carsOnBridge + 1;
      firstCarOnBridge = 1;
      firstCarRoute = 1;
    }

    while (carMainlandOff > 0 && secondCarOnBridge < 1 && firstCarOnBridge > 0) {
      carMainlandOff = 0;
      carsOnBridge = carsOnBridge + 1;
      secondCarOnBridge = 1;
      secondCarRoute = 1;
    }

    while (carIslandOff > 0 && firstCarOnBridge < 1) {
      carIslandOff = 0;
      carsOnBridge = carsOnBridge + 1;
      firstCarOnBridge = 1;
      firstCarRoute = 1;
    }

    while (carIslandOff > 0 && secondCarOnBridge < 1 && firstCarOnBridge > 0) {
      carIslandOff = 0;
      carsOnBridge = carsOnBridge + 1;
      secondCarOnBridge = 1;
      secondCarRoute = 1;
    }

    // Условия выезда машины с моста
    while (firstCarRoute >= BRIDGE_LENGTH && direction < 1) {
      firstCarRoute = 0;
      carsIsland = carsIsland + 1;
      carsOnBridge = carsOnBridge - 1;
      firstCarOnBridge = 0;
    }

    while (firstCarRoute >= BRIDGE_LENGTH && direction > 0) {
      firstCarRoute = 0;
      carsOnBridge = carsOnBridge - 1;
      firstCarOnBridge = 0;
    }

    while (secondCarRoute >= BRIDGE_LENGTH && direction < 1) {
      secondCarRoute = 0;
      carsIsland = carsIsland + 1;
      carsOnBridge = carsOnBridge - 1;
      secondCarOnBridge = 0;
    }

    while (secondCarRoute >= BRIDGE_LENGTH && direction > 0) {
      secondCarRoute = 0;
      carsOnBridge = carsOnBridge - 1;
      secondCarOnBridge = 0;
    }

    // Движение машины по мосту
    while (carsOnBridge > 0 && firstCarOnBridge > 0 && firstCarRoute < BRIDGE_LENGTH) {
      firstCarRoute = firstCarRoute + 1;
    }

    while (carsOnBridge > 0 && secondCarOnBridge > 0 && secondCarRoute < BRIDGE_LENGTH) {
      secondCarRoute = secondCarRoute + 1;
    }

    state shared {
      body {
        G1' = 0;
        R1' = 0;
        G2' = 0;
        R2' = 0;
      }
    };

    // Состояние заезда машины на мост с материка
    state St1 {
      onEnter {
        G1 = 1;
        R1 = 0;
        carMainlandOff = 1;
        carsMainland = carsMainland - 1;
        direction = 0;
      }
    } from shared, St3, St4 on (carsMainland >= 1 && carReadyLeaveIsland < 1 && (carsIsland + carsOnBridge) < ISLAND_CAPACITY && carMainlandOff < 1 && (carsOnBridge < 1 || (carsOnBridge < CARS_VELOCITY && direction < 1)));

    // Движение с материка на остров (MI)
    state St3 {
        onEnter {
          G1 = 0;
          R1 = 1;
        }
    } from St1, St4 on (carMainlandOff > 0);

    // Состояние заезда машины на мост с острова
    state St2 {
      onEnter {
        G2 = 1;
        R2 = 0;
        carIslandOff = 1;
        carsIsland = carsIsland - 1;
        direction = 1;
        carReadyLeaveIsland = 0;
      }
    } from St3, St4 on (carsOnBridge < CARS_VELOCITY && carReadyLeaveIsland > 0 && carIslandOff < 1 &&  (carsOnBridge < 1 || (carsOnBridge < CARS_VELOCITY && direction > 0)));

    // Движение с острова на материк (IM)
    state St4 {
      onEnter {
        G2 = 0;
        R2 = 1;
      }
    } from St2, St3 on (carIslandOff > 0);
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
      new RungeKutta2Integrator(1),
      0,
      100
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/simple_bridge.csv');
  });

  it('should evaluate bridge with 1 car', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const BRIDGE_LENGTH = 10;
    const CARS_VELOCITY = 1;
    const BRIDGE_CAPACITY = 1;
    const ISLAND_CAPACITY = 4;

    x(t0) = 0;

    var carsA = 0;
    var carsB = 0;
    var carReadyLeaveIsland = 0;
    var carsMainland = 1;
    var carsIsland = 0;
    var G1 = 0;
    var G2 = 0;

    k2 = [31, 33, 45];
    
    when (k2[0] <= time) {
      carReadyLeaveIsland = carReadyLeaveIsland + 1;
    }
    when (k2[1] <= time) {
      carReadyLeaveIsland = carReadyLeaveIsland + 1;
    }
    when (k2[2] <= time) {
      carReadyLeaveIsland = carReadyLeaveIsland + 1;
    }

    while (time > 0) {
      native\`\`\`
        setVar('carsMainland', getVar('carsMainland') + getVar('time') % 2);
      \`\`\`
    }

    while (carsA > 0) {
      native\`\`\`
        this.carsA = carsA.map((value) => ++value);
        this.carsA.forEach((value) => {
          if (value > getVar('BRIDGE_LENGTH')) {
            setVar('carsA', getVar('carsA') - 1);
            setVar('carsIsland', getVar('carsIsland') + 1);
          }
        });
        this.carsA = this.carsA.filter((value) => value <= getVar('BRIDGE_LENGTH'));
      \`\`\`
    }

    while (carsB > 0) {
      native\`\`\`
        this.carsB = carsB.map((value) => ++value);
        this.carsB.forEach((value) => {
          if (value > getVar('BRIDGE_LENGTH')) {
            setVar('carsB', getVar('carsB') - 1);
          }
        });
        this.carsB = this.carsB.filter((value) => value <= getVar('BRIDGE_LENGTH'));
      \`\`\`
    }

    state st0 { body {
      x' = 1;
    }
    onEnter {
      G1 = 1;
      carsMainland = carsMainland - 1;
      carsA = carsA + 1;
      native\`\`\`
        this.carsA.push(0);
      \`\`\`
    } } from st2 on ((carsIsland + carsA) < ISLAND_CAPACITY && carsMainland >= 1 && carsA < BRIDGE_CAPACITY && carReadyLeaveIsland < 1), from st3 on (carsIsland < ISLAND_CAPACITY && carsMainland >= 1 && carsB < 1 && carReadyLeaveIsland < 1), from shared on (time > 0);

    state st1 { body {
      x' = 1;
    }
    onEnter {
      G2 = 1;
      carsIsland = carsIsland - 1;
      carReadyLeaveIsland = carReadyLeaveIsland - 1;
      carsB = carsB + 1;
      native\`\`\`
        this.carsB.push(0);
      \`\`\`
    } } from st2 on (carReadyLeaveIsland > 0 && carsA < 1 && carsIsland > 0), from st3 on (carsB < BRIDGE_CAPACITY && carReadyLeaveIsland > 0 && carsIsland > 0);

    state st2 { body {
      x' = 1;
    }
    onEnter {
      G1 = 0;
    } } from st0 on (G1 > 0 || carsA > 0), from st3 on (G2 < 1 && carsB < 1);
    
    state st3 { body {
      x' = 1;
    }
    onEnter {
      G2 = 0;
    } } from st1 on (G2 > 0 || carsB > 0), from st2 on (G1 < 1 && carsA < 1);
    
    state shared { body {
      x' = 1;
    }
    onEnter {
      native\`\`\`
        this.carsA = [];
        this.carsB = [];
      \`\`\`
    } } ;
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(system, new EulerIntegrator(1), 0, 100);

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/bridge1.csv');
  });

  it('should evaluate bridge with 2 cars', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const BRIDGE_LENGTH = 10;
    const CARS_VELOCITY = 1;
    const BRIDGE_CAPACITY = 2;
    const ISLAND_CAPACITY = 4;

    x(t0) = 0;

    var carsA = 0;
    var carsB = 0;
    var carReadyLeaveIsland = 0;
    var carsMainland = 1;
    var carsIsland = 0;
    var G1 = 0;
    var G2 = 0;

    k2 = [31, 33, 45];
    
    when (k2[0] <= time) {
      carReadyLeaveIsland = carReadyLeaveIsland + 1;
    }
    when (k2[1] <= time) {
      carReadyLeaveIsland = carReadyLeaveIsland + 1;
    }
    when (k2[2] <= time) {
      carReadyLeaveIsland = carReadyLeaveIsland + 1;
    }

    while (time > 0) {
      native\`\`\`
        setVar('carsMainland', getVar('carsMainland') + getVar('time') % 2);
      \`\`\`
    }

    while (carsA > 0) {
      native\`\`\`
        this.carsA = carsA.map((value) => value + getVar('CARS_VELOCITY'));
        this.carsA.forEach((value) => {
          if (value > getVar('BRIDGE_LENGTH')) {
            setVar('carsA', getVar('carsA') - 1);
            setVar('carsIsland', getVar('carsIsland') + 1);
          }
        });
        this.carsA = this.carsA.filter((value) => value <= getVar('BRIDGE_LENGTH'));
      \`\`\`
    }

    while (carsB > 0) {
      native\`\`\`
        this.carsB = carsB.map((value) => value + getVar('CARS_VELOCITY'));
        this.carsB.forEach((value) => {
          if (value > getVar('BRIDGE_LENGTH')) {
            setVar('carsB', getVar('carsB') - 1);
          }
        });
        this.carsB = this.carsB.filter((value) => value <= getVar('BRIDGE_LENGTH'));
      \`\`\`
    }

    state st0 { body {
      x' = 1;
    }
    onEnter {
      G1 = 1;
      carsMainland = carsMainland - 1;
      carsA = carsA + 1;
      native\`\`\`
        this.carsA.push(0);
      \`\`\`
    } } from st2 on ((carsIsland + carsA) < ISLAND_CAPACITY && carsMainland >= 1 && carsA < BRIDGE_CAPACITY && carReadyLeaveIsland < 1), from st3 on (carsIsland < ISLAND_CAPACITY && carsMainland >= 1 && carsB < 1 && carReadyLeaveIsland < 1), from shared on (time > 0);

    state st1 { body {
      x' = 1;
    }
    onEnter {
      G2 = 1;
      carsIsland = carsIsland - 1;
      carReadyLeaveIsland = carReadyLeaveIsland - 1;
      carsB = carsB + 1;
      native\`\`\`
        this.carsB.push(0);
      \`\`\`
    } } from st2 on (carReadyLeaveIsland > 0 && carsA < 1 && carsIsland > 0), from st3 on (carsB < BRIDGE_CAPACITY && carReadyLeaveIsland > 0 && carsIsland > 0);

    state st2 { body {
      x' = 1;
    }
    onEnter {
      G1 = 0;
    } } from st0 on (G1 > 0 || carsA > 0), from st3 on (G2 < 1 && carsB < 1);
    
    state st3 { body {
      x' = 1;
    }
    onEnter {
      G2 = 0;
    } } from st1 on (G2 > 0 || carsB > 0), from st2 on (G1 < 1 && carsA < 1);
    
    state shared { body {
      x' = 1;
    }
    onEnter {
      native\`\`\`
        this.carsA = [];
        this.carsB = [];
      \`\`\`
    } } ;
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(system, new EulerIntegrator(1), 0, 100);

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/bridge2.csv');
  });

  it('should evaluate pwm state machine', async () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const kOmega = 100;
    const t = 0.1;
    const kp = 0.1;
    const k = 0.1;
    const u = 1;

    state st0 { body {
      f = 1;
    } } from st1 on (x > 0 && kp * abs(x) >= saw), from st2 on (x > 0 && kp * abs(x) >= saw), from shared on (kp * abs(x) >= saw);

    state st1 { body {
      f = -1;
    } } from st0 on (x < 0 && kp * abs(x) >= saw), from st2 on (x < 0 && kp * abs(x) >= saw);

    state st2 { body {
      f = 0;
    } } from st0 on (kp * abs(x) < saw), from st1 on (kp * abs(x) < saw);

    state shared { body {
      omega' = kOmega * f;
      phi' = omega;
      saw = time - trunc(time / t) * t;
      x = u - k * omega - phi;
      f = 1;
    }
    onEnter {
      x = 1;
    } } ;
    `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const result = evaluateHybridSystem(
      system,
      new EulerIntegrator(0.001),
      0,
      2.5
    );

    await fs.mkdir('./out', { recursive: true });
    await writeSolutionToCsv(system, result, './out/pwm2.csv');
  });
});
