# Phase F-2: PDF Resume Upload

> Priority: High | Effort: Medium | Duration: 3-4 days

## Judge Feedback

> "A lot of companies don't allow people to upload stuff to GitHub... Does that feature?"
> "What if I worked for private companies and I don't have it?"

## Goal

GitHub이 없는 사용자도 PDF 이력서 업로드로 AI resume 생성 + 매칭 참여 가능하도록.

---

## Tasks

### 1. PDF Upload UI (Frontend)

- DataSource 페이지에 "PDF 이력서 업로드" 카드 추가
- 드래그 앤 드롭 + 파일 선택 UI
- 업로드 상태: idle → uploading → parsing → complete
- 파싱 결과 미리보기 (추출된 skills, experience, education)

### 2. PDF Parsing (Backend)

- `POST /datasource/pdf-upload` 엔드포인트
- PDF → 텍스트 추출 (pdf-parse 또는 pdfjs-dist)
- AI 구조화: 텍스트 → JSON (skills, experience, education, certifications)
- 기존 ResumeProfile 스키마에 매핑

### 3. Vector Embedding 생성

- 파싱된 resume 데이터를 벡터로 변환
- 기존 GitHub 기반 벡터와 동일한 dimension/format
- pgvector에 저장 → 매칭 파이프라인에 자동 포함

### 4. DataSource 통합

- `datasource` 테이블에 type: 'pdf' 추가
- 여러 소스 병합: GitHub + PDF + Slack → 통합 프로필
- 우선순위: PDF 수동 업로드 > GitHub 자동 추출 (사용자 의도 반영)

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `frontend/src/app/datasource/page.tsx` | PDF 업로드 카드 추가 |
| `frontend/src/components/datasource/PdfUploadCard.tsx` | **NEW** — 업로드 UI |
| `backend/src/datasource/datasource.controller.ts` | PDF 업로드 endpoint |
| `backend/src/datasource/pdf-parser.service.ts` | **NEW** — PDF 파싱 |
| `backend/src/resume/resume.service.ts` | PDF 데이터 통합 |

---

## Dependencies

- `pdf-parse` or `pdfjs-dist` (backend)
- Multer file upload middleware (이미 NestJS에 있을 수 있음)

---

## Success Criteria

- [ ] PDF 업로드 → AI가 skills/experience 자동 추출
- [ ] 추출 결과를 사용자가 확인/수정 가능
- [ ] 벡터 임베딩 생성 → 매칭에 반영
- [ ] GitHub 미연동 사용자도 프로필 완성률 100% 달성 가능
