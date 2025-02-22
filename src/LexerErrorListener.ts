/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorListener, RecognitionException, Recognizer } from 'antlr4';

export class LismaLexerErrorListner extends ErrorListener<number> {
  syntaxError(
    recognizer: Recognizer<number>,
    offendingSymbol: number,
    line: number,
    column: number,
    msg: string,
    e: RecognitionException | undefined
  ): void {}
}
