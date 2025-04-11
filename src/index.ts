import {
  CharStream,
  CommonTokenStream,
  ErrorListener,
  ParseTree,
  ParseTreeListener,
  ParseTreeVisitor,
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

const walkOnText = (
  walker: ParseTreeListener,
  source: string,
  config: CompileConfig = {},
  ruleExtractor: (parser: LismaParser) => ParseTree = parser => parser.prog()
) => {
  const tree = compile(source, config, ruleExtractor);
  ParseTreeWalker.DEFAULT.walk(walker, tree);
};

const visitText = <T>(
  visitor: ParseTreeVisitor<T>,
  source: string,
  config: CompileConfig = {},
  ruleExtractor: (parser: LismaParser) => ParseTree = parser => parser.prog()
): T => {
  const tree = compile(source, config, ruleExtractor);
  return visitor.visit(tree);
};

const compile = (
  source: string,
  config: CompileConfig = {},
  ruleExtractor: (parser: LismaParser) => ParseTree = parser => parser.prog()
): ParseTree => {
  const chars = new CharStream(source);
  const lexer = new LismaLexer(chars);

  const { lexerErrorListener, parserErrorListener } = config;
  if (lexerErrorListener) {
    lexer.removeErrorListeners();
    lexer.addErrorListener(lexerErrorListener);
  }

  const tokens = new CommonTokenStream(lexer);
  const parser = new LismaParser(tokens);
  if (parserErrorListener) {
    parser.removeErrorListeners();
    parser.addErrorListener(parserErrorListener);
  }

  return ruleExtractor(parser);
};

export {
  compile,
  walkOnText,
  visitText,
  CompileConfig,
  LismaErrorListener,
  LismaError,
};
