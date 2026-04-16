/**
 * Seed script — bootstraps NestJS, creates test users/job/resume,
 * triggers a real NEAR AI negotiation, and prints JWT tokens.
 *
 * Usage:
 *   cd backend && npm run seed          # full seed (demo data + real NEAR AI negotiation)
 *   cd backend && npm run seed:demo     # demo data only (no AI calls, fast)
 */
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { AppModule } from './app.module.js';
import { AuthService } from './auth/auth.service.js';
import { NegotiationService } from './negotiation/negotiation.service.js';
import { User } from './entities/user.entity.js';
import { JobPosting } from './entities/job-posting.entity.js';
import { ResumeProfile } from './entities/resume-profile.entity.js';
import { DataSourceConnection } from './entities/data-source-connection.entity.js';
import { MatchResult } from './entities/match-result.entity.js';
import { NegotiationSession } from './entities/negotiation-session.entity.js';
import {
  UserRole, JobPostingStatus, ResumeStatus, NegotiationState,
  DataSourceProvider, DataSourceStatus,
} from './common/enums/index.js';

// ─── helpers ───────────────────────────────────────────────────────────

function makeKeypair() {
  const kp = nacl.sign.keyPair();
  return { kp, pubStr: `ed25519:${bs58.encode(kp.publicKey)}` };
}

function fakeEmbedding(): string {
  const vec = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return JSON.stringify(vec.map(v => v / norm));
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── demo data definitions ─────────────────────────────────────────────

const SEEKERS = [
  { id: 'seeker-01', skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'], years: 3, salaryMin: 45_000_000, salaryMax: 60_000_000, summary: 'Frontend developer passionate about design systems and interactive UIs.', company: 'PixelCraft', title: 'Frontend Engineer' },
  { id: 'seeker-02', skills: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis'], years: 5, salaryMin: 55_000_000, salaryMax: 75_000_000, summary: 'Backend engineer with deep experience in scalable API design.', company: 'DataFlow Inc.', title: 'Senior Backend Dev' },
  { id: 'seeker-03', skills: ['Python', 'TensorFlow', 'PyTorch', 'SQL'], years: 4, salaryMin: 60_000_000, salaryMax: 85_000_000, summary: 'ML engineer specializing in NLP and recommendation systems.', company: 'AI Research Lab', title: 'ML Engineer' },
  { id: 'seeker-04', skills: ['Kubernetes', 'Docker', 'Terraform', 'AWS'], years: 6, salaryMin: 65_000_000, salaryMax: 90_000_000, summary: 'DevOps engineer focused on cloud-native infrastructure and CI/CD.', company: 'CloudScale', title: 'DevOps Lead' },
  { id: 'seeker-05', skills: ['Rust', 'NEAR Protocol', 'Solidity', 'TypeScript'], years: 3, salaryMin: 60_000_000, salaryMax: 80_000_000, summary: 'Blockchain developer with smart contract and DeFi experience.', company: 'Web3 Studios', title: 'Blockchain Dev' },
  { id: 'seeker-06', skills: ['Java', 'Spring Boot', 'Kafka', 'MySQL'], years: 7, salaryMin: 70_000_000, salaryMax: 95_000_000, summary: 'Enterprise backend architect experienced with microservices and event-driven systems.', company: 'EnterpriseTech', title: 'Staff Engineer' },
  { id: 'seeker-07', skills: ['React Native', 'Flutter', 'iOS', 'Android'], years: 4, salaryMin: 50_000_000, salaryMax: 70_000_000, summary: 'Cross-platform mobile developer who has shipped multiple consumer apps.', company: 'AppFactory', title: 'Mobile Developer' },
  { id: 'seeker-08', skills: ['Go', 'gRPC', 'PostgreSQL', 'Kubernetes'], years: 5, salaryMin: 60_000_000, salaryMax: 80_000_000, summary: 'Systems engineer building high-throughput distributed services in Go.', company: 'InfraCore', title: 'Systems Engineer' },
  { id: 'seeker-09', skills: ['Vue.js', 'Nuxt', 'GraphQL', 'Figma'], years: 2, salaryMin: 40_000_000, salaryMax: 55_000_000, summary: 'Frontend developer focused on Vue ecosystem and design collaboration.', company: 'DesignLab', title: 'Frontend Developer' },
  { id: 'seeker-10', skills: ['Python', 'Pandas', 'Spark', 'Airflow'], years: 4, salaryMin: 55_000_000, salaryMax: 75_000_000, summary: 'Data engineer building robust ETL pipelines and data warehouses.', company: 'DataPipe Co.', title: 'Data Engineer' },
  { id: 'seeker-11', skills: ['TypeScript', 'React', 'Node.js', 'MongoDB'], years: 3, salaryMin: 48_000_000, salaryMax: 65_000_000, summary: 'Full-stack developer with product-oriented mindset and startup experience.', company: 'StartupX', title: 'Full-stack Dev' },
  { id: 'seeker-12', skills: ['Swift', 'SwiftUI', 'Objective-C', 'Core Data'], years: 6, salaryMin: 60_000_000, salaryMax: 85_000_000, summary: 'Senior iOS developer who has built and maintained large-scale consumer apps.', company: 'iApp Labs', title: 'Senior iOS Dev' },
  { id: 'seeker-13', skills: ['C++', 'OpenGL', 'Unity', 'Unreal Engine'], years: 5, salaryMin: 55_000_000, salaryMax: 80_000_000, summary: 'Game engine developer with expertise in rendering and physics systems.', company: 'GameForge', title: 'Engine Developer' },
  { id: 'seeker-14', skills: ['Ruby', 'Rails', 'PostgreSQL', 'Sidekiq'], years: 8, salaryMin: 65_000_000, salaryMax: 90_000_000, summary: 'Experienced Rails developer who has scaled monoliths to handle millions of users.', company: 'RailsShop', title: 'Principal Engineer' },
  { id: 'seeker-15', skills: ['AWS', 'Azure', 'GCP', 'Terraform'], years: 4, salaryMin: 58_000_000, salaryMax: 78_000_000, summary: 'Multi-cloud architect helping organizations with cloud migration strategies.', company: 'CloudBridge', title: 'Cloud Architect' },
  { id: 'seeker-16', skills: ['Figma', 'CSS', 'Accessibility', 'Design Systems'], years: 3, salaryMin: 45_000_000, salaryMax: 62_000_000, summary: 'UI/UX engineer bridging design and engineering with accessible components.', company: 'AccessFirst', title: 'UI Engineer' },
  { id: 'seeker-17', skills: ['Scala', 'Spark', 'Flink', 'Kafka'], years: 5, salaryMin: 65_000_000, salaryMax: 90_000_000, summary: 'Big data engineer working on real-time analytics and stream processing.', company: 'StreamData', title: 'Data Engineer' },
  { id: 'seeker-18', skills: ['PHP', 'Laravel', 'MySQL', 'Vue.js'], years: 6, salaryMin: 50_000_000, salaryMax: 70_000_000, summary: 'Full-stack web developer with deep Laravel expertise and e-commerce background.', company: 'ShopEngine', title: 'Lead Developer' },
  { id: 'seeker-19', skills: ['Cybersecurity', 'Penetration Testing', 'Python', 'Linux'], years: 4, salaryMin: 60_000_000, salaryMax: 85_000_000, summary: 'Security engineer skilled in vulnerability assessment and incident response.', company: 'SecureNet', title: 'Security Engineer' },
  { id: 'seeker-20', skills: ['Elixir', 'Phoenix', 'PostgreSQL', 'LiveView'], years: 3, salaryMin: 55_000_000, salaryMax: 75_000_000, summary: 'Elixir developer building real-time collaborative applications with Phoenix.', company: 'LiveLabs', title: 'Elixir Developer' },
];

const EMPLOYERS = [
  { id: 'company-alpha', name: 'Alpha Tech' },
  { id: 'company-beta', name: 'Beta Solutions' },
  { id: 'company-gamma', name: 'Gamma AI' },
  { id: 'company-delta', name: 'Delta Finance' },
];

const JOBS: Array<{
  employerIdx: number; title: string; description: string;
  requiredSkills: string[]; preferredSkills: string[];
  salaryMin: number; salaryMax: number; remotePolicy: string;
}> = [
  // Alpha Tech — 3 postings
  { employerIdx: 0, title: 'Senior Frontend Engineer', description: 'Build next-gen web applications with React and TypeScript. Lead component architecture and design system efforts.', requiredSkills: ['React', 'TypeScript', 'CSS'], preferredSkills: ['Next.js', 'Tailwind CSS', 'Figma'], salaryMin: 55_000_000, salaryMax: 75_000_000, remotePolicy: 'Hybrid' },
  { employerIdx: 0, title: 'Backend Engineer (Node.js)', description: 'Design and implement scalable REST APIs and microservices using NestJS and PostgreSQL.', requiredSkills: ['Node.js', 'TypeScript', 'PostgreSQL'], preferredSkills: ['NestJS', 'Redis', 'Docker'], salaryMin: 50_000_000, salaryMax: 70_000_000, remotePolicy: 'Full Remote' },
  { employerIdx: 0, title: 'Mobile App Developer', description: 'Develop and maintain cross-platform mobile applications for iOS and Android.', requiredSkills: ['React Native', 'TypeScript'], preferredSkills: ['Flutter', 'iOS', 'Android'], salaryMin: 48_000_000, salaryMax: 68_000_000, remotePolicy: 'Hybrid' },
  // Beta Solutions — 3 postings
  { employerIdx: 1, title: 'DevOps Engineer', description: 'Manage cloud infrastructure, CI/CD pipelines, and container orchestration on AWS and Kubernetes.', requiredSkills: ['Kubernetes', 'Docker', 'AWS'], preferredSkills: ['Terraform', 'Ansible', 'Go'], salaryMin: 60_000_000, salaryMax: 85_000_000, remotePolicy: 'Full Remote' },
  { employerIdx: 1, title: 'Full-stack Developer', description: 'Work across the stack building user-facing features and robust backend services.', requiredSkills: ['TypeScript', 'React', 'Node.js'], preferredSkills: ['GraphQL', 'MongoDB', 'Docker'], salaryMin: 50_000_000, salaryMax: 72_000_000, remotePolicy: 'Hybrid' },
  { employerIdx: 1, title: 'Site Reliability Engineer', description: 'Ensure system reliability, performance, and observability across production infrastructure.', requiredSkills: ['Linux', 'Kubernetes', 'Monitoring'], preferredSkills: ['Go', 'Prometheus', 'Grafana'], salaryMin: 62_000_000, salaryMax: 88_000_000, remotePolicy: 'Full Remote' },
  // Gamma AI — 3 postings
  { employerIdx: 2, title: 'Machine Learning Engineer', description: 'Build and deploy ML models for NLP and computer vision applications in production.', requiredSkills: ['Python', 'PyTorch', 'TensorFlow'], preferredSkills: ['Kubernetes', 'MLflow', 'Spark'], salaryMin: 65_000_000, salaryMax: 95_000_000, remotePolicy: 'Hybrid' },
  { employerIdx: 2, title: 'Data Engineer', description: 'Design and maintain data pipelines, data lakes, and real-time analytics infrastructure.', requiredSkills: ['Python', 'SQL', 'Spark'], preferredSkills: ['Airflow', 'Kafka', 'dbt'], salaryMin: 55_000_000, salaryMax: 78_000_000, remotePolicy: 'Full Remote' },
  { employerIdx: 2, title: 'AI Research Scientist', description: 'Conduct cutting-edge research in LLMs and generative AI with publications and production impact.', requiredSkills: ['Python', 'PyTorch', 'NLP'], preferredSkills: ['Transformers', 'RLHF', 'Distributed Training'], salaryMin: 80_000_000, salaryMax: 120_000_000, remotePolicy: 'Hybrid' },
  // Delta Finance — 3 postings
  { employerIdx: 3, title: 'Blockchain Developer', description: 'Develop smart contracts and DeFi protocols on NEAR and Ethereum networks.', requiredSkills: ['Rust', 'Solidity', 'TypeScript'], preferredSkills: ['NEAR Protocol', 'Ethereum', 'DeFi'], salaryMin: 65_000_000, salaryMax: 90_000_000, remotePolicy: 'Full Remote' },
  { employerIdx: 3, title: 'Security Engineer', description: 'Protect financial systems through vulnerability assessment, penetration testing, and security architecture.', requiredSkills: ['Cybersecurity', 'Python', 'Linux'], preferredSkills: ['Penetration Testing', 'AWS', 'SIEM'], salaryMin: 60_000_000, salaryMax: 85_000_000, remotePolicy: 'Hybrid' },
  { employerIdx: 3, title: 'Backend Lead (Java)', description: 'Lead backend engineering team building high-frequency trading and payment systems.', requiredSkills: ['Java', 'Spring Boot', 'Kafka'], preferredSkills: ['MySQL', 'Redis', 'Microservices'], salaryMin: 75_000_000, salaryMax: 100_000_000, remotePolicy: 'Onsite' },
];

// Skill overlap mapping: which seekers are good matches for which jobs
// (jobIdx → seekerIdx[])
const MATCH_MAP: Record<number, number[]> = {
  0:  [0, 8, 10, 15],        // Senior Frontend → seeker-01,09,11,16
  1:  [1, 7, 10, 19],        // Backend Node.js → seeker-02,08,11,20
  2:  [6, 0, 11],            // Mobile App → seeker-07,01,12
  3:  [3, 7, 14],            // DevOps → seeker-04,08,15
  4:  [0, 1, 10, 17],        // Full-stack → seeker-01,02,11,18
  5:  [3, 7, 14],            // SRE → seeker-04,08,15
  6:  [2, 9, 16],            // ML Engineer → seeker-03,10,17
  7:  [9, 16, 2],            // Data Engineer → seeker-10,17,03
  8:  [2, 9],                // AI Research → seeker-03,10
  9:  [4, 1, 19],            // Blockchain → seeker-05,02,20
  10: [18, 3, 14],           // Security → seeker-19,04,15
  11: [5, 1, 13],            // Backend Lead Java → seeker-06,02,14
};

const PROVIDERS: DataSourceProvider[] = [
  DataSourceProvider.GITHUB,
  DataSourceProvider.SLACK,
  DataSourceProvider.DISCORD,
  DataSourceProvider.GOV24,
];

// ─── demo seed function ────────────────────────────────────────────────

async function seedDemo(app: INestApplicationContext) {
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const jobRepo = app.get<Repository<JobPosting>>(getRepositoryToken(JobPosting));
  const resumeRepo = app.get<Repository<ResumeProfile>>(getRepositoryToken(ResumeProfile));
  const dscRepo = app.get<Repository<DataSourceConnection>>(getRepositoryToken(DataSourceConnection));
  const matchRepo = app.get<Repository<MatchResult>>(getRepositoryToken(MatchResult));
  const sessionRepo = app.get<Repository<NegotiationSession>>(getRepositoryToken(NegotiationSession));
  const authService = app.get(AuthService);

  console.log('\n=== Demo Seed: Bulk Data ===\n');

  // --- 1. Create 20 Seekers ---
  console.log('[1/7] Creating 20 seekers...');
  const seekerEntities: User[] = [];
  for (const s of SEEKERS) {
    const nearId = `${s.id}.testnet`;
    let user = await userRepo.findOne({ where: { nearAccountId: nearId } });
    if (!user) {
      const { pubStr } = makeKeypair();
      user = await userRepo.save(userRepo.create({
        nearAccountId: nearId,
        role: UserRole.SEEKER,
        publicKey: pubStr,
        jobSeeking: true,
      }));
    }
    seekerEntities.push(user);
  }
  console.log(`  → ${seekerEntities.length} seekers ready`);

  // --- 2. Create 4 Employers ---
  console.log('[2/7] Creating 4 employers...');
  const employerEntities: User[] = [];
  for (const e of EMPLOYERS) {
    const nearId = `${e.id}.testnet`;
    let user = await userRepo.findOne({ where: { nearAccountId: nearId } });
    if (!user) {
      const { pubStr } = makeKeypair();
      user = await userRepo.save(userRepo.create({
        nearAccountId: nearId,
        role: UserRole.EMPLOYER,
        publicKey: pubStr,
      }));
    }
    employerEntities.push(user);
  }
  console.log(`  → ${employerEntities.length} employers ready`);

  // --- 3. DataSourceConnections (20 seekers × 4 providers) ---
  console.log('[3/7] Creating data source connections...');
  let dscCount = 0;
  for (const seeker of seekerEntities) {
    for (const provider of PROVIDERS) {
      const exists = await dscRepo.findOne({
        where: { userId: seeker.id, provider },
      });
      if (!exists) {
        await dscRepo.save(dscRepo.create({
          userId: seeker.id,
          provider,
          status: DataSourceStatus.MOCK,
        }));
        dscCount++;
      }
    }
  }
  console.log(`  → ${dscCount} new connections created`);

  // --- 4. ResumeProfiles ---
  console.log('[4/7] Creating resume profiles...');
  let resumeCount = 0;
  for (let i = 0; i < SEEKERS.length; i++) {
    const s = SEEKERS[i];
    const seeker = seekerEntities[i];
    const exists = await resumeRepo.findOne({ where: { userId: seeker.id } });
    if (!exists) {
      await resumeRepo.save(resumeRepo.create({
        userId: seeker.id,
        rawText: `${s.summary} Skills: ${s.skills.join(', ')}. ${s.years} years of experience.`,
        skills: s.skills,
        experience: [
          { company: s.company, title: s.title, years: s.years, description: `Worked as ${s.title} at ${s.company}` },
        ],
        education: [
          { institution: 'Korea University', degree: 'B.S. Computer Science', year: 2024 - s.years },
        ],
        marketValueMin: s.salaryMin,
        marketValueMax: s.salaryMax,
        marketValueReasoning: `${s.years} years experience, ${s.skills.slice(0, 2).join(' & ')} expertise`,
        status: ResumeStatus.COMPLETE,
        summary: s.summary,
        embedding: fakeEmbedding(),
        negotiationPoints: {
          strengths: s.skills.slice(0, 2).map(sk => `${sk} proficiency`),
          weaknesses: ['Could improve leadership skills'],
          preferences: { remotePolicy: 'Flexible', workLifeBalance: 'Important' },
        },
      }));
      resumeCount++;
    }
  }
  console.log(`  → ${resumeCount} new resume profiles created`);

  // --- 5. JobPostings ---
  console.log('[5/7] Creating 12 job postings...');
  const jobEntities: JobPosting[] = [];
  for (const j of JOBS) {
    const employer = employerEntities[j.employerIdx];
    // Check by title + employer to avoid duplicates
    let job = await jobRepo.findOne({
      where: { employerId: employer.id, title: j.title },
    });
    if (!job) {
      job = await jobRepo.save(jobRepo.create({
        employerId: employer.id,
        title: j.title,
        description: j.description,
        requiredSkills: j.requiredSkills,
        preferredSkills: j.preferredSkills,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryNegotiable: true,
        remotePolicy: j.remotePolicy,
        workingHours: 'Flexible (core hours 10-16)',
        benefits: 'Stock options, health insurance, education budget',
        negotiationBoundary: {
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          salaryHardMax: j.salaryMax + 10_000_000,
          remotePolicyOptions: [j.remotePolicy],
          nonNegotiableItems: ['probation period'],
          flexibleItems: ['remote policy', 'signing bonus'],
          negotiationStyle: 'moderate',
        },
        embedding: fakeEmbedding(),
        status: JobPostingStatus.ACTIVE,
      }));
    }
    jobEntities.push(job);
  }
  console.log(`  → ${jobEntities.length} job postings ready`);

  // --- 6. MatchResults ---
  console.log('[6/7] Creating match results...');
  let matchCount = 0;
  for (let jobIdx = 0; jobIdx < jobEntities.length; jobIdx++) {
    const job = jobEntities[jobIdx];
    const seekerIndices = MATCH_MAP[jobIdx] ?? [];
    for (let rank = 0; rank < seekerIndices.length; rank++) {
      const seeker = seekerEntities[seekerIndices[rank]];
      const exists = await matchRepo.findOne({
        where: { seekerId: seeker.id, jobId: job.id },
      });
      if (!exists) {
        await matchRepo.save(matchRepo.create({
          seekerId: seeker.id,
          jobId: job.id,
          annScore: 0.95 - rank * 0.05 + Math.random() * 0.03,
          rerankScore: 0.9 - rank * 0.06 + Math.random() * 0.04,
          finalRank: rank + 1,
          seekerAgreed: Math.random() > 0.3,
          employerAgreed: Math.random() > 0.3,
        }));
        matchCount++;
      }
    }
  }
  console.log(`  → ${matchCount} new match results created`);

  // --- 7. NegotiationSessions (5 sessions, various states) ---
  console.log('[7/7] Creating negotiation sessions...');
  const sessionDefs: Array<{
    jobIdx: number; seekerIdx: number; state: NegotiationState;
    currentRound: number; maxRounds: number;
  }> = [
    { jobIdx: 0, seekerIdx: 0, state: NegotiationState.AGREED, currentRound: 4, maxRounds: 5 },
    { jobIdx: 1, seekerIdx: 1, state: NegotiationState.AGREED, currentRound: 3, maxRounds: 5 },
    { jobIdx: 3, seekerIdx: 3, state: NegotiationState.FAILED, currentRound: 2, maxRounds: 5 },
    { jobIdx: 6, seekerIdx: 2, state: NegotiationState.MAX_ROUNDS, currentRound: 5, maxRounds: 5 },
    { jobIdx: 9, seekerIdx: 4, state: NegotiationState.EMPLOYER_OFFER, currentRound: 1, maxRounds: 5 },
  ];

  let sessionCount = 0;
  for (const sd of sessionDefs) {
    const job = jobEntities[sd.jobIdx];
    const seeker = seekerEntities[sd.seekerIdx];
    const employer = employerEntities[JOBS[sd.jobIdx].employerIdx];

    const exists = await sessionRepo.findOne({
      where: { jobId: job.id, seekerId: seeker.id },
    });
    if (!exists) {
      await sessionRepo.save(sessionRepo.create({
        jobId: job.id,
        seekerId: seeker.id,
        employerId: employer.id,
        state: sd.state,
        currentRound: sd.currentRound,
        maxRounds: sd.maxRounds,
        seekerApproved: sd.state === NegotiationState.AGREED,
        employerApproved: sd.state === NegotiationState.AGREED,
      }));
      sessionCount++;
    }
  }
  console.log(`  → ${sessionCount} new negotiation sessions created`);

  // --- Print sample JWT for demo employer ---
  const sampleEmployer = employerEntities[0];
  const sampleSeeker = seekerEntities[0];
  const empJwt = authService.generateJwt(sampleEmployer);
  const seekJwt = authService.generateJwt(sampleSeeker);

  console.log('\n=== Demo JWT Tokens ===');
  console.log(`\nEmployer — ${sampleEmployer.nearAccountId}:`);
  console.log(empJwt);
  console.log(`\nSeeker — ${sampleSeeker.nearAccountId}:`);
  console.log(seekJwt);
  console.log('\n=== Demo Seed Complete ===\n');
}

// ─── real seed (original logic) ────────────────────────────────────────

async function seedReal(app: INestApplicationContext) {
  const authService = app.get(AuthService);
  const negotiationService = app.get(NegotiationService);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const jobRepo = app.get<Repository<JobPosting>>(getRepositoryToken(JobPosting));
  const resumeRepo = app.get<Repository<ResumeProfile>>(getRepositoryToken(ResumeProfile));

  console.log('\n=== Real Seed: NEAR AI Negotiation ===\n');

  // --- 1. Create Seeker ---
  const seekerKeyPair = nacl.sign.keyPair();
  const seekerPubKeyStr = `ed25519:${bs58.encode(seekerKeyPair.publicKey)}`;
  let seeker = await userRepo.findOne({ where: { nearAccountId: 'seeker-demo.testnet' } });
  if (!seeker) {
    seeker = userRepo.create({
      nearAccountId: 'seeker-demo.testnet',
      role: UserRole.SEEKER,
      publicKey: seekerPubKeyStr,
    });
    seeker = await userRepo.save(seeker);
    console.log('[+] Created seeker:', seeker.id);
  } else {
    seeker.publicKey = seekerPubKeyStr;
    seeker = await userRepo.save(seeker);
    console.log('[=] Seeker already exists:', seeker.id, '(updated publicKey)');
  }

  // --- 2. Create Employer ---
  const employerKeyPair = nacl.sign.keyPair();
  const employerPubKeyStr = `ed25519:${bs58.encode(employerKeyPair.publicKey)}`;
  let employer = await userRepo.findOne({ where: { nearAccountId: 'employer-demo.testnet' } });
  if (!employer) {
    employer = userRepo.create({
      nearAccountId: 'employer-demo.testnet',
      role: UserRole.EMPLOYER,
      publicKey: employerPubKeyStr,
    });
    employer = await userRepo.save(employer);
    console.log('[+] Created employer:', employer.id);
  } else {
    employer.publicKey = employerPubKeyStr;
    employer = await userRepo.save(employer);
    console.log('[=] Employer already exists:', employer.id, '(updated publicKey)');
  }

  // --- 3. Create ResumeProfile for seeker ---
  let resume = await resumeRepo.findOne({ where: { userId: seeker.id } });
  if (!resume) {
    resume = resumeRepo.create({
      userId: seeker.id,
      rawText: 'Senior full-stack developer with 5+ years experience in TypeScript, React, Node.js, and blockchain.',
      skills: ['TypeScript', 'React', 'Node.js', 'NestJS', 'Rust', 'NEAR Protocol', 'PostgreSQL', 'Docker'],
      experience: [
        { company: 'Web3 Labs', title: 'Senior Developer', years: 3, description: 'Led DeFi protocol development on NEAR' },
        { company: 'TechCorp', title: 'Full-stack Developer', years: 2, description: 'Built enterprise dashboards with React and Node.js' },
      ],
      education: [
        { institution: 'Seoul National University', degree: 'B.S. Computer Science', year: 2021 },
      ],
      marketValueMin: 60000000,
      marketValueMax: 80000000,
      marketValueReasoning: '5+ years experience, blockchain expertise, strong open-source contributions',
      status: ResumeStatus.COMPLETE,
      summary: 'Experienced full-stack developer specializing in Web3 and TypeScript ecosystem.',
      negotiationPoints: {
        strengths: ['Blockchain/NEAR expertise', 'Full-stack versatility', 'Open-source track record'],
        weaknesses: ['No management experience yet'],
        preferences: { remotePolicy: 'Hybrid preferred', workLifeBalance: 'Important' },
      },
    });
    resume = await resumeRepo.save(resume);
    console.log('[+] Created resume profile:', resume.id);
  } else {
    console.log('[=] Resume already exists:', resume.id);
  }

  // --- 4. Create JobPosting for employer ---
  let job = await jobRepo.findOne({ where: { employerId: employer.id } });
  if (!job) {
    job = jobRepo.create({
      employerId: employer.id,
      title: 'Senior Backend Engineer',
      description: 'Build and maintain scalable backend services using NestJS and TypeScript. Experience with blockchain integration is a plus.',
      requiredSkills: ['TypeScript', 'Node.js', 'NestJS', 'PostgreSQL'],
      preferredSkills: ['Rust', 'NEAR Protocol', 'Docker', 'Kubernetes'],
      salaryMin: 55000000,
      salaryMax: 75000000,
      salaryNegotiable: true,
      remotePolicy: 'Hybrid',
      workingHours: 'Flexible (core hours 10-16)',
      benefits: 'Stock options, health insurance, education budget, annual retreat',
      negotiationBoundary: {
        salaryMin: 55000000,
        salaryMax: 75000000,
        salaryHardMax: 80000000,
        remotePolicyOptions: ['Hybrid', 'Full Remote'],
        nonNegotiableItems: ['probation period'],
        flexibleItems: ['remote policy', 'signing bonus', 'stock options'],
        negotiationStyle: 'moderate',
      },
      status: JobPostingStatus.ACTIVE,
    });
    job = await jobRepo.save(job);
    console.log('[+] Created job posting:', job.id, `"${job.title}"`);
  } else {
    console.log('[=] Job already exists:', job.id, `"${job.title}"`);
  }

  // --- 5. Create NegotiationSession and start ---
  console.log('\n--- Starting NEAR AI Negotiation ---');
  console.log('This calls the real NEAR AI API and may take 30-120 seconds...\n');

  const session = await negotiationService.createSession(job.id, seeker.id);
  console.log('[+] Created session:', session.id);

  await negotiationService.startNegotiation(session.id);
  console.log('[*] Negotiation started (running in background)...\n');

  // --- 6. Poll until negotiation completes ---
  const MAX_WAIT_MS = 180_000; // 3 minutes
  const POLL_INTERVAL_MS = 5_000;
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const current = await negotiationService.getSession(session.id);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`  [${elapsed}s] State: ${current.state}, Round: ${current.currentRound}/${current.maxRounds}`);

    if ([NegotiationState.AGREED, NegotiationState.FAILED, NegotiationState.MAX_ROUNDS].includes(current.state)) {
      console.log(`\n[*] Negotiation finished: ${current.state}`);
      break;
    }
  }

  // --- 7. Print decrypted rounds summary ---
  try {
    const rounds = await negotiationService.getDecryptedRounds(session.id);
    console.log(`\n--- Negotiation Rounds (${rounds.length}) ---`);
    for (const r of rounds) {
      console.log(`  Round ${r.round} [${r.actor}] → ${r.decision}`);
      if (r.proposal) {
        console.log(`    Salary: ${r.proposal.salary?.toLocaleString()}, Remote: ${r.proposal.remotePolicy}`);
      }
      if (r.reasoning) {
        console.log(`    Reasoning: ${r.reasoning.substring(0, 120)}...`);
      }
    }
  } catch (err) {
    console.log('[!] Could not decrypt rounds:', (err as Error).message);
  }

  // --- 8. Generate JWTs ---
  const seekerJwt = authService.generateJwt(seeker);
  const employerJwt = authService.generateJwt(employer);

  console.log('\n=== JWT Tokens (paste into localStorage) ===');
  console.log(`\nSeeker (${seeker.nearAccountId}):`);
  console.log(seekerJwt);
  console.log(`\nEmployer (${employer.nearAccountId}):`);
  console.log(employerJwt);

  console.log('\n=== Quick Login ===');
  console.log('Open browser console and run:');
  console.log(`  localStorage.setItem('jwt', '${seekerJwt}');`);
  console.log(`  localStorage.setItem('user', '${JSON.stringify({ id: seeker.id, nearAccountId: seeker.nearAccountId, role: 'SEEKER', publicKey: seeker.publicKey })}');`);
  console.log('  location.reload();');

  console.log('\n=== Done ===\n');
}

// ─── main ──────────────────────────────────────────────────────────────

async function seed() {
  const demoOnly = process.argv.includes('--demo-only');

  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('\n=== TalentTEE Seed Script ===\n');

  // Always run demo seed (fast, no external calls)
  await seedDemo(app);

  // Run real NEAR AI negotiation unless --demo-only
  if (!demoOnly) {
    await seedReal(app);
  } else {
    console.log('[skip] Real NEAR AI negotiation (--demo-only mode)\n');
  }

  await app.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
