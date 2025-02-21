import { Token } from 'antlr4';
import { ExprEvalListener } from './ExprEvalListener';
import { walkOnText } from './index';
import { LismaErrorListener } from './LismaErrorListener';
import LismaListener from './gen/LismaListener';

describe('ExprWalker', () => {
  it('should work', () => {
    const walker = new ExprEvalListener();

    walkOnText(walker, '7 * 2 + 4');

    const output = walker.evaluate();
    expect(output.length).toBeGreaterThan(0);
  });
});

describe('Lex errors', () => {
  it('should find lex errors', () => {
    const walker = new ExprEvalListener();
    const lexerErrorListener = new LismaErrorListener<number>();

    walkOnText(walker, 'abc', { lexerErrorListener });
    const errors = lexerErrorListener.errors;

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('Syntax errors', () => {
  it('should find syntax errors', () => {
    const walker = new LismaListener();
    const parse = new LismaErrorListener<Token>();
    walkOnText(walker, '1 ++ 2', { parserErrorListener: parse });

    const errors = parse.errors;
    expect(errors.length).toBeGreaterThan(0);
  });
});
