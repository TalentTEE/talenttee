import { getActorForState, transition, isTerminal } from '../negotiation-engine.js';
import { NegotiationState, NegotiationDecision, NegotiationActor } from '../../common/enums/index.js';

describe('negotiation-engine', () => {
  describe('getActorForState', () => {
    it('EMPLOYER_OFFER → EMPLOYER_AGENT', () => {
      expect(getActorForState(NegotiationState.EMPLOYER_OFFER)).toBe(NegotiationActor.EMPLOYER_AGENT);
    });

    it('SEEKER_COUNTER → SEEKER_AGENT', () => {
      expect(getActorForState(NegotiationState.SEEKER_COUNTER)).toBe(NegotiationActor.SEEKER_AGENT);
    });

    it('EMPLOYER_COUNTER → EMPLOYER_AGENT', () => {
      expect(getActorForState(NegotiationState.EMPLOYER_COUNTER)).toBe(NegotiationActor.EMPLOYER_AGENT);
    });

    it('throws on INITIATED', () => {
      expect(() => getActorForState(NegotiationState.INITIATED)).toThrow();
    });

    it('throws on terminal states', () => {
      expect(() => getActorForState(NegotiationState.AGREED)).toThrow();
      expect(() => getActorForState(NegotiationState.FAILED)).toThrow();
      expect(() => getActorForState(NegotiationState.MAX_ROUNDS)).toThrow();
    });
  });

  describe('transition', () => {
    it('ACCEPT from any state → AGREED', () => {
      expect(transition(NegotiationState.EMPLOYER_OFFER, NegotiationDecision.ACCEPT, 1, 5)).toBe(NegotiationState.AGREED);
      expect(transition(NegotiationState.SEEKER_COUNTER, NegotiationDecision.ACCEPT, 2, 5)).toBe(NegotiationState.AGREED);
      expect(transition(NegotiationState.EMPLOYER_COUNTER, NegotiationDecision.ACCEPT, 3, 5)).toBe(NegotiationState.AGREED);
    });

    it('REJECT from any state → FAILED', () => {
      expect(transition(NegotiationState.EMPLOYER_OFFER, NegotiationDecision.REJECT, 1, 5)).toBe(NegotiationState.FAILED);
      expect(transition(NegotiationState.SEEKER_COUNTER, NegotiationDecision.REJECT, 2, 5)).toBe(NegotiationState.FAILED);
    });

    it('COUNTER at maxRounds → MAX_ROUNDS', () => {
      expect(transition(NegotiationState.EMPLOYER_OFFER, NegotiationDecision.COUNTER, 5, 5)).toBe(NegotiationState.MAX_ROUNDS);
      expect(transition(NegotiationState.SEEKER_COUNTER, NegotiationDecision.COUNTER, 10, 10)).toBe(NegotiationState.MAX_ROUNDS);
    });

    it('EMPLOYER_OFFER + COUNTER → SEEKER_COUNTER', () => {
      expect(transition(NegotiationState.EMPLOYER_OFFER, NegotiationDecision.COUNTER, 1, 5)).toBe(NegotiationState.SEEKER_COUNTER);
    });

    it('SEEKER_COUNTER + COUNTER → EMPLOYER_COUNTER', () => {
      expect(transition(NegotiationState.SEEKER_COUNTER, NegotiationDecision.COUNTER, 2, 5)).toBe(NegotiationState.EMPLOYER_COUNTER);
    });

    it('EMPLOYER_COUNTER + COUNTER → SEEKER_COUNTER', () => {
      expect(transition(NegotiationState.EMPLOYER_COUNTER, NegotiationDecision.COUNTER, 3, 5)).toBe(NegotiationState.SEEKER_COUNTER);
    });

    it('full negotiation cycle: 3 rounds → AGREED', () => {
      let state = NegotiationState.EMPLOYER_OFFER;
      state = transition(state, NegotiationDecision.COUNTER, 1, 5); // → SEEKER_COUNTER
      expect(state).toBe(NegotiationState.SEEKER_COUNTER);
      state = transition(state, NegotiationDecision.COUNTER, 2, 5); // → EMPLOYER_COUNTER
      expect(state).toBe(NegotiationState.EMPLOYER_COUNTER);
      state = transition(state, NegotiationDecision.ACCEPT, 3, 5); // → AGREED
      expect(state).toBe(NegotiationState.AGREED);
    });
  });

  describe('isTerminal', () => {
    it('AGREED is terminal', () => {
      expect(isTerminal(NegotiationState.AGREED)).toBe(true);
    });

    it('FAILED is terminal', () => {
      expect(isTerminal(NegotiationState.FAILED)).toBe(true);
    });

    it('MAX_ROUNDS is terminal', () => {
      expect(isTerminal(NegotiationState.MAX_ROUNDS)).toBe(true);
    });

    it('non-terminal states', () => {
      expect(isTerminal(NegotiationState.INITIATED)).toBe(false);
      expect(isTerminal(NegotiationState.EMPLOYER_OFFER)).toBe(false);
      expect(isTerminal(NegotiationState.SEEKER_COUNTER)).toBe(false);
      expect(isTerminal(NegotiationState.EMPLOYER_COUNTER)).toBe(false);
    });
  });
});
