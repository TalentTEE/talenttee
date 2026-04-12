import { User } from '../user.entity.js';
import { ResumeProfile } from '../resume-profile.entity.js';
import { DataSourceConnection } from '../data-source-connection.entity.js';
import { JobPosting } from '../job-posting.entity.js';
import { NegotiationSession } from '../negotiation-session.entity.js';
import { NegotiationRound } from '../negotiation-round.entity.js';
import { EscrowDeposit } from '../escrow-deposit.entity.js';
import { ProfileAccessGrant } from '../profile-access-grant.entity.js';
import { PaymentRecord } from '../payment-record.entity.js';
import { MatchResult } from '../match-result.entity.js';
import { UserRole, NegotiationState, NegotiationDecision } from '../../common/enums/index.js';

describe('All Entities', () => {
  it('should instantiate all 10 entities', () => {
    expect(new User()).toBeDefined();
    expect(new ResumeProfile()).toBeDefined();
    expect(new DataSourceConnection()).toBeDefined();
    expect(new JobPosting()).toBeDefined();
    expect(new NegotiationSession()).toBeDefined();
    expect(new NegotiationRound()).toBeDefined();
    expect(new EscrowDeposit()).toBeDefined();
    expect(new ProfileAccessGrant()).toBeDefined();
    expect(new PaymentRecord()).toBeDefined();
    expect(new MatchResult()).toBeDefined();
  });

  it('should set User fields correctly', () => {
    const user = new User();
    user.nearAccountId = 'alice.testnet';
    user.role = UserRole.SEEKER;
    user.publicKey = 'ed25519:abc123';
    expect(user.nearAccountId).toBe('alice.testnet');
    expect(user.role).toBe(UserRole.SEEKER);
  });

  it('should set ResumeProfile fields correctly', () => {
    const profile = new ResumeProfile();
    profile.skills = ['TypeScript', 'React', 'NestJS'];
    profile.marketValueMin = 60000000;
    profile.marketValueMax = 80000000;
    expect(profile.skills).toHaveLength(3);
    expect(profile.marketValueMin).toBe(60000000);
  });

  it('should set NegotiationSession fields correctly', () => {
    const session = new NegotiationSession();
    session.state = NegotiationState.INITIATED;
    session.maxRounds = 7;
    session.currentRound = 0;
    expect(session.state).toBe('INITIATED');
    expect(session.maxRounds).toBe(7);
  });

  it('should set NegotiationRound decision correctly', () => {
    const round = new NegotiationRound();
    round.decision = NegotiationDecision.ACCEPT;
    round.round = 3;
    expect(round.decision).toBe('ACCEPT');
    expect(round.round).toBe(3);
  });
});
