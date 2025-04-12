import { BooleanExpression } from '../../expressions';
import { Variable } from './Variable';

export type IfClause = {
  predicate: BooleanExpression;
  diffVariables: Variable[];
  algVariables: Variable[];
};
