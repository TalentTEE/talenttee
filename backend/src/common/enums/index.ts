export enum UserRole {
  SEEKER = 'SEEKER',
  EMPLOYER = 'EMPLOYER',
}

export enum DataSourceProvider {
  GITHUB = 'GITHUB',
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  GOV24 = 'GOV24',
  PDF = 'PDF',
}

export enum DataSourceStatus {
  CONNECTED = 'CONNECTED',
  MOCK = 'MOCK',
  DISCONNECTED = 'DISCONNECTED',
}

export enum JobPostingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum NegotiationState {
  INITIATED = 'INITIATED',
  EMPLOYER_OFFER = 'EMPLOYER_OFFER',
  SEEKER_COUNTER = 'SEEKER_COUNTER',
  EMPLOYER_COUNTER = 'EMPLOYER_COUNTER',
  AGREED = 'AGREED',
  FAILED = 'FAILED',
  MAX_ROUNDS = 'MAX_ROUNDS',
}

export enum NegotiationActor {
  SEEKER_AGENT = 'SEEKER_AGENT',
  EMPLOYER_AGENT = 'EMPLOYER_AGENT',
}

export enum NegotiationDecision {
  COUNTER = 'COUNTER',
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}

export enum ResumeStatus {
  COLLECTING = 'COLLECTING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}
