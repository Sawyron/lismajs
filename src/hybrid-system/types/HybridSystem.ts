import { Context } from 'vm';
import { Constant } from './Constant';
import { IfClause } from './IfClause';
import { State } from './State';
import { WhenClause } from './WhenClause';

export type HybridSystem = {
  diffVariableNames: string[];
  algVariableNames: string[];
  arrayNames: string[];
  states: State[];
  constants: Constant[];
  variableTable: Map<string, number>;
  arrayTable: Map<string, number[]>;
  whenClauses: WhenClause[];
  ifClauses: IfClause[];
  sharedState: State;
  activeState: State;
  context: Context;
};
