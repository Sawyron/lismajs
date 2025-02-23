import { CharStream, CommonTokenStream } from 'antlr4';
import LismaLexer from './gen/LismaLexer';
import LismaParser from './gen/LismaParser';

function createParserFromSource(source: string): LismaParser {
  const charStream = new CharStream(source);
  const lexer = new LismaLexer(charStream);
  const tokenStream = new CommonTokenStream(lexer);
  return new LismaParser(tokenStream);
}

describe('Lisma parser', () => {
  it('should parse expression', () => {
    const code = '1 + 2';
    const parser = createParserFromSource(code);

    const exprContext = parser.expr();

    expect(exprContext.expr_list().length).toBe(2);
    expect(exprContext.expr_list()[0].NUMBER().getText()).toBe('1');
    expect(exprContext.expr_list()[1].NUMBER().getText()).toBe('2');
    expect(exprContext.BIN_OP().getText()).toBe('+');
  });

  it('should parse diff definition', () => {
    const code = "x' = 3 * y";

    const parser = createParserFromSource(code);

    const diffDefContext = parser.diffDef();
    expect(diffDefContext.ID().getText()).toBe('x');

    expect(diffDefContext.getChild(1).getText()).toBe("'");
    const exprContext = diffDefContext.expr();
    expect(exprContext.expr_list().length).toBe(2);
    expect(exprContext.expr_list()[0].NUMBER().getText()).toBe('3');
    expect(exprContext.expr_list()[1].ID().getText()).toBe('y');
    expect(exprContext.BIN_OP().getText()).toBe('*');
  });
});
