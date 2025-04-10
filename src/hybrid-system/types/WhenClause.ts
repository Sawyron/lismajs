import { BooleanExpression } from '../../expressions';
import { Statement } from '../../statements';

export type WhenClause = {
  predicate: BooleanExpression;
  statements: Statement[];
};
