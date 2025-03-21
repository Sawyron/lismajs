import { DiffVariable } from './DiffVariable';
import { Transtion as Transition } from './Transition';

export type State = {
  name: string;
  diffVariables: DiffVariable[];
  transitions: Transition[];
};
