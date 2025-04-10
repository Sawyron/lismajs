import { WhenClause } from '../types/WhenClause';

export class WhenStatementProcessor {
  private predicateValues: boolean[] = [];

  constructor(private readonly clauses: WhenClause[]) {
    this.predicateValues = clauses.map(s => s.predicate.evaluate());
  }

  public process() {
    const currentPredicateValues = this.clauses.map(s =>
      s.predicate.evaluate()
    );
    currentPredicateValues.forEach((value, index) => {
      const previousValue = this.predicateValues[index];
      if (!previousValue && value) {
        this.clauses[index].statements.forEach(statement =>
          statement.execute()
        );
      }
    });
    this.predicateValues = currentPredicateValues;
  }

  public init() {
    this.clauses.forEach((clause, index) => {
      if (this.predicateValues[index]) {
        clause.statements.forEach(statement => statement.execute());
      }
    });
  }
}
