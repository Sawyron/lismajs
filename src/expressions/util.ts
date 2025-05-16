import { ParserRuleContext } from 'antlr4';
import { LismaError } from '../types/LismaError';

const errorFromRuleContext = (
  ctx: ParserRuleContext,
  message: string
): LismaError => ({
  message: message,
  charPosition: ctx.start.column,
  line: ctx.start.line,
});

export { errorFromRuleContext };
