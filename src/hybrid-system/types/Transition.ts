import { BooleanExpression } from '../../expressions/boolean/BooleanExpression';

export type Transition = {
  from: string;
  predicate: BooleanExpression;
};
