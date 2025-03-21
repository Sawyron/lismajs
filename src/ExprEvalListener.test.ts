import { Token } from 'antlr4';
import { walkOnText } from './index';
import { LismaErrorListener } from './LismaErrorListener';
import LismaListener from './gen/LismaListener';

describe('Syntax errors', () => {
  it('should find syntax errors', () => {
    const listener = new LismaListener();
    const errorListener = new LismaErrorListener<Token>();
    walkOnText(
      listener,
      '1 >= * 4',
      { parserErrorListener: errorListener },
      parser => parser.expr()
    );

    const errors = errorListener.errors;
    expect(errors.length).toBeGreaterThan(0);
    console.log(errors);
  });
});
