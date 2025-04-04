export type EvaluationStep = {
  x: number;
  values: VariableValue[];
};

export type VariableValue = {
  name: string;
  value: number;
};
