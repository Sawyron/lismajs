import { Token } from 'antlr4';
import { LismaErrorListener, walkOnText } from '.';
import LismaListener from './gen/LismaListener';
import { describe, expect, it } from '@jest/globals';

describe('LismaErrorListener', () => {
  it('should find lex errors', () => {
    const listener = new LismaListener();
    const errorListener = new LismaErrorListener<number>();
    walkOnText(listener, '@a', { lexerErrorListener: errorListener }, parser =>
      parser.expr()
    );

    const errors = errorListener.errors;
    expect(errors.length).toBeGreaterThan(0);
    console.log(errors);
  });

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

  it('should find both lex and syntax errors', () => {
    const listener = new LismaListener();
    const lexErrorListener = new LismaErrorListener<number>();
    const syntaxErrorListener = new LismaErrorListener<Token>();
    walkOnText(
      listener,
      '1 >= * 4 @a',
      {
        lexerErrorListener: lexErrorListener,
        parserErrorListener: syntaxErrorListener,
      },
      parser => parser.expr()
    );

    expect(lexErrorListener.errors.length).toBeGreaterThan(0);
    expect(syntaxErrorListener.errors.length).toBeGreaterThan(0);

    console.log(lexErrorListener.errors);
    console.log(syntaxErrorListener.errors);
  });
});
