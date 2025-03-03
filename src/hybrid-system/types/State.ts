import { DiffVariable } from './DiffVariable';

export type State = {
  name: string;
  predicate: string[];
  diffVariables: DiffVariable[];
  from: string[];
};
