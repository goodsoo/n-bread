# Flow: 핵심 정산 — 입력 → 결과 → 공유 → 수신자 열람 → 기록

**Defined:** 2026-06-04 · **Author:** UX 담당자(high-level) → AI(structure) · **Status:** In-build
**App:** n-bread · **Stack:** React Router v6(HashRouter, 코드 내 `<Route>`) · 상태 백본 없음(컴포넌트 로컬 useState) · 데이터/IO = localStorage(`lib/share.js`) + URL 쿼리 인코딩(`encodeData`/`decodeData`) · 도메인 = `lib/settle.js`(vitest) · DS 없음

<intent>
## 왜 이 flow

핵심 동선(입력→결과→공유)은 동작하지만 세 군데가 비어 있다: (1) **수신자가 링크를 열면 owner UI([수정하기])가 그대로 노출**되고, 열기만 해도 수신자 본인의 draft 가 공유 데이터로 덮어써진다(`Result.jsx:16-19`) — 공유가 곧 데이터 파괴. (2) **이전 정산 기록이 없다** — draft 단일 슬롯뿐이라 "지난주 그 정산" 을 다시 볼 방법이 없다. (3) **뒤로가기 affordance 부재** — topbar 로고는 홈으로만 가고, 명시적 back 이 없다. 이 문서는 기록 저장소 하나(`lib/history.js` 신규)로 (1)의 owner 판별과 (2)를 동시에 풀고, 흐름 전체를 계약으로 고정한다.
</intent>

<flow>
## Happy path

1. **홈 진입** — 사용자: 첫 방문 → 시스템: 가치 제안 + [N빵하기]. 기록 있으면 [지난 정산] 보조 진입점 노출.
2. **인원 입력** — 사용자: 이름 입력/추가/삭제 → 시스템: 칩·결제자 select 에 즉시 반영, draft 자동 저장.
3. **결제 입력** — 사용자: 결제별 (누가, 얼마, 누구끼리) → 시스템: 검증 없이 수용, draft 자동 저장.
4. **정산하기** — 사용자: [정산하기] → 시스템: 금액 검증(0원이면 인라인 에러) → **기록에 저장(신규)** → `/result?d=` 이동.
5. **결과 확인** — 사용자: 결과 열람 → 시스템: 최소 송금 플로우 + 각자 부담 + (필요 시) 올림 안내.
6. **공유** — 사용자: [결과 링크 복사] → 메신저 전달 → 시스템: 클립보드 복사 + "복사했어요!" 피드백.
7. **수신자 열람** — 수신자: 링크 열기 → 시스템: **읽기전용 결과**(owner UI 숨김, draft 안 건드림) + "나도 N빵 만들기" CTA.
8. **기록 재방문** — 사용자: 홈 → [지난 정산] → 기록 목록 → 항목 탭 → 해당 결과(owner 모드) 재열람.
</flow>

<screens>
## 화면

### 홈 (`/` — `routes/Home.jsx`)
- **상태**: 정상(기록 없음) / 정상(기록 있음 — [지난 정산] 보조 링크 추가, **신규**)
- **진입**: 직접 방문, topbar 로고 · **이탈**: [N빵하기]→`/calculation`, [지난 정산]→`/history`(신규), [만든이]→`/about`
- **카피**: 버튼 "N빵하기"(기존) · 보조 "지난 정산"

### 정보 입력 (`/calculation` — `routes/Calculation.jsx`)
- **상태**: 초기(2명, 결제 1건) / 복원 배너(`pendingDraft`, `Calculation.jsx:182-194`) / 입력 중 / 인라인 에러(`peopleMsg`·`submitMsg`)
- **진입**: 홈 [N빵하기], 결과 [수정하기](owner), 새로고침(세션 활성 시 조용히 복원 `Calculation.jsx:35-44`) · **이탈**: [정산하기]→`/result?d=`, topbar back→`/`(신규)
- **컴포넌트**: 카드, 칩(`chips`), `field`, 복원 배너
- **카피**: 배너 "지난 정산이 남아 있어요" [이어하기]/[새로 시작] · 에러 "결제 금액을 입력해 주세요."(기존 유지)

### 정산 결과 — owner (`/result?d=` — `routes/Result.jsx`)
- **판별**: `d` 가 내 기록(`lib/history.js`)에 존재 → owner. **(신규 — 현재는 무조건 owner 취급)**
- **상태**: 정상(플로우 N건) / 0원 정산("정산할 게 없네요!") / 금액 미입력(`noAmount`) / 디코드 실패(빈 화면 안내 `Result.jsx:22-38`) / 복사 완료(1.5s)
- **진입**: [정산하기], 기록 항목 탭, 내가 만든 링크 재방문 · **이탈**: [수정하기]→`/calculation`(이때 URL 데이터를 draft 로 적재 — 현재의 mount 시 무조건 saveDraft 를 클릭 시점으로 이동), topbar back→`/calculation`(신규)
- **카피**: "이렇게 보내면 끝나요 — 송금 N번" · [결과 링크 복사]/[복사했어요!] · [수정하기] (기존 유지)

### 정산 결과 — viewer (**신규 분기**, 같은 route)
- **판별**: `d` 가 내 기록에 없음 → viewer
- **상태**: 정상(읽기전용) / 디코드 실패(동일 안내)
- **차이**: [수정하기] 숨김 · mount 시 `saveDraft` **호출 안 함**(수신자 draft 보호) · [결과 링크 복사]는 유지(재공유 가능) · CTA 추가 → `/calculation`(빈 상태에서 시작, 수신자의 기존 draft 가 있으면 복원 배너가 자연히 뜸)
- **카피(확정)**: CTA "나도 N빵 만들기"

### 지난 정산 (`/history` — **신규 route + 화면**)
- **상태**: 빈(기록 0건) / 정상(최신순 목록) / 삭제 확인
- **목록 항목**: 날짜 · 인원 수 · 총액 · 송금 횟수 (탭→`/result?d=`)
- **진입**: 홈 [지난 정산] · **이탈**: 항목 탭→결과, topbar back→`/`
- **카피**: 빈상태 "아직 정산 기록이 없어요.\n첫 N빵을 시작해 보세요." · 항목 삭제 "지우기"
</screens>

<backbone-map>
## 백본 매핑

| 스텝 | 화면/route | 상태 | 데이터/IO | 컴포넌트 | 기존/신규 |
|---|---|---|---|---|---|
| 홈 진입 | `routes/Home.jsx:5` | — | — | `btn--primary` | 기존 |
| 홈 [지난 정산] 노출 | `routes/Home.jsx` | — | `history.list()` **신규** | `btn--ghost` | 신규 |
| 인원/결제 입력 | `routes/Calculation.jsx:30` | 로컬 useState (`:45-49`) | `saveDraft` (`share.js:47`) | 카드/칩/field | 기존 |
| draft 복원 배너 | `routes/Calculation.jsx:182-194` | `pendingDraft` | `loadDraft`+`isSessionActive` (`share.js:15,57`) | `draftBanner` | 기존 |
| 정산하기 → 검증 | `routes/Calculation.jsx:157-168` | `submitMsg` | `encodeData` (`share.js:25`) | `submitArea` | 기존 |
| **정산하기 → 기록 저장** | `routes/Calculation.jsx:157` 확장 | — | **신규 필요**: `lib/history.js` — localStorage 배열(`n-bread:history`), `add({d, createdAt, peopleCount, total, flowCount})`, 상한 20건 | — | 신규 |
| 결과 계산/표시 | `routes/Result.jsx:40-41` | — | `decodeData`+`settle()` | `flowCard`/`balanceCard` | 기존 |
| **owner/viewer 판별** | `routes/Result.jsx` | `isMine` | **신규 필요**: `history.has(d)` | — | 신규 |
| **viewer draft 보호** | `routes/Result.jsx:16-19` **수정** | — | mount 시 무조건 `saveDraft` → owner 의 [수정하기] 클릭 시점으로 이동 | — | 신규(수정) |
| 링크 복사 | `routes/Result.jsx:55-64` | `copied` | `navigator.clipboard` | `btn--primary` | 기존 |
| **복사 실패 fallback** | `routes/Result.jsx:61-63` | — | 현재 조용히 무시 → 실패 안내 추가 | `errorMsg` | 신규(수정) |
| **viewer CTA** | `routes/Result.jsx:127-142` 분기 | `isMine` | — | `btn--primary` | 신규 |
| **기록 목록 화면** | **신규 필요**: `routes/History.jsx` + `App.jsx:13-18` route 추가 | 로컬 useState | `history.list()/remove()` | 카드 목록 | 신규 |
| **topbar back** | `Calculation.jsx:174-179`, `Result.jsx:68-73`, History | — | `navigate(-1)` 아닌 **명시 목적지**(아래 엣지케이스 참고) | `topbar` 확장 | 신규 |
</backbone-map>

<edge-cases>
## 엣지케이스

- **수신자 링크 열람 (핵심)**: viewer 판별 실패 시나리오 — localStorage 접근 불가(시크릿 모드)면 `history.has()` 가 false → 안전한 쪽(viewer = 읽기전용)으로 떨어진다. owner 가 시크릿으로 자기 링크 열어도 viewer 로 보이는 건 수용(데이터 파괴보다 낫다).
- **뒤로가기**: 브라우저 back 은 HashRouter 가 자연 처리. topbar back 은 `navigate(-1)` 대신 **명시 목적지**(입력→홈, 결과→입력, 기록→홈) — 수신자가 외부(메신저)에서 직접 진입한 경우 `-1` 은 앱 밖으로 나가버린다. 단 viewer 의 결과→입력 back 은 홈으로(입력 이력이 없으므로).
- **결과 → 수정 → 재정산**: 기록에 새 항목이 추가됨(이전 결과도 보존). 같은 `d` 재정산이면 중복 저장 안 함(`history.has` 체크).
- **디코드 실패/빈 `d`**: 기존 안내 유지(`Result.jsx:22-38`).
- **금액 0 제출**: 입력 화면 인라인 에러로 차단(`Calculation.jsx:158-162`, 기존).
- **올림 발생**: 안내 문구 기존 유지(`Result.jsx:97-101`).
- **KO 입력(IME)**: 이름은 controlled input 단순 반영이라 조합 중 끊김 없음(검증 필요 없음). 빈 이름은 `사람N` fallback(`Calculation.jsx:170`) — 칩·결과에도 동일 적용 확인.
- **localStorage 실패(시크릿)**: `share.js` 가 이미 silent — `history.js` 도 동일 원칙(저장 실패해도 정산 자체는 동작).
- **URL 길이**: 20명 × 다수 결제 → `d` 수천 자 가능. 메신저별 잘림 위험은 알려진 한계로 <deferred> 에 기록.
- **clipboard 권한 없음**: 현재 조용히 무시 → 사용자는 복사된 줄 안다. 실패 시 "복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요." 안내.
</edge-cases>

<build-phases>
## 빌드 단계 (Ralph 용)

각 단계는 독립적으로 테스트 가능 + atomic commit 가능해야 한다.

- **Phase 1 — `lib/history.js`**: localStorage 기록 배열(add/list/remove/has, 상한 20, 실패 silent) + `Calculation.jsx` 정산하기에서 `add()` 호출. Done: vitest 로 add/list/has/상한/실패 케이스 통과, 정산 후 localStorage 에 항목 생김.
- **Phase 2 — Result owner/viewer 분기**: `history.has(d)` 로 `isMine` 판별 → viewer 는 [수정하기] 숨김 + mount `saveDraft` 제거(owner [수정하기] 클릭 시점으로 이동) + CTA 노출. Done: 기록에 없는 `d` 로 열면 [수정하기] 없음·draft 불변, 기록에 있는 `d` 면 기존과 동일.
- **Phase 3 — `/history` 화면**: `routes/History.jsx` + `App.jsx` route + 홈 보조 진입점(기록 있을 때만). Done: 정산 2건 후 목록 2건 최신순, 탭하면 owner 모드 결과, 삭제 동작.
- **Phase 4 — topbar back + copy fallback**: 입력/결과/기록 topbar 에 명시 목적지 back, viewer 는 결과→홈. clipboard 실패 시 안내 문구. Done: 각 화면 back 목적지 표 대로, clipboard mock 실패 시 안내 노출.
- TDD: 각 phase 는 실패 테스트 먼저 (vitest — `lib/` 는 단위, 화면은 가능한 범위).
</build-phases>

<verification>
## 검증

- `npm test` (vitest) — `lib/history.js`, `lib/share.js`, `lib/settle.js` 단위 테스트 전부 통과.
- 수동 체크리스트 (verify-*.mjs 패턴 없음 — 이 repo 는 vitest + 수동):
  1. 정산하기 → 기록 저장 → 홈에 [지난 정산] 노출
  2. 시크릿 창에서 결과 링크 열기 → [수정하기] 없음 + CTA 보임 + 일반 창 draft 무손상
  3. 기록 항목 탭 → owner 모드 결과 → [수정하기] → 입력 복원
  4. 각 화면 topbar back 목적지 확인
- 모든 phase 통과 시에만 `<promise>COMPLETE</promise>` 출력.
</verification>

<deferred>
## 범위 밖

- **URL 길이 한계** (20명 × 다수 결제 시 메신저 잘림) — 단축 URL/서버 저장은 백엔드가 없는 현 구조(gh-pages 정적)와 충돌. 실사용 불편 확인 후 결정.
- **수신자의 "내 기록에 저장"** — viewer 가 받은 정산을 자기 기록에 보관하는 기능. CTA 와 역할이 겹쳐 v1 에서는 뺌.
- **기록 동기화/백업** — localStorage 한정. 기기 바뀌면 사라지는 건 알려진 한계.
</deferred>
