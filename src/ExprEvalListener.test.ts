import { Token } from 'antlr4';
import { walkOnText } from './index';
import { LismaErrorListener } from './LismaErrorListener';
import LismaListener from './gen/LismaListener';

describe('Syntax errors', () => {
  it('should find syntax errors', () => {
    const walker = new LismaListener();
    const parse = new LismaErrorListener<Token>();
    walkOnText(walker, '1 ++ 2', { parserErrorListener: parse });

    const errors = parse.errors;
    expect(errors.length).toBeGreaterThan(0);
  });
});
