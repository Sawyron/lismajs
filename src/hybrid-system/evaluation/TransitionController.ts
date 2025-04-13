import { HybridSystem } from '../types/HybridSystem';
import { State } from '../types/State';
import { Transition } from '../types/Transition';

export class TransitionController {
  private readonly stateToFromTransitions: Map<string, [State, Transition][]>;

  constructor(
    private readonly hybridSystem: HybridSystem,
    private readonly onStateChanged: () => void = () => {}
  ) {
    this.stateToFromTransitions = new Map(
      hybridSystem.states.map(state => [
        state.name,
        getTransitionsFromState(state, hybridSystem),
      ])
    );
  }

  public adjustState() {
    const transitions = this.stateToFromTransitions.get(
      this.hybridSystem.activeState.name
    )!;
    for (const [state, transition] of transitions) {
      if (transition.predicate.evaluate()) {
        this.hybridSystem.activeState = state;
        for (const action of state.onEnterStatements) {
          action.execute();
        }
        this.onStateChanged();
        break;
      }
    }
  }
}

const getTransitionsFromState = (
  targetState: State,
  hs: HybridSystem
): [State, Transition][] =>
  hs.states
    .values()
    .filter(s => s.name !== targetState.name)
    .flatMap(state =>
      state.transitions
        .values()
        .filter(t => t.from === targetState.name)
        .map<[State, Transition]>(t => [state, t])
    )
    .toArray();
