/**
 * Seed script — bootstraps NestJS, creates test users/job/resume,
 * triggers a real NEAR AI negotiation, and prints JWT tokens.
 *
 * Usage: cd backend && npm run seed
 */
import { NestFactory } from '@nestjs/core';
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
import { UserRole, JobPostingStatus, ResumeStatus, NegotiationState } from './common/enums/index.js';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const authService = app.get(AuthService);
  const negotiationService = app.get(NegotiationService);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const jobRepo = app.get<Repository<JobPosting>>(getRepositoryToken(JobPosting));
  const resumeRepo = app.get<Repository<ResumeProfile>>(getRepositoryToken(ResumeProfile));

  console.log('\n=== TalentTEE Seed Script ===\n');

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
    // Update public key so encryption works with this session's keypair
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
  await app.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
