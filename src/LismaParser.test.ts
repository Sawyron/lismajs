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
    expect(exprContext.expr(0).NUMBER().getText()).toBe('1');
    expect(exprContext.expr(1).NUMBER().getText()).toBe('2');
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
    expect(exprContext.expr(0).NUMBER().getText()).toBe('3');
    expect(exprContext.expr(1).ID().getText()).toBe('y');
    expect(exprContext.BIN_OP().getText()).toBe('*');
  });

  it('shoudl parse intial condition', () => {
    const code = 'x(t0) = 4;';
    const parser = createParserFromSource(code);

    const conditionContext = parser.initCond();

    expect(conditionContext.ID().getText()).toBe('x');
    expect(conditionContext.expr().getText()).toBe('4');
  });

  it('should parse empty state', () => {
    const code = 'state f1(x > y) {} from f3, f4';
    const parser = createParserFromSource(code);

    const stateContext = parser.state_();

    expect(stateContext.ID_list().length).toBe(3);
    expect(stateContext.ID(0).getText()).toBe('f1');

    expect(stateContext.expr().expr_list().length).toBe(2);
    expect(stateContext.expr().expr(0).ID().getText()).toBe('x');
    expect(stateContext.expr().expr(1).ID().getText()).toBe('y');
    expect(stateContext.expr().BIN_OP().getText()).toBe('>');

    expect(stateContext.statement_list().length).toBe(0);

    expect(stateContext.ID(1).getText()).toBe('f3');
    expect(stateContext.ID(2).getText()).toBe('f4');
  });
});
