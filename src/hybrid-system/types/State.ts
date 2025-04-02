import Expression from '../../expressions/Expression';
import { Variable } from './Variable';
import { Transition as Transition } from './Transition';

export type State = {
  name: string;
  diffVariables: Variable[];
  algVariables: Variable[];
  transitions: Transition[];
  onEnterExpressions: Expression[];
};
