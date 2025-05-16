import { BooleanExpression } from '../../expressions';
import { Statement } from '../../statements';

export type WhileClause = {
  predicate: BooleanExpression;
  statements: Statement[];
};
