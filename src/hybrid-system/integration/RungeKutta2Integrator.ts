import { Integrator } from './types/Integrator';
import { IntegrationStep } from './types/IntegrationStep';

export default class RungeKutta2Integrator implements Integrator {
  constructor(private readonly h: number) {}

  makeStep = (
    system: (x: number, y: number[]) => number[],
    previousStep: IntegrationStep
  ): IntegrationStep => {
    const halfStep = this.h / 2;
    const k1 = system(previousStep.x, previousStep.values);
    // α = 0.5, β = 0.5
    const k2 = system(
      previousStep.x + halfStep,
      previousStep.values.map((value, index) => value + halfStep * k1[index])
    );
    // w1 = 0, w2 = 1
    const values = previousStep.values.map(
      (value, index) => value + this.h * k2[index]
    );
    return { x: previousStep.x + this.h, values };
  };
}
