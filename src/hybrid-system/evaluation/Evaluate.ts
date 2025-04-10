import { Integrator } from '../../integration/types/Integrator';
import { IntegrationStep } from '../../integration/types/IntegrationStep';
import { DerivativeSystem } from '../../integration/types/DerivativeSystem';
import { Variable } from '../types/Variable';
import { HybridSystem } from '../types/HybridSystem';
import { State } from '../types/State';
import { EquationSystem } from './types/EquationSystem';
import { EvaluationStep, VariableValue } from './types/EvaluationStep';
import { TransitionController } from './TransitionController';

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
  const sharedDiffMapMap = stateToDiffMap(hs.sharedState);
  const statesDiffMaps = new Map(
    hs.states.map(state => [state.name, stateToDiffMap(state)])
  );
  return () => {
    const { activeState } = hs;
    const activeStateDiffMap = statesDiffMaps.get(activeState.name)!;
    const diffVariables = hs.diffVariableNames.map(
      diffName =>
        activeStateDiffMap.get(diffName) ?? sharedDiffMapMap.get(diffName)!
    );
    return diffVariables.map(d => d.expression.evaluate());
  };
};

const mapHsToEqs = (hs: HybridSystem): EquationSystem => {
  const sharedAlgMap = stateToAlgMap(hs.sharedState);
  const stateAlgMaps = new Map(
    hs.states.map(state => [state.name, stateToAlgMap(state)])
  );
  return () => {
    const { activeState } = hs;
    const activeStateAlgMap = stateAlgMaps.get(activeState.name)!;
    const algVariables = hs.algVariableNames.map(
      algName => activeStateAlgMap.get(algName) ?? sharedAlgMap.get(algName)!
    );
    return algVariables.map(a => a.expression.evaluate());
  };
};

const stateToDiffMap = (state: State): Map<string, Variable> =>
  new Map(state.diffVariables.map(diff => [diff.name, diff]));

const stateToAlgMap = (state: State): Map<string, Variable> =>
  new Map(state.algVariables.map(alg => [alg.name, alg]));

export { evaluateHybridSystem };
