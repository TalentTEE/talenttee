import { NegotiationState, NegotiationDecision, NegotiationActor } from '../common/enums/index.js';

export function getActorForState(state: NegotiationState): NegotiationActor {
  switch (state) {
    case NegotiationState.EMPLOYER_OFFER:
    case NegotiationState.EMPLOYER_COUNTER:
      return NegotiationActor.EMPLOYER_AGENT;
    case NegotiationState.SEEKER_COUNTER:
      return NegotiationActor.SEEKER_AGENT;
    default:
      throw new Error(`No actor for state: ${state}`);
  }
}

export function transition(
  currentState: NegotiationState,
  decision: NegotiationDecision,
  currentRound: number,
  maxRounds: number,
): NegotiationState {
  if (decision === NegotiationDecision.ACCEPT) return NegotiationState.AGREED;
  if (decision === NegotiationDecision.REJECT) return NegotiationState.FAILED;
  if (currentRound >= maxRounds) return NegotiationState.MAX_ROUNDS;

  // COUNTER
  switch (currentState) {
    case NegotiationState.EMPLOYER_OFFER:
      return NegotiationState.SEEKER_COUNTER;
    case NegotiationState.SEEKER_COUNTER:
      return NegotiationState.EMPLOYER_COUNTER;
    case NegotiationState.EMPLOYER_COUNTER:
      return NegotiationState.SEEKER_COUNTER;
    default:
      throw new Error(`Invalid transition from ${currentState}`);
  }
}

export function isTerminal(state: NegotiationState): boolean {
  return [
    NegotiationState.AGREED,
    NegotiationState.FAILED,
    NegotiationState.MAX_ROUNDS,
  ].includes(state);
}
