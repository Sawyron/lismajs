import { walkOnText } from '..';
import { AssignExpression } from '../expressions/assign/AssignExpression';
import { BinaryBooleanExpression } from '../expressions/boolean/BinaryBooleanExpression';
import { BinaryFloatExpression } from '../expressions/float/FloatBinaryExpression';
import { FloatExpression } from '../expressions/float/FloatExpression';
import HybridSystemLismaListener from './HybridSystemLismaListener';

describe('HybridSystemLismaListener', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    const tau = 0.1;
    const phi = 3 + tau;
    state shared {
    };
    state a {
      body {
          x' = 3 * z;
          y' = r + 4 * (h - temp);
          z = 3 * time;
      }
    } from b on (1 < 2), from c, d on (3 <= 4);
    y(t0) = 4;
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const { states } = system;

    expect(hs.getSemanticErrors().length).toBe(0);

    expect(states.length).toBe(2);
    const state = states[1];
    expect(state.name).toBe('a');

    expect(state.diffVariables.length).toBe(2);
    expect(state.diffVariables[0].name).toBe('x');
    expect(String(state.diffVariables[0].expression)).toStrictEqual('3 z *');
    expect(state.diffVariables[1].name).toBe('y');
    expect(String(state.diffVariables[1].expression)).toStrictEqual(
      'r 4 h temp - * +'
    );

    expect(state.transitions.length).toBe(3);
    expect(state.transitions[0].from).toBe('b');
    expect(String(state.transitions[0].predicate)).toStrictEqual('1 2 <');
    expect(state.transitions[1].from).toBe('c');
    expect(String(state.transitions[1].predicate)).toStrictEqual('3 4 <=');
    expect(state.transitions[2].from).toBe('d');
    expect(String(state.transitions[2].predicate)).toStrictEqual('3 4 <=');

    expect(state.algVariables.length).toBe(1);
    expect(String(state.algVariables[0].expression)).toBe('3 time *');

    const { constants } = system;
    expect(constants.length).toBe(2);
    expect(constants[0].name).toBe('tau');
    expect(constants[1].name).toBe('phi');
    expect(String(constants[0].expression)).toStrictEqual('0.1');
    expect(String(constants[1].expression)).toStrictEqual('3 tau +');

    const { table } = system;
    expect(table.size).toBe(5);
    expect(table.get('x')).toStrictEqual(0);
    expect(table.get('y')).toStrictEqual(4);

    const { diffVariableNames } = system;
    expect(diffVariableNames.length).toBe(2);
    expect(diffVariableNames).toStrictEqual(['x', 'y']);

    const { algVariableNames } = system;
    expect(algVariableNames.length).toBe(1);
    expect(algVariableNames).toStrictEqual(['z']);
  });

  it('should find not boolean transition expressions', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
    } from b on (1);
    `;
    walkOnText(hs, code);

    const errors = hs.getSemanticErrors();

    expect(errors.length).toBe(1);
    console.log(errors);
  });

  it('should parse predicate expr', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
    } from b on (1 >= 2);
    `;

    walkOnText(hs, code);

    const system = hs.getSystem();
    const state = system.states[0];
    const transition = state.transitions[0];
    const { predicate } = transition;
    expect(predicate).toBeInstanceOf(BinaryBooleanExpression);
    expect(String(predicate)).toBe('1 2 >=');
    expect((predicate as BinaryBooleanExpression).evaluate()).toBe(false);
  });

  it('should parse simple float expr', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
      body {
          x' = 3 + 4;
      }
    } from b on (1 >= 2);
    `;

    walkOnText(hs, code);

    const system = hs.getSystem();
    const x = system.states[0].diffVariables[0];
    expect(x.expression).toBeInstanceOf(BinaryFloatExpression);
    expect(String(x.expression)).toBe('3 4 +');
    expect((x.expression as FloatExpression).evaluate()).toBe(7);
  });

  it('should evaluate ids in expressions', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    const phi = 3;
    state a {
      body {
          x' = 3 + phi;
      }
    } from b on (1 >= 2);
    `;

    walkOnText(hs, code);

    const system = hs.getSystem();
    const x = system.states[0].diffVariables[0].expression as FloatExpression;
    expect(x.evaluate()).toBe(6);
  });

  it('should evaluate initial conditions', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
      body {
          x' = 4;
      }
    } from b on (1 >= 2);
    x(t0) = 5;
    `;

    walkOnText(hs, code);

    const system = hs.getSystem();
    expect(system.table.get('x')).toBe(5);
  });

  it('should evaluate on exit expressions', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
      body {
          x' = 4;
      }
      onEnter {
          x = 10;
      }
    } from b on (1 >= 2);
    `;

    walkOnText(hs, code);

    const system = hs.getSystem();
    expect(system.states[0].onEnterExpressions.length).toBe(1);
    const onEnter = system.states[0].onEnterExpressions[0];
    expect(onEnter).toBeInstanceOf(AssignExpression);
    (onEnter as AssignExpression).execute();
    expect(system.table.get('x')).toBe(10);
  });

  it('should parse ball system', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
        const g = 9.81;
        y(t0) = 10;

        state init {
          body {
              v' = -g;
              y' = v;
          }
        };
    
        state vzlet {
            body {
                v' = -g;
                y' = v;
            }
            onEnter {
                v = -v;
            }
        } from init, padenie on (y < 0);
    
        state padenie {
            body {
              v' = -g;
              y' = v;
            }
        } from init, vzlet on (v < 0);
        `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    expect(system.states.length).toBe(3);

    const initState = system.states[0];
    expect(initState.name).toBe('init');
    expect(initState.transitions.length).toBe(0);

    const upState = system.states[1];
    expect(upState.name).toBe('vzlet');
    expect(upState.transitions.length).toBe(2);
  });
});
