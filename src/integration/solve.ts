import { DerivativeSystem } from './types/DerivativeSystem';
import { IntegrationStep } from './types/IntegrationStep';
import { Integrator } from './types/Integrator';

export function solveOdeSystem(
  system: DerivativeSystem,
  initialStep: IntegrationStep,
  end: number,
  integrator: Integrator
): IntegrationStep[] {
  let currentStep: IntegrationStep = { ...initialStep };
  const steps: IntegrationStep[] = [];
  while (currentStep.x < end) {
    steps.push(currentStep);
    currentStep = integrator.makeStep(system, currentStep);
  }
  return steps;
}
