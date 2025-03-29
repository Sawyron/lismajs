import { IntegrationStep, Integrator } from './Integrator';

export default class EulerIntegrator implements Integrator {
  constructor(private readonly h: number) {}

  makeStep = (
    system: (x: number, y: number[]) => number[],
    previousStep: IntegrationStep
  ): IntegrationStep => {
    const derivatives = system(previousStep.x, previousStep.values);
    const values = previousStep.values.map(
      (value, index) => value + this.h * derivatives[index]
    );
    return { x: previousStep.x + this.h, values: values };
  };
}
