export class EvaluationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
