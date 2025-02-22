import {
  CharStream,
  CommonTokenStream,
  ErrorListener,
  ParseTreeListener,
  ParseTreeWalker,
  Token,
} from 'antlr4';
import LismaLexer from './gen/LismaLexer';
import LismaParser from './gen/LismaParser';
import { LismaErrorListener } from './LismaErrorListener';
import { LismaError } from './types/LismaError';

type CompileConfig = {
  lexerErrorListener?: ErrorListener<number>;
  parserErrorListener?: ErrorListener<Token>;
};

function walkOnText<T extends ParseTreeListener>(
  walker: T,
  source: string,
  config: CompileConfig = {}
) {
  const chars = new CharStream(source);
  const lexer = new LismaLexer(chars);

  const { lexerErrorListener } = config;
  if (lexerErrorListener) {
    lexer.addErrorListener(lexerErrorListener);
  }

  const tokens = new CommonTokenStream(lexer);

  const parser = new LismaParser(tokens);
  const { parserErrorListener } = config;
  if (parserErrorListener) {
    parser.addErrorListener(parserErrorListener);
  }

  const tree = parser.prog();
  ParseTreeWalker.DEFAULT.walk(walker, tree);
}

export { CompileConfig, walkOnText, LismaErrorListener, LismaError };
