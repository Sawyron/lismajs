import { CharStream, Token } from 'antlr4';
import LismaLexer from './gen/LismaLexer';

const getTokens = (source: string): Token[] => {
  const chars = new CharStream(source);
  const lexer = new LismaLexer(chars);
  return lexer.getAllTokens();
};

describe('token parsing', () => {
  it('should parse expr', () => {
    const code = '1 + 2';
    const tokens = getTokens(code);
    expect(tokens.length).toBe(3);
    expect(tokens[0].type).toBe(LismaLexer.NUMBER);
    expect(tokens[1].type).toBe(LismaLexer.BIN_OP);
    expect(tokens[1].text).toBe('+');
    expect(tokens[2].type).toBe(LismaLexer.NUMBER);
  });
});
