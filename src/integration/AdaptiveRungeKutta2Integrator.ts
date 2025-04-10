import { Integrator } from './types/Integrator';
import { IntegrationStep } from './types/IntegrationStep';

export default class AdaptiveRungeKutta2Integrator implements Integrator {
  constructor(
    private h: number,
    private tol: number
  ) {}

  makeStep = (
    system: (x: number, y: number[]) => number[],
    previousStep: IntegrationStep
  ): IntegrationStep => {
    const smallValue = 1e-10;
    const halfStep = this.h / 2;
    let values: number[] = [];
    let error = 0;

    do {
      const k1 = system(previousStep.x, previousStep.values);
      const yTemp = previousStep.values.map(
        (value, i) => value + halfStep * k1[i]
      );
      const k2 = system(previousStep.x + halfStep, yTemp);
      const yFullStep = previousStep.values.map(
        (value, i) => value + halfStep * (k1[i] + k2[i])
      );

      const k2Half = system(previousStep.x + halfStep, yFullStep);
      const yHalfStep = previousStep.values.map(
        (value, i) => value + (halfStep / 2) * (k1[i] + k2Half[i])
      );

      const k1Half = system(previousStep.x + halfStep, yHalfStep);
      const yHalfStepTemp = yHalfStep.map(
        (value, i) => value + halfStep * k1Half[i]
      );
      const k2Half2 = system(previousStep.x + this.h, yHalfStepTemp);
      values = yHalfStep.map(
        (value, i) => value + (halfStep / 2) * (k1Half[i] + k2Half2[i])
      );

      error = Math.max(
        ...previousStep.values.map(
          (yi, i) =>
            Math.abs(values[i] - yFullStep[i]) /
            (this.tol + smallValue * Math.abs(yi))
        )
      );

      this.h *= Math.min(
        2,
        Math.max(0.5, 0.9 * Math.pow(this.tol / (error + smallValue), 0.5))
      );
    } while (error > this.tol);

    return { x: previousStep.x + this.h, values };
  };
}
