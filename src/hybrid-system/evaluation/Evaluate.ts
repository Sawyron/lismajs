import { Integrator } from '../../integration/types/Integrator';
import { IntegrationStep } from '../../integration/types/IntegrationStep';
import { DerivativeSystem } from '../../integration/types/DerivativeSystem';
import { Variable } from '../types/Variable';
import { HybridSystem } from '../types/HybridSystem';
import { EquationSystem } from './types/EquationSystem';
import { EvaluationStep, VariableValue } from './types/EvaluationStep';
import { TransitionController } from './TransitionController';
import { WhenStatementProcessor as WhenClauseProcessor } from './WhenClauseProcessor';

const evaluateHybridSystem = (
  hybridSystem: HybridSystem,
  integrator: Integrator,
  start: number,
  end: number
): EvaluationStep[] => {
  const ds = mapHsToDs(hybridSystem);
  const eqs = mapHsToEqs(hybridSystem);
  const valuesProvider = hybridSystemValuesProvider(hybridSystem);
  const evaluationSteps: EvaluationStep[] = [];
  const integrationSteps: IntegrationStep[] = [];
  let integrationStep = {
    x: start,
    values: hybridSystem.diffVariableNames.map(
      value => hybridSystem.table.get(value)!
    ),
  } as IntegrationStep;
  let algStep: number[] = [];
  const transitionController = new TransitionController(hybridSystem, () => {
    hybridSystem.diffVariableNames.forEach((variable, index) => {
      integrationStep.values[index] = hybridSystem.table.get(variable)!;
    });
  });
  const whenProcessor = new WhenClauseProcessor(hybridSystem.whenClauses);
  whenProcessor.init();
  while (integrationStep.x <= end) {
    algStep = eqs(integrationStep.x);
    transitionController.adjustState();
    hybridSystem.algVariableNames.forEach((algName, index) =>
      hybridSystem.table.set(algName, algStep[index])
    );
    evaluationSteps.push({
      x: integrationStep.x,
      values: valuesProvider(),
    });
    whenProcessor.process();
    integrationStep.values = hybridSystem.diffVariableNames.map(
      value => hybridSystem.table.get(value)!
    );
    integrationSteps.push(integrationStep);
    integrationStep = integrator.makeStep(ds, integrationStep);
    hybridSystem.table.set('time', integrationStep.x);
    hybridSystem.diffVariableNames.forEach((name, index) => {
      hybridSystem.table.set(name, integrationStep.values[index]);
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
      value: hybridSystem.table.get(name)!,
    }));
  return () => [
    ...getValues(hybridSystem.diffVariableNames),
    ...getValues(hybridSystem.algVariableNames),
  ];
};

const mapHsToDs = (hs: HybridSystem): DerivativeSystem => {
  const sharedDiffMapMap = groupVariablesByNames(hs.sharedState.diffVariables);
  const statesDiffMaps = new Map(
    hs.states.map(state => [
      state.name,
      groupVariablesByNames(state.diffVariables),
    ])
  );
  return () => {
    const { activeState } = hs;
    const activeStateDiffMap = statesDiffMaps.get(activeState.name)!;
    const compositeMap = new Map([...sharedDiffMapMap, ...activeStateDiffMap]);
    hs.ifClauses
      .values()
      .filter(clause => clause.predicate.evaluate())
      .map(clause => groupVariablesByNames(clause.diffVariables))
      .forEach(clauseMap => {
        for (const [name, variable] of clauseMap) {
          compositeMap.set(name, variable);
        }
      });
    const diffVariables = hs.diffVariableNames.map(
      diffName => compositeMap.get(diffName)!
    );
    return diffVariables.map(d => d.expression.evaluate());
  };
};

const groupVariablesByNames = (variables: Variable[]) =>
  new Map(variables.map(variable => [variable.name, variable]));

const mapHsToEqs = (hs: HybridSystem): EquationSystem => {
  const sharedAlgMap = groupVariablesByNames(hs.sharedState.algVariables);
  const stateAlgMaps = new Map(
    hs.states.map(state => [
      state.name,
      groupVariablesByNames(state.algVariables),
    ])
  );
  return () => {
    const { activeState } = hs;
    const activeStateAlgMap = stateAlgMaps.get(activeState.name)!;
    const compositeMap = new Map([...sharedAlgMap, ...activeStateAlgMap]);
    hs.algVariableNames.forEach(alg =>
      hs.table.set(alg, compositeMap.get(alg)!.expression.evaluate())
    );
    const ifMap = hs.ifClauses
      .values()
      .filter(clause => clause.predicate.evaluate())
      .map(clause => groupVariablesByNames(clause.algVariables))
      .reduce(
        (prev, current) => new Map([...prev, ...current]),
        new Map<string, Variable>()
      );
    for (const [name, variable] of ifMap) {
      compositeMap.set(name, variable);
    }
    return hs.algVariableNames.map(alg => {
      const value = compositeMap.get(alg)!.expression.evaluate();
      hs.table.set(alg, value);
      return value;
    });
  };
};

export { evaluateHybridSystem };
