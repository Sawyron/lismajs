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
  consumer: (expr: ExprContext) => void,
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
  constructor(private readonly consumer: (expr: ExprContext) => void) {
    super();
  }

  exitExpr = (ctx: ExprContext) => {
    this.consumer(ctx);
    console.log(`exited expr: ${ctx.getText()}`);
  };
}

describe('ExprParser', () => {
  it('should proceess simple expr', () => {
    const code = '1 + 2 * 3 / (4 - 5)';
    const consumer = new ExprConsumer();
    runConsumerOnSource(
      code,
      ctx => consumer.consume(ctx),
      parser => parser.expr()
    );

    const tokens = consumer.getTokens();
    const t = tokens.join('');

    expect(tokens).toStrictEqual(['1', '2', '3', '*', '4', '5', '-', '/', '+']);
  });

  it('should parse simple unary operator expr', () => {
    const code = '!it + 1';
    const consumer = new ExprConsumer();
    runConsumerOnSource(
      code,
      ctx => consumer.consume(ctx),
      parser => parser.expr()
    );

    const tokens = consumer.getTokens();

    expect(tokens).toStrictEqual(['it', '!', '1', '+']);
  });
});
