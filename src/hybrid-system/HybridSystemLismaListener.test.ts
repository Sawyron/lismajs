import { walkOnText } from '..';
import HybridSystemLismaListener from './HybridSystemLismaListener';

describe('HybridSystemLismaListener', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    const phi = 3 + tau;
    state a {
      x' = 3 * z;
      y' = r + 4 * (h - temp);
      y(t0) = 4;
    } from b on (1 < 2), from c, d on (3 <= 4)
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const { states } = system;

    expect(hs.getSemanticErrors().length).toBe(0);

    expect(states.length).toBe(1);
    const state = states[0];
    expect(state.name).toBe('a');

    expect(state.diffVariables.length).toBe(2);
    expect(state.diffVariables[0].name).toBe('x');
    expect(state.diffVariables[0].expression).toStrictEqual(['3', 'z', '*']);
    expect(state.diffVariables[1].name).toBe('y');
    expect(state.diffVariables[1].expression).toStrictEqual([
      'r',
      '4',
      'h',
      'temp',
      '-',
      '*',
      '+',
    ]);

    expect(state.transitions.length).toBe(3);
    expect(state.transitions[0].from).toBe('b');
    expect(state.transitions[0].condition).toStrictEqual(['1', '2', '<']);
    expect(state.transitions[1].from).toBe('c');
    expect(state.transitions[1].condition).toStrictEqual(['3', '4', '<=']);
    expect(state.transitions[2].from).toBe('d');
    expect(state.transitions[2].condition).toStrictEqual(['3', '4', '<=']);

    const { constants } = system;
    expect(constants.length).toBe(1);
    expect(constants[0].name).toBe('phi');
    expect(constants[0].expression).toStrictEqual(['3', 'tau', '+']);

    const { initials } = system;
    expect(initials.size).toBe(2);
    expect(initials.get('x')).toStrictEqual(['0']);
    expect(initials.get('y')).toStrictEqual(['4']);

    const { diffVariableNames } = system;
    expect(diffVariableNames.length).toBe(2);
    expect(diffVariableNames).toStrictEqual(['x', 'y']);
  });

  it('should find not boolean transtion expressions', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a {
    } from b on (1)
    `;
    walkOnText(hs, code);

    const errors = hs.getSemanticErrors();

    expect(errors.length).toBe(1);
    console.log(errors);
  });
});
