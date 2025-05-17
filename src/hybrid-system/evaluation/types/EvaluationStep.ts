export type EvaluationStep = {
  x: number;
  values: VariableValue[];
  state: string;
};

export type VariableValue = {
  name: string;
  value: number;
};
