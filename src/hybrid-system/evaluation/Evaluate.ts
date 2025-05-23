import { Integrator } from '../../integration/types/Integrator';
import { IntegrationStep } from '../../integration/types/IntegrationStep';
import { DerivativeSystem } from '../../integration/types/DerivativeSystem';
import { Variable } from '../types/Variable';
import { HybridSystem } from '../types/HybridSystem';
import { EquationSystem } from './types/EquationSystem';
import { EvaluationStep, VariableValue } from './types/EvaluationStep';
import { TransitionController } from './TransitionController';
import { WhenStatementProcessor as WhenClauseProcessor } from './WhenClauseProcessor';
import { WhileClauseProcessor } from './WhileClauseProcessor';
import { EvaluationError } from './EvaluationError';

const evaluateHybridSystem = (
  hybridSystem: HybridSystem,
  integrator: Integrator,
  start: number,
  end: number
): EvaluationStep[] => {
  const ds = mapHsToDs(hybridSystem);
  const eqs = mapHsToEqs(hybridSystem);
  const valuesProvider = hybridSystemValuesProvider(hybridSystem);
  const transitionController = new TransitionController(hybridSystem, () => {
    hybridSystem.diffVariableNames.forEach((variable, index) => {
      integrationStep.values[index] = hybridSystem.variableTable.get(variable)!;
    });
  });

  const evaluationSteps: EvaluationStep[] = [];
  const integrationSteps: IntegrationStep[] = [];
  let integrationStep = {
    x: start,
    values: hybridSystem.diffVariableNames.map(
      value => hybridSystem.variableTable.get(value)!
    ),
  } as IntegrationStep;
  let algStep: number[] = [];

  eqs(start);
  transitionController.adjustState();
  const whenProcessor = new WhenClauseProcessor(hybridSystem.whenClauses);
  whenProcessor.init();
  const whileProcessor = new WhileClauseProcessor(hybridSystem.whileClauses);

  hybridSystem.sharedState.onEnterStatements.forEach(it => it.execute());
  hybridSystem.sharedState.onEnterStatements = [];

  while (integrationStep.x <= end) {
    algStep = eqs(integrationStep.x);
    whenProcessor.process();
    whileProcessor.process();
    transitionController.adjustState();
    hybridSystem.algVariableNames.forEach((algName, index) =>
      hybridSystem.variableTable.set(algName, algStep[index])
    );
    evaluationSteps.push({
      x: integrationStep.x,
      values: valuesProvider(),
      state: hybridSystem.activeState.name,
    });
    integrationStep.values = hybridSystem.diffVariableNames.map(
      value => hybridSystem.variableTable.get(value)!
    );
    integrationSteps.push(integrationStep);
    integrationStep = integrator.makeStep(ds, integrationStep);
    hybridSystem.variableTable.set('time', integrationStep.x);
    hybridSystem.diffVariableNames.forEach((name, index) => {
      hybridSystem.variableTable.set(name, integrationStep.values[index]);
    });
  }
  return evaluationSteps;
};

const hybridSystemValuesProvider = (
  hybridSystem: HybridSystem
): (() => VariableValue[]) => {
  const getValues = (variableNames: string[]): VariableValue[] =>
    variableNames.map(name => ({
      name: name,
      value: hybridSystem.variableTable.get(name)!,
    }));
  const variableNames = hybridSystem.variables.map(it => it.name);
  return () => [
    ...getValues(hybridSystem.diffVariableNames),
    ...getValues(hybridSystem.algVariableNames),
    ...getValues(variableNames),
    ...hybridSystem.arrayNames.flatMap(arrayName => {
      const arrayValues = hybridSystem.arrayTable.get(arrayName)!;
      return arrayValues.map((item, index) => ({
        name: `${arrayName}@${index}`,
        value: item,
      }));
    }),
  ];
};

const mapHsToDs = (hs: HybridSystem): DerivativeSystem => {
  const sharedDiffMapMap = variablesToMapByNames(hs.sharedState.diffVariables);
  const statesDiffMaps = new Map(
    hs.states.map(state => [
      state.name,
      variablesToMapByNames(state.diffVariables),
    ])
  );
  return () => {
    const { activeState } = hs;
    const activeStateDiffMap = statesDiffMaps.get(activeState.name)!;
    const compositeMap = new Map([...sharedDiffMapMap, ...activeStateDiffMap]);
    hs.ifClauses
      .values()
      .filter(clause => clause.predicate.evaluate())
      .map(clause => variablesToMapByNames(clause.diffVariables))
      .forEach(clauseMap => {
        for (const [name, variable] of clauseMap) {
          compositeMap.set(name, variable);
        }
      });
    validateVariableMap(hs, hs.diffVariableNames, compositeMap);
    const diffVariables = hs.diffVariableNames.map(
      diffName => compositeMap.get(diffName)!
    );
    return diffVariables.map(d => d.expression.evaluate());
  };
};

const variablesToMapByNames = (variables: Variable[]) =>
  new Map(variables.map(variable => [variable.name, variable]));

const mapHsToEqs = (hs: HybridSystem): EquationSystem => {
  const sharedAlgMap = variablesToMapByNames(hs.sharedState.algVariables);
  const stateAlgMaps = new Map(
    hs.states.map(state => [
      state.name,
      variablesToMapByNames(state.algVariables),
    ])
  );
  return () => {
    const { activeState } = hs;
    const activeStateAlgMap = stateAlgMaps.get(activeState.name)!;
    const compositeMap = new Map([...sharedAlgMap, ...activeStateAlgMap]);
    validateVariableMap(hs, hs.algVariableNames, compositeMap);
    hs.algVariableNames.forEach(alg => {
      hs.variableTable.set(alg, compositeMap.get(alg)!.expression.evaluate());
    });
    const ifMap = hs.ifClauses
      .values()
      .filter(clause => clause.predicate.evaluate())
      .map(clause => variablesToMapByNames(clause.algVariables))
      .reduce(
        (prev, current) => new Map([...prev, ...current]),
        new Map<string, Variable>()
      );
    for (const [name, variable] of ifMap) {
      compositeMap.set(name, variable);
    }
    return hs.algVariableNames.map(alg => {
      const value = compositeMap.get(alg)!.expression.evaluate();
      hs.variableTable.set(alg, value);
      return value;
    });
  };
};

const validateVariableMap = (
  hs: HybridSystem,
  variableNames: string[],
  variableMap: Map<string, Variable>
) => {
  const missingVariables = variableNames.filter(name => !variableMap.has(name));
  if (missingVariables.length !== 0) {
    const joinedNames = missingVariables.map(name => `'${name}'`).join(',');
    throw new EvaluationError(
      `Could not find definition for ${joinedNames} Probably it's not defined for state ${hs.activeState.name} or shared state`
    );
  }
};

export { evaluateHybridSystem };
