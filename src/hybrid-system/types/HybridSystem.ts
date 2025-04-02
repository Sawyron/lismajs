import { Constant } from './Constant';
import { State } from './State';

export type HybridSystem = {
  diffVariableNames: string[];
  algVariableNames: string[];
  states: State[];
  constants: Constant[];
  table: Map<string, number>;
  sharedState: State;
  activeState: State;
};
