import { Constant } from './Constant';
import { State } from './State';
import { WhenClause } from './WhenClause';

export type HybridSystem = {
  diffVariableNames: string[];
  algVariableNames: string[];
  states: State[];
  constants: Constant[];
  table: Map<string, number>;
  whenClauses: WhenClause[];
  sharedState: State;
  activeState: State;
};
