export const MATCH_EVENTS = {
  RESUME_COMPLETED: 'match.resume.completed',
  JOB_CREATED: 'match.job.created',
  JOB_SEEKING_ON: 'match.jobseeking.on',
} as const;

export interface ResumeCompletedEvent {
  seekerId: string;
}

export interface JobCreatedEvent {
  jobId: string;
}

export interface JobSeekingOnEvent {
  seekerId: string;
}
