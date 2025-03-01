import {
  CharStream,
  CommonTokenStream,
  ParseTree,
  ParseTreeWalker,
} from 'antlr4';
import LismaParser, { ExprContext } from './gen/LismaParser';
import LismaLexer from './gen/LismaLexer';
import { ExprConsumer } from './ExprConsumer';
import LismaListener from './gen/LismaListener';

function runConsumerOnSource(
  source: string,
  consumer: ExprConsumer,
  treeFactory: (parser: LismaParser) => ParseTree
) {
  const charStream = new CharStream(source);
  const lexer = new LismaLexer(charStream);
  const tokenStream = new CommonTokenStream(lexer);
  const parser = new LismaParser(tokenStream);
  const tree = treeFactory(parser);
  const walker = new TestListener(consumer);
  ParseTreeWalker.DEFAULT.walk(walker, tree);
}

class TestListener extends LismaListener {
  constructor(private readonly consumer: ExprConsumer) {
    super();
  }

  enterExpr = (ctx: ExprContext) => {
    if (ctx.LPAREN()) {
      this.consumer.enterBrace();
    }
  };

  exitExpr = (ctx: ExprContext) => {
    if (ctx.RPAREN()) {
      this.consumer.exitBrace();
    } else {
      this.consumer.consume(ctx);
    }
  };
}

describe('ExprParser', () => {
  it('should proceess simple expr', () => {
    const code = '1 + 2 * 3 / (4 - 5)';
    const consumer = new ExprConsumer();
    runConsumerOnSource(code, consumer, parser => parser.expr());
    const tokens = consumer.getTokens();
    expect(tokens).toStrictEqual(['1', '2', '3', '4', '5', '-', '/', '*', '+']);
  });
});
