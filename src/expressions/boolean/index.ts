const binaryBooleanOperations = new Set<string>();

{
  binaryBooleanOperations.add('==');
  binaryBooleanOperations.add('!=');
  binaryBooleanOperations.add('||');
  binaryBooleanOperations.add('&&');
  binaryBooleanOperations.add('>');
  binaryBooleanOperations.add('>=');
  binaryBooleanOperations.add('<');
  binaryBooleanOperations.add('<=');
}

const booleanOperations = new Set<string>(binaryBooleanOperations);

{
  booleanOperations.add('!');
}

export { booleanOperations, binaryBooleanOperations };
