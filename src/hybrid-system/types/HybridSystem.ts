import { Constant } from './Consant';
import { State } from './State';

export type HybridSystem = {
  diffVariableNames: string[];
  states: State[];
  constants: Constant[];
  initials: Map<string, string[]>;
};
