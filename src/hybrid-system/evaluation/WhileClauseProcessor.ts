import { WhileClause } from '../types/WhileClause';

export class WhileClauseProcessor {
  constructor(private readonly whileClauses: readonly WhileClause[]) {}

  public process() {
    for (const clause of this.whileClauses) {
      if (clause.predicate.evaluate()) {
        clause.statements.forEach(statement => statement.execute());
      }
    }
  }
}
