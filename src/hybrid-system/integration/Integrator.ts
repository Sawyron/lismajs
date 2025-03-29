export type IntegrationStep = {
  x: number;
  values: number[];
};

export type DerivativeSystem = (x: number, y: number[]) => number[];

export interface Integrator {
  makeStep: (
    system: DerivativeSystem,
    previousStep: IntegrationStep
  ) => IntegrationStep;
}

export function solve(
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
