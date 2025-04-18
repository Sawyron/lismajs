import { Context, createContext } from 'vm';

const createHsSandboxContext = (table: Map<string, number>): Context => {
  const getVar = (name: string) => table.get(name);
  const setVar = (name: string, value: number) => table.set(name, value);
  return createContext({ getVar, setVar, Math });
};

export { createHsSandboxContext };
