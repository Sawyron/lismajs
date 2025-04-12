import { Token } from 'antlr4';
import { LismaErrorListener, walkOnText } from '..';
import { BinaryBooleanExpression } from '../expressions/boolean/BinaryBooleanExpression';
import { BinaryFloatExpression } from '../expressions/float/FloatBinaryExpression';
import { FloatExpression } from '../expressions/float/FloatExpression';
import { AssignStatement } from '../statements/AssignStatement';
import { HybridSystemLismaListener } from './HybridSystemLismaListener';

describe('HybridSystemLismaListener', () => {
  it('should work', () => {
    const hsListener = new HybridSystemLismaListener();
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
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const { states } = system;

    expect(hsListener.getSemanticErrors().length).toBe(0);

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

  it('should not fail on lex or syntax errors', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
      state {
          body {
              x' = 2;
          }
      };
      when (x >= 3) {
          x@ = 0;
      }
        `;
    const lexErrorListener = new LismaErrorListener<number>();
    const syntaxErrorListener = new LismaErrorListener<Token>();

    walkOnText(hsListener, code, {
      lexerErrorListener: lexErrorListener,
      parserErrorListener: syntaxErrorListener,
    });

    expect(lexErrorListener.errors.length).toBeGreaterThan(0);
    expect(syntaxErrorListener.errors.length).toBeGreaterThan(0);
  });

  it('should find not boolean transition expressions', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state a {
    } from b on (1);
    `;
    walkOnText(hsListener, code);

    const errors = hsListener.getSemanticErrors();

    expect(errors.length).toBe(1);
    console.log(errors);
  });

  it('should parse predicate expr', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state a {
    } from b on (1 >= 2);
    `;

    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const state = system.states[0];
    const transition = state.transitions[0];
    const { predicate } = transition;
    expect(predicate).toBeInstanceOf(BinaryBooleanExpression);
    expect(String(predicate)).toBe('1 2 >=');
    expect((predicate as BinaryBooleanExpression).evaluate()).toBe(false);
  });

  it('should parse simple float expr', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state a {
      body {
          x' = 3 + 4;
      }
    } from b on (1 >= 2);
    `;

    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const x = system.states[0].diffVariables[0];
    expect(x.expression).toBeInstanceOf(BinaryFloatExpression);
    expect(String(x.expression)).toBe('3 4 +');
    expect((x.expression as FloatExpression).evaluate()).toBe(7);
  });

  it('should evaluate ids in expressions', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    const phi = 3;
    state a {
      body {
          x' = 3 + phi;
      }
    } from b on (1 >= 2);
    `;

    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    const x = system.states[0].diffVariables[0].expression as FloatExpression;
    expect(x.evaluate()).toBe(6);
  });

  it('should evaluate initial conditions', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
    state a {
      body {
          x' = 4;
      }
    } from b on (1 >= 2);
    x(t0) = 5;
    `;

    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    expect(system.table.get('x')).toBe(5);
  });

  it('should evaluate on exit expressions', () => {
    const hsListener = new HybridSystemLismaListener();
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

    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    expect(system.states[0].onEnterStatements.length).toBe(1);
    const onEnter = system.states[0].onEnterStatements[0];
    expect(onEnter).toBeInstanceOf(AssignStatement);
    (onEnter as AssignStatement).execute();
    expect(system.table.get('x')).toBe(10);
  });

  it('should parse when statements', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
      state shared {
          body {
              x' = 2;
          }
      };
      when (x >= 3) {
          x = 0;
      }
        `;
    walkOnText(hsListener, code);

    const system = hsListener.getSystem();
    expect(system.states.length).toBe(1);

    expect(system.whenClauses.length).toBe(1);
    const [whenClause] = system.whenClauses;
    expect(String(whenClause.predicate)).toBe('x 3 >=');
  });

  it('should parse "if" statement', () => {
    const hsListener = new HybridSystemLismaListener();
    const code = `
      state shared {
          body {
              x' = 2;
          }
      };
      if (x > 2) {
          x' = -2;
      }
        `;
    walkOnText(hsListener, code);
    const system = hsListener.getSystem();

    expect(system.ifClauses.length).toBe(1);
    const [ifClause] = system.ifClauses;
    expect(String(ifClause.predicate)).toBe('x 2 >');
    const [diff] = ifClause.diffVariables;
    expect(diff.name).toBe('x');
    expect(String(diff.expression)).toBe('-2');
  });
});
