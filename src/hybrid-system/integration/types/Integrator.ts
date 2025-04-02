import { DerivativeSystem } from './DerivativeSystem';
import { IntegrationStep } from './IntegrationStep';

export interface Integrator {
  makeStep: (
    system: DerivativeSystem,
    previousStep: IntegrationStep
  ) => IntegrationStep;
}
