/* eslint-disable @typescript-eslint/no-unused-vars */
import { ErrorListener, RecognitionException, Recognizer } from 'antlr4';
import { LismaError } from './types/LismaError';

export class LismaErrorListener<T> extends ErrorListener<T> {
  private _errors: LismaError[] = [];
  public get errors(): LismaError[] {
    return [...this._errors];
  }

  syntaxError(
    recognizer: Recognizer<T>,
    offendingSymbol: T,
    line: number,
    column: number,
    msg: string,
    e: RecognitionException | undefined
  ): void {
    this._errors.push({ line: line, charPosition: column, message: msg });
  }
}
