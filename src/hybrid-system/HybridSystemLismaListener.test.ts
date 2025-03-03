import { walkOnText } from '..';
import HybridSystemLismaListener from './HybridSystemLismaListener';

describe('HybridSystemLismaListener', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    const phi = 3 + tau;
    state a(t > 2) {
      x' = 3 * z;
      y' = r + 4 * (h - temp);
      y(t0) = 4;
    } from b, c
    `;
    walkOnText(hs, code);

    const system = hs.getSystem();
    const { states } = system;

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

    expect(state.from).toStrictEqual(['b', 'c']);

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
});
