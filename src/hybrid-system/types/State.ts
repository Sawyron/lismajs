import Expression from '../../expressions/Expression';
import { DiffVariable } from './DiffVariable';
import { Transition as Transition } from './Transition';

export type State = {
  name: string;
  diffVariables: DiffVariable[];
  transitions: Transition[];
  onEnterExpressions: Expression[];
};
