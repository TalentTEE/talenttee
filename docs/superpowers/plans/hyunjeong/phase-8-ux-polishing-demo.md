# Phase 8: UX 폴리싱 + 데모 리허설 (Day 5-6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 전체 프론트엔드의 사용자 경험 품질 향상 — 에러 핸들링 (toast/alert), 로딩 상태 (Skeleton/Spinner), 반응형 레이아웃, 엣지 케이스 처리 (빈 데이터/권한 없음), 데모 시나리오 리허설 (전체 E2E 플로우)
**선행:** Phase 7 (ECDH 복호화 + 에스크로 지갑 연동 완료)
**완료 기준:** 전체 E2E 데모 시나리오를 1회 이상 리허설 완료, 에러/로딩/빈 상태 모든 엣지 케이스 처리, 반응형 레이아웃 모바일/태블릿 확인
**예상 소요:** ~3시간
**상태:** ⬜ 미구현

---

## Task 8.1: 글로벌 에러 핸들링 — Toast 알림 시스템

**Files:**
- Create: `frontend/src/components/ui/toast-provider.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Toast Context + Provider 구현**

전역 toast 알림 시스템을 구현한다. shadcn/ui의 toast 컴포넌트를 기반으로 한다.

```typescript
// frontend/src/components/ui/toast-provider.tsx
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    // 5초 후 자동 제거
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast 렌더링 영역 — 우하단 고정 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-xl px-4 py-3 shadow-lg border animate-slide-in-right ${
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              toast.type === 'success' ? 'bg-primary/10 border-primary/20 text-primary' :
              toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              'bg-card border-border/10 text-foreground'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-sm mt-0.5">
                {toast.type === 'error' ? 'error' :
                 toast.type === 'success' ? 'check_circle' :
                 toast.type === 'warning' ? 'warning' : 'info'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message && <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

- [ ] **Step 2: layout.tsx에 ToastProvider 추가**

```typescript
// frontend/src/app/layout.tsx — ToastProvider 감싸기

import { ToastProvider } from '@/components/ui/toast-provider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: apiFetch 에러 시 자동 toast 호출**

전역 에러 핸들링: API 호출 실패 시 toast를 자동으로 표시한다.
각 페이지에서 개별 try/catch를 추가할 필요 없이, apiFetch 레벨에서 처리한다.

```typescript
// frontend/src/lib/api.ts — apiFetch에 에러 이벤트 추가

// 전역 에러 이벤트 (토스트 시스템과 연결)
type ApiErrorHandler = (error: { status: number; message: string; path: string }) => void;
let globalErrorHandler: ApiErrorHandler | null = null;

export function setApiErrorHandler(handler: ApiErrorHandler) {
  globalErrorHandler = handler;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });
  if (!res.ok) {
    const message = `API Error: ${res.status}`;
    if (globalErrorHandler) {
      globalErrorHandler({ status: res.status, message, path });
    }
    throw new Error(message);
  }
  return res.json();
}
```

- [ ] **Step 4: ToastProvider에서 API 에러 핸들러 등록**

```typescript
// frontend/src/components/ui/toast-provider.tsx — useEffect에서 핸들러 등록

import { setApiErrorHandler } from '@/lib/api';

// ToastProvider 내부:
useEffect(() => {
  setApiErrorHandler(({ status, message, path }) => {
    if (status === 401) {
      addToast({ type: 'warning', title: 'Session Expired', message: 'Please log in again.' });
    } else if (status === 403) {
      addToast({ type: 'error', title: 'Access Denied', message: 'You do not have permission.' });
    } else if (status >= 500) {
      addToast({ type: 'error', title: 'Server Error', message: `Request to ${path} failed.` });
    } else {
      addToast({ type: 'error', title: 'Request Failed', message });
    }
  });
}, [addToast]);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/toast-provider.tsx frontend/src/app/layout.tsx frontend/src/lib/api.ts
git commit -m "feat: add global toast notification system with API error auto-handling"
```

---

## Task 8.2: 로딩 상태 — Skeleton UI + Spinner

**Files:**
- Create: `frontend/src/components/ui/skeleton-card.tsx`
- Create: `frontend/src/components/ui/spinner.tsx`
- Modify: `frontend/src/app/dashboard/seeker/page.tsx`
- Modify: `frontend/src/app/dashboard/employer/page.tsx`
- Modify: `frontend/src/app/resume/page.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/page.tsx`

- [ ] **Step 1: Skeleton 카드 컴포넌트**

```typescript
// frontend/src/components/ui/skeleton-card.tsx
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-6 animate-pulse">
      <div className="h-4 bg-muted rounded-lg w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-muted rounded-lg mb-2"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Spinner 컴포넌트**

```typescript
// frontend/src/components/ui/spinner.tsx
export function Spinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <span className={`material-symbols-outlined ${sizeMap[size]} animate-spin text-primary`}>
        progress_activity
      </span>
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function FullPageSpinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <span className="material-symbols-outlined text-4xl animate-spin text-primary">
        progress_activity
      </span>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
```

- [ ] **Step 3: 각 페이지에 로딩 상태 적용**

```typescript
// 예시: frontend/src/app/dashboard/seeker/page.tsx

import { SkeletonGrid } from '@/components/ui/skeleton-card';

export default function SeekerDashboard() {
  const [loading, setLoading] = useState(true);
  // ...

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDatasourceStatus(),
      getResume(user.id),
      getSeekerMatches(user.id),
      getNegotiationSessions(),
    ]).then(([ds, resume, matches, sessions]) => {
      setDatasources(ds);
      setResume(resume);
      setMatches(matches);
      setSessions(sessions);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (loading) return <SkeletonGrid count={6} />;
  // ... 기존 렌더링
}
```

동일 패턴을 다음 페이지에 적용:
- `employer/page.tsx` — SkeletonGrid count={4}
- `resume/page.tsx` — SkeletonCard (이력서 생성 중일 때)
- `negotiation/[sessionId]/page.tsx` — Spinner (라운드 로딩 중)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/skeleton-card.tsx frontend/src/components/ui/spinner.tsx \
  frontend/src/app/dashboard/ frontend/src/app/resume/ frontend/src/app/negotiation/
git commit -m "feat: add Skeleton UI and Spinner loading states across all pages"
```

---

## Task 8.3: 반응형 레이아웃 확인 + 수정

**Files:**
- Modify: `frontend/src/components/layout/sidebar.tsx`
- Modify: `frontend/src/components/layout/header.tsx`
- Modify: `frontend/src/app/dashboard/layout.tsx`
- Modify: 기타 페이지 (필요 시)

- [ ] **Step 1: 모바일 사이드바 — 햄버거 메뉴 토글**

데스크톱에서는 좌측 고정 사이드바, 모바일에서는 햄버거 메뉴로 전환한다.

```typescript
// frontend/src/components/layout/sidebar.tsx — 모바일 대응 추가

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* 모바일: 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      {/* 사이드바 본체 */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border/10
        transform transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* 기존 사이드바 내용 */}
      </aside>
    </>
  );
}
```

- [ ] **Step 2: Header에 햄버거 버튼 추가**

```typescript
// frontend/src/components/layout/header.tsx — 햄버거 버튼

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/10">
      <div className="flex items-center gap-3 px-6 py-4">
        {/* 모바일 햄버거 */}
        <button onClick={onMenuToggle} className="lg:hidden">
          <span className="material-symbols-outlined">menu</span>
        </button>
        {/* 기존 헤더 내용 */}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: DashboardLayout에서 상태 관리**

```typescript
// frontend/src/app/dashboard/layout.tsx

'use client';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col lg:ml-0">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 각 페이지 그리드 반응형 확인**

확인 체크리스트:
- `grid-cols-1 md:grid-cols-2` — 모바일 1열, 태블릿+ 2열
- 협상 챗 버블 `max-w-[85%]` — 모바일에서도 읽기 편한 너비
- 에스크로 페이지 — 모바일에서 입력/버튼 세로 배치
- 이력서 페이지 — 기술 태그 wrap 정상
- 합의 페이지 — 6개 필드 모바일 1열

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/ frontend/src/app/dashboard/layout.tsx
git commit -m "feat: add responsive mobile layout with hamburger sidebar toggle"
```

---

## Task 8.4: 엣지 케이스 처리

**Files:**
- Modify: `frontend/src/app/resume/page.tsx`
- Modify: `frontend/src/app/matching/page.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/page.tsx`
- Modify: `frontend/src/app/negotiation/[sessionId]/agree/page.tsx`
- Modify: `frontend/src/app/escrow/page.tsx`
- Modify: `frontend/src/app/datasource/page.tsx`

- [ ] **Step 1: 빈 데이터 처리 — 각 페이지별 빈 상태 UI**

모든 목록/데이터 페이지에 빈 상태 UI를 추가한다.

```typescript
// 공통 빈 상태 패턴
function EmptyState({ icon, title, description }: {
  icon: string; title: string; description: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/10 p-12 text-center">
      <span className="material-symbols-outlined text-4xl text-muted-foreground">{icon}</span>
      <p className="text-sm font-semibold mt-3">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
```

적용 페이지:
- `/resume` — 이력서 미생성 시: "No resume generated yet. Connect your data sources first."
- `/matching` — 매칭 없음: "No matches found yet."
- `/negotiations` — 협상 없음: "No negotiations yet."
- `/escrow` — 결제 내역 없음: "No payment history."
- `/datasource` — 모든 소스 미연결: "Connect at least one data source to get started."

- [ ] **Step 2: 권한 없음 처리 — 역할 기반 접근 제어**

구직자가 채용담당자 전용 페이지에 접근하거나 그 반대의 경우를 처리한다.

```typescript
// 예시: frontend/src/app/escrow/page.tsx — 구직자 접근 차단

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function EscrowPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'EMPLOYER') {
      router.replace(`/dashboard/${user.role.toLowerCase()}`);
    }
  }, [user, router]);

  if (!user || user.role !== 'EMPLOYER') return null;
  // ... 기존 렌더링
}
```

동일 패턴 적용:
- `/escrow` — EMPLOYER만 접근
- `/jobs/create` — EMPLOYER만 접근
- `/resume` — SEEKER만 접근
- `/datasource` — SEEKER만 접근

- [ ] **Step 3: 네트워크 오프라인 감지**

```typescript
// frontend/src/components/ui/offline-banner.tsx

'use client';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 text-white text-center py-2 text-sm font-medium">
      <span className="material-symbols-outlined text-sm mr-1 align-middle">wifi_off</span>
      You are offline. Some features may not work.
    </div>
  );
}
```

- [ ] **Step 4: 401 Unauthorized 시 자동 로그아웃**

```typescript
// frontend/src/components/ui/toast-provider.tsx — 401 처리 강화

import { useAuth } from '@/lib/auth';

// ToastProvider 내부:
const { logout } = useAuth();

useEffect(() => {
  setApiErrorHandler(({ status, message, path }) => {
    if (status === 401) {
      addToast({ type: 'warning', title: 'Session Expired', message: 'Redirecting to login...' });
      setTimeout(() => logout(), 2000); // 2초 후 로그아웃
    }
    // ... 기존 에러 처리
  });
}, [addToast, logout]);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/ frontend/src/components/ui/offline-banner.tsx frontend/src/components/ui/toast-provider.tsx
git commit -m "feat: add edge case handling — empty states, role guards, offline banner, auto-logout"
```

---

## Task 8.5: 데모 시나리오 리허설

**Files:**
- 변경 없음 (수동 검증)

- [ ] **Step 1: 더미 모드 전체 E2E 리허설 (NEXT_PUBLIC_USE_DUMMY=true)**

순서대로 수행하며, 각 단계에서 UI 이상 없는지 확인한다.

| # | 시나리오 | 확인 항목 |
|---|---------|----------|
| 1 | `/` → Alice 카드 클릭 → 로그인 | 로딩 → 대시보드 전환 |
| 2 | `/dashboard/seeker` | 6개 카드 정상 렌더링, Skeleton → 데이터 전환 |
| 3 | 구직 활동 토글 ON | 안내 메시지 표시 → 토글 상태 변경 |
| 4 | `/datasource` | 4개 프로바이더 → Connect → Connected 전환 |
| 5 | `/resume` | Generate → 프로그레스 → 이력서 완성 |
| 6 | `/matching` | 매칭 카드 표시, ScoreRing, Agree 클릭 |
| 7 | `/negotiations` | 진행 중/완료 섹션 |
| 8 | `/negotiation/session-1` | 라운드 챗 버블 + 타이핑 인디케이터 |
| 9 | `/negotiation/session-2/agree` | 합의 상세 → Approve → TX Hash |
| 10 | 로그아웃 → Bob 로그인 | `/dashboard/employer` 전환 |
| 11 | `/jobs/create` | Chat Mode → 폼 → 공고 생성 |
| 12 | `/escrow` | 잔액 + Deposit + 내역 |
| 13 | `/matching` | 후보자 목록 + View Profile → Modal |

- [ ] **Step 2: 실제 API 모드 E2E 리허설 (NEXT_PUBLIC_USE_DUMMY=false, 백엔드 기동)**

| # | 시나리오 | 확인 항목 |
|---|---------|----------|
| 1 | Alice 로그인 | Challenge → Verify → JWT 저장 |
| 2 | 데이터소스 연결 | GitHub OAuth 리다이렉트 → 콜백 → Connected |
| 3 | 이력서 생성 | 202 Accepted → Polling → COMPLETED |
| 4 | 매칭 조회 | 실제 매칭 결과 표시 |
| 5 | 프로필 열람 | 에스크로 결제 → 리포트 표시 |
| 6 | 협상 모니터링 | SSE 실시간 업데이트 |
| 7 | 합의 승인 | 온체인 TX Hash 확인 |
| 8 | 에스크로 Deposit | 지갑 팝업 → 서명 → 잔액 반영 |
| 9 | 협상 히스토리 복호화 | ECDH → 평문 표시 |

- [ ] **Step 3: 에러 시나리오 리허설**

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 백엔드 미기동 상태에서 로그인 시도 | Toast: "Server Error" |
| 2 | 잔액 부족 상태에서 프로필 열람 | Toast/Alert: "Insufficient balance" |
| 3 | 잘못된 NEAR 계정으로 로그인 | Error 메시지 표시 |
| 4 | 네트워크 끊긴 상태에서 동작 | Offline 배너 표시 |
| 5 | 구직자로 /escrow 접근 | 대시보드로 리다이렉트 |
| 6 | ECDH 복호화 키 불일치 | "Decryption failed" 에러 표시 |

- [ ] **Step 4: 발견된 버그 수정**

리허설 중 발견된 UI/UX 문제를 즉시 수정한다.

- [ ] **Step 5: 최종 빌드 확인**

```bash
cd frontend && npm run build
```

Expected: 에러/경고 없이 빌드 완료

- [ ] **Step 6: Commit (리허설 중 수정 사항)**

```bash
git add .
git commit -m "fix: address issues found during demo rehearsal"
```

---

## Phase 8 완료 기준

- [ ] **에러 핸들링:**
  - API 호출 실패 시 toast 알림 자동 표시 (status별 분류: 401/403/500)
  - 401 Unauthorized 시 자동 로그아웃 + 로그인 페이지 이동
  - 네트워크 오프라인 시 상단 배너 표시
- [ ] **로딩 상태:**
  - 대시보드: Skeleton 카드 → 데이터 로드 후 실제 카드 전환
  - 이력서/매칭/협상: Spinner + 텍스트 표시
  - 모든 비동기 작업에 로딩 인디케이터 존재
- [ ] **반응형 레이아웃:**
  - 모바일 (< 768px): 사이드바 숨김 → 햄버거 메뉴 토글
  - 태블릿 (768px - 1024px): 2열 그리드
  - 데스크톱 (> 1024px): 사이드바 고정 + 넓은 콘텐츠 영역
- [ ] **엣지 케이스:**
  - 빈 데이터: 모든 목록 페이지에 빈 상태 UI (아이콘 + 설명 텍스트)
  - 권한 없음: 역할 불일치 시 대시보드로 리다이렉트
  - 잔액 부족: 프로필 열람 시 에러 메시지
- [ ] **데모 리허설:**
  - 더미 모드 전체 E2E 플로우 1회 이상 완주
  - 실제 API 모드 전체 E2E 플로우 1회 이상 완주
  - 에러 시나리오 6개 모두 기대 결과 확인
- [ ] `npm run build` → 빌드 에러/경고 없음

## 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `frontend/src/components/ui/toast-provider.tsx` | Create (Toast 알림 시스템) |
| `frontend/src/components/ui/skeleton-card.tsx` | Create (Skeleton 로딩 카드) |
| `frontend/src/components/ui/spinner.tsx` | Create (Spinner 컴포넌트) |
| `frontend/src/components/ui/offline-banner.tsx` | Create (오프라인 배너) |
| `frontend/src/app/layout.tsx` | Modify (ToastProvider + OfflineBanner 추가) |
| `frontend/src/lib/api.ts` | Modify (글로벌 에러 핸들러 추가) |
| `frontend/src/components/layout/sidebar.tsx` | Modify (모바일 햄버거 토글) |
| `frontend/src/components/layout/header.tsx` | Modify (햄버거 버튼 추가) |
| `frontend/src/app/dashboard/layout.tsx` | Modify (사이드바 상태 관리) |
| `frontend/src/app/dashboard/seeker/page.tsx` | Modify (Skeleton 로딩) |
| `frontend/src/app/dashboard/employer/page.tsx` | Modify (Skeleton 로딩) |
| `frontend/src/app/resume/page.tsx` | Modify (빈 상태 + 로딩 + 역할 가드) |
| `frontend/src/app/matching/page.tsx` | Modify (빈 상태 + 로딩) |
| `frontend/src/app/negotiation/[sessionId]/page.tsx` | Modify (Spinner 로딩) |
| `frontend/src/app/negotiation/[sessionId]/agree/page.tsx` | Modify (로딩 상태) |
| `frontend/src/app/escrow/page.tsx` | Modify (역할 가드 + 빈 상태) |
| `frontend/src/app/datasource/page.tsx` | Modify (빈 상태 + 역할 가드) |
| `frontend/src/app/jobs/create/page.tsx` | Modify (역할 가드) |
