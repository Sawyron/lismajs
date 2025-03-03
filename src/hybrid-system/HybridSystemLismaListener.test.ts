import { walkOnText } from '..';
import HybridSystemLismaListener from './HybridSystemLismaListener';

describe('HybridSystemLismaListener', () => {
  it('should work', () => {
    const hs = new HybridSystemLismaListener();
    const code = `
    state a(t > 2) {
      x' = 3 * z;
      y' = r + 4 * (h - temp);
    } from b, c
    `;
    walkOnText(hs, code);

    const states = hs.getStates();
    console.log(JSON.stringify(states, null, 2));

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
  });
});
