# TalentTEE Pitch Feedback & Next Steps

> Date: 2026-04-18
> Source: 3 pitch/demo sessions (voice transcripts)

---

## Session 1: English Pitch to Judge (9_original.txt)

### Positive Feedback

- **"Novel use case, creative idea"** — The judge explicitly said this is new and creative.
- **Escrow = Proof of Hiring Intent** — Many companies post fake job listings just to appear like they're growing. If companies have to deposit funds into escrow, it verifies they're actually hiring. Judge said: *"If you can verify that the company is hiring because they have to deposit funds, that's a great idea."*
- **"This is really good. Thank you guys."** — Overall positive reception.
- **"Very straightforward"** — The concept is easy to understand. Saving company time and individual time.

### Critical Feedback

#### 1. TEE Attestation Proof (Highest Priority)

> "How do you prove that it's running inside of TEE? Do you have any sort of attestation?"
> "I work with governments, large organizations. They need the proof that I can't see all of their user data. Otherwise they're just like, I'm not going to work with you."
> "I would add the attestation... as a user, I would just want to see that."

**What they want:** A clickable UI element that shows cryptographic proof that data was processed inside a TEE. Example: click a badge, see the attestation hash, verify on-chain.

**Current status:** Software-based encryption only (ECDH + XChaCha20-Poly1305). No hardware TEE attestation. Planned in Phase 13.

**Impact:** Without this, enterprise/government customers won't adopt. Judge explicitly said this is a blocker for large orgs.

#### 2. Human in the Loop

> "Is there a human in the loop? A company spends like 20K, that's not really happening by AI agent, because that's kind of risky."

**Our answer:** The negotiation part is automated by AI, but the final hiring decision is made by humans. AI saves screening time. When salary expectations don't match, the time spent on interviews is wasted — AI pre-negotiates to prevent this.

**Action:** Make it clearer in the pitch that AI negotiation result is a **proposal**, not a binding contract.

#### 3. Candidate Control Over Negotiation

> "I don't want an AI to always negotiate for me. I want to be able to say, no, that's too little, I deserve more."

**Our answer:** Candidates can set their own boundary and priorities. The seeker can also configure how many companies to auto-negotiate with (e.g., top 5 matches only).

**Action:** Emphasize candidate boundary settings in the pitch. Show the UI where seekers set min/max salary and preferences.

#### 4. GitHub Not Available for Everyone

> "A lot of companies don't allow people to upload stuff to GitHub. Does that feature...?"

**What they want:** Alternative data sources for people without public GitHub profiles. PDF resume upload should work too.

**Current status:** GitHub OAuth is implemented. Slack/Discord/Gov24 are datasource options. PDF upload is not yet implemented.

**Action:** Add PDF resume upload as an alternative datasource. This expands the addressable market significantly.

#### 5. Salary Data Source

> "Where are you pulling the data from?"

**Our answer:** Initially, AI estimates based on candidate profile + market knowledge. As negotiation data accumulates on the platform, AI improves accuracy using real outcome data. This is the data flywheel.

**Action:** Be transparent in the pitch about the cold-start problem and how data improves over time.

---

## Session 2 & 3: Korean Pitch Sessions (Encoding Issues)

Files had encoding issues (UTF-16 Korean characters garbled), but key themes extracted from English portions and context:

### Questions Raised

1. **Company data privacy** — Will companies accept AI accessing Slack/Discord data?
   - Answer: It's the **seeker's own data**, not the company's. Seekers connect their personal accounts from public communities, not internal company Slack.

2. **Agent commerce dispute resolution** — If AI negotiates on behalf of users and something goes wrong, who decides?
   - Answer: AI works within pre-set boundaries. Results are proposals, not contracts. All rounds are encrypted and auditable.

3. **Information asymmetry in salary negotiation** — The classic "$70K vs $100K" game where whoever speaks first loses.
   - Answer: Both sides set boundaries privately. AI finds the optimal meeting point without revealing either side's limits.

4. **TEE implementation status** — Is it real hardware TEE or just software encryption?
   - Answer: Currently software-based. Hardware TEE attestation is on the roadmap (Phase 13).

---

## Consolidated Action Items

### Must-Have (Before Next Pitch)

| # | Item | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1 | TEE Attestation UI badge | Critical | Medium | Phase 13 roadmap |
| 2 | Emphasize "proposal, not contract" in pitch | Critical | Low | Pitch script update |
| 3 | Show candidate boundary settings in demo | High | Low | Already implemented |
| 4 | Highlight escrow = hiring verification in pitch | High | Low | Pitch script update |

### Should-Have (Near-term Roadmap)

| # | Item | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 5 | PDF resume upload (alternative to GitHub) | High | Medium | Not started |
| 6 | Salary data flywheel explanation in pitch | Medium | Low | Pitch script update |
| 7 | Per-company auto-negotiate limit for seekers | Medium | Medium | Not started |

### Nice-to-Have (Future)

| # | Item | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 8 | On-chain attestation verification page | Low | High | Phase 13 |
| 9 | DAO-based dispute resolution | Low | High | Not planned |
| 10 | Negotiation data marketplace (anonymized) | Low | High | Not planned |

---

## Key Pitch Improvements

### Strengthen These Points

1. **Escrow deposit = proof company is really hiring** — This resonated strongly with the judge. Lead with this.
2. **"Not a contract, it's a proposal"** — Reduces risk perception. Emphasize human final decision.
3. **Candidate control** — Show the boundary settings UI in the demo. "You set the rules, AI follows them."

### Add These to the Pitch

1. **TEE Attestation roadmap** — Even if not implemented yet, show the plan. "We're building verifiable proof that no one — not even us — can see your data."
2. **PDF upload option** — Mention it's coming. Addresses the "no GitHub" concern.
3. **Data flywheel** — "Every negotiation makes the next one more accurate. The platform gets smarter over time."

### Remove/Reduce These

1. Don't over-explain the technical crypto stack (ECDH, XChaCha20) — Judge cared about **what it means**, not how it works.
2. Don't spend too much time on architecture slide — Move faster to the demo.

---

## Judge's Decision Process

> "I'm not going to be the one judging at the end. I'm sort of just sending all my stuff to my colleague in New York, then he's going to decide."

The judge is a **pre-screener**, not the final decision maker. The pitch materials need to be self-explanatory enough for someone who wasn't in the room to understand the value proposition.

**Action:** Ensure the pitch deck tells the full story without needing live explanation.
