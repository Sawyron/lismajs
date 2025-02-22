import { Token } from 'antlr4';
import LismaListener from './gen/LismaListener';
import { LismaErrorListener } from './LismaErrorListener';
import { CompileConfig, walkOnText } from '.';

describe('lisma parsing', () => {
  let lexError: LismaErrorListener<number>;
  let parseError: LismaErrorListener<Token>;
  let walker: LismaListener;
  let config: CompileConfig;

  beforeEach(() => {
    lexError = new LismaErrorListener();
    parseError = new LismaErrorListener();
    walker = new LismaListener();
    config = { lexerErrorListener: lexError, parserErrorListener: parseError };
  });

  it('should parse expr', () => {
    const program = `
      state a (y > 3) {
        x' = 4 + 8 * sin(u, i);
      } from b, c`;

    walkOnText(walker, program, config);

    expect(lexError.errors.length).toBe(0);
    expect(parseError.errors.length).toBe(0);
  });
});
