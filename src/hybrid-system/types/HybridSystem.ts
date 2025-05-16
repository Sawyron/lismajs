import { Context } from 'vm';
import { Constant } from './Constant';
import { IfClause } from './IfClause';
import { State } from './State';
import { WhenClause } from './WhenClause';
import { WhileClause } from './WhileClause';
import { Variable } from './Variable';

export type HybridSystem = {
  diffVariableNames: string[];
  algVariableNames: string[];
  arrayNames: string[];
  states: State[];
  constants: Constant[];
  variables: Variable[];
  variableTable: Map<string, number>;
  arrayTable: Map<string, number[]>;
  whenClauses: WhenClause[];
  ifClauses: IfClause[];
  whileClauses: WhileClause[];
  sharedState: State;
  activeState: State;
  context: Context;
};
