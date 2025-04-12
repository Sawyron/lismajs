import { Constant } from './Constant';
import { IfClause } from './IfClause';
import { State } from './State';
import { WhenClause } from './WhenClause';

export type HybridSystem = {
  diffVariableNames: string[];
  algVariableNames: string[];
  states: State[];
  constants: Constant[];
  table: Map<string, number>;
  whenClauses: WhenClause[];
  ifClauses: IfClause[];
  sharedState: State;
  activeState: State;
};
