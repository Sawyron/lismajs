import { Constant } from './Constant';
import { State } from './State';

export type HybridSystem = {
  diffVariableNames: string[];
  states: State[];
  constants: Constant[];
  table: Map<string, number>;
  activeState?: State;
};
