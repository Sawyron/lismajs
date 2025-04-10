import { Variable } from './Variable';
import { Transition } from './Transition';
import { Statement } from '../../statements/Statement';

export type State = {
  name: string;
  diffVariables: Variable[];
  algVariables: Variable[];
  transitions: Transition[];
  onEnterStatements: Statement[];
};
