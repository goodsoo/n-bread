# Flow: 항목화 정산 — 결제 이름 + 결과 항목별 내역

**Defined:** 2026-06-04 · **Author:** UX 담당자(아이디어 D+E) → AI(structure) · **Status:** Verified
**App:** n-bread · **Stack:** React Router v6(HashRouter) · 컴포넌트 로컬 useState · localStorage(`lib/share.js`) + URL 쿼리 인코딩 · 도메인 = `lib/settle.js`(vitest)

<intent>
## 왜 이 flow

현재 결과는 **순 송금 흐름 + 각자 순부담**만 보여준다. "민수 20,000원 받아요"는 맞지만 *어느 결제에서* 그렇게 됐는지는 안 보인다. 결제가 여러 건이면 "이 금액이 왜 이렇게 나왔지?"를 검증할 방법이 없어 신뢰가 깎인다. 두 가지를 더한다: (D) 결제마다 **선택적 이름**("점심", "택시")을 붙여 무슨 결제인지 식별하고, (E) 결과에 **항목별 내역**(결제별 누가 냈고 각자 얼마씩 분담)을 더해 순부담이 어떻게 도출됐는지 펼쳐 본다. D가 E의 가독성을 살린다("점심 36,000원 중 12,000원").
</intent>

<flow>
## Happy path

1. **결제 입력** — 사용자: (선택) 결제 이름 입력 + 누가/얼마/누구끼리 → 시스템: 이름 없으면 "결제 N" 으로 표시, draft 자동 저장(이름 포함).
2. **정산하기** — 시스템: 기존대로 결과로 이동(`d` 에 label 포함 인코딩).
3. **결과 — 송금/순부담** — 기존 섹션 그대로.
4. **결과 — 항목별 내역(신규)** — 사용자: 아래로 스크롤 → 시스템: 결제별 카드(이름·결제자·총액 + 참가자별 분담액) 표시.
</flow>

<screens>
## 화면

### 정보 입력 (`/calculation` — `routes/Calculation.jsx`)
- **변경**: 결제 카드 상단 `결제 N` 라벨 옆/아래에 **선택적 이름 입력**(`field`, placeholder "예: 점심, 택시"). 비우면 동작·표시 모두 기존과 동일.
- **상태**: 이름 입력 유무 외 기존 상태 그대로.
- **카피**: placeholder "예: 점심, 택시" · 입력칸 label 없이 placeholder 로만(공간 절약).

### 정산 결과 (`/result?d=` — `routes/Result.jsx`)
- **E = 사람별(per-person), 결제별 아님** — "내가 어디에 얼마 썼나" 욕구 해소. 별도 섹션이 아니라 **"각자 부담 정리" 행을 탭→펼치기**로 통합(순액과 상세가 한 곳, 중복 없음).
- **펼친 내역**: 그 사람의 **쓴 내역**(참가한 결제별 분담액) + **낸 내역**(본인이 결제자인 결제의 올림 회수액). 항목명은 결제 이름(없으면 "결제 N").
- **왜 둘 다**: `쓴 총액 − 낸 총액 = 순부담` 이 그대로 보여 "총액이 어떻게 나왔는지" 를 설명. 올림은 낸 내역의 회수액에 반영(기존 올림 안내와 정합).
- **상태**: 정상 / 금액 0 결제 제외 / viewer·owner 동일(읽기 정보) / 쓴·낸 둘 다 없는 사람은 펼침 비활성.
- **카피(확정)**: 행 펼침(별도 섹션 제목 없음) · 그룹 라벨 "쓴 내역"·"낸 내역"
</screens>

<backbone-map>
## 백본 매핑

| 스텝 | 화면/route | 상태 | 데이터/IO | 기존/신규 |
|---|---|---|---|---|
| 결제 이름 입력 | `Calculation.jsx` 결제 카드 | `payments[i].label` (state) | `newPayment` 에 `label:''` 추가 + `handleChangeLabel` | 신규 |
| 이름을 데이터에 포함 | `Calculation.jsx:60,164` **수정** | — | draft·encode 매핑 `({payer,money,joins})` → **`({label,payer,money,joins})`** (현재 label 누락됨) | 신규(수정) |
| 분담 계산 | — | — | **신규**: `lib/settle.js` `computeShares`(결제별, 내부용) + `computePersonBreakdown(payments,count)`(사람별 consumed/paid 집계). 올림 정책은 `computeBalances` 와 동일 재사용 | 신규 |
| 사람별 내역 펼침 | `Result.jsx` 각자 부담 정리 행 | `openRows`(펼친 사람 id) | `computePersonBreakdown` 호출 | 신규 |
| decode 호환 | `share.js:33-45` | — | label 은 추가 필드라 기존 검증(names/payments 배열) 통과 — **하위호환 OK**(옛 링크엔 label 없음 → "결제 N") | 기존 |
</backbone-map>

<edge-cases>
## 엣지케이스

- **이름 미입력**: "결제 N" fallback — 기존 `paymentCard__index` 와 동일 규칙.
- **옛 공유 링크(label 없음)**: decode 시 label undefined → "결제 N". 깨지지 않음(하위호환).
- **KO 입력(IME)**: 이름은 controlled input 단순 반영, 조합 중 끊김 없음.
- **금액 0 결제**: 내역에서 제외(분담 계산도 skip — `computeBalances` 와 동일 가드).
- **올림 발생 결제**: 분담액 합이 결제자 회수액과 1~N-1원 차이. 내역에 결제자 "거스름 받음"을 명시하거나 기존 올림 안내(`Result.jsx:97-101`) 재사용 — 중복 설명 피하기.
- **이름만 길 때**: 결제 이름 truncate(`text-overflow: ellipsis`).
- **URL 길이**: label 이 `d` 를 늘림. 기존 deferred(URL 길이 한계)에 합산 — 큰 변화 아님.
</edge-cases>

<build-phases>
## 빌드 단계 (Ralph 용)

- **Phase 1 — `computeShares`**: `lib/settle.js` 에 결제별 분담 순수함수 + vitest. Done: 균등·올림·금액0·비참가자 케이스 통과, 분담액 합/올림이 `computeBalances` 와 정합.
- **Phase 2 — 결제 이름(D)**: `newPayment` label 추가 + 입력칸 + `handleChangeLabel` + **draft/encode 매핑에 label 포함**(현재 누락). Done: 이름 입력→draft·`d` 에 반영, 비우면 기존과 동일, 옛 링크 하위호환.
- **Phase 3 — 사람별 펼침 내역(E)**: `computePersonBreakdown` + `Result.jsx` 각자 부담 정리 행 펼치기(쓴/낸 내역). Done: 쓴−낸=순부담 정합, 결제 2건+올림 케이스 검증, 이름 없으면 "결제 N", 토글 동작.
  - **정정 이력**: 최초 결제별(per-payment)로 구현했다가 "사람별" 의도 확인 후 per-person 으로 교체(`computeShares` 섹션 제거 → `computePersonBreakdown` 펼침).
- TDD: 각 phase 실패 테스트 먼저.
</build-phases>

<verification>
## 검증

- `npm test` — `computeShares` 단위 + 기존 settle/share/history 전부 통과.
- 수동(브라우저): ① 결제에 이름 2건 입력→결과 항목별 내역에 이름 표시 ② 이름 비운 결제→"결제 N" ③ 올림 결제→내역 분담 합이 순부담과 맞음 ④ 옛 label 없는 `d` 링크→안 깨지고 "결제 N".
- 모든 phase 통과 시에만 `<promise>COMPLETE</promise>`.
</verification>

<deferred>
## 범위 밖

- **B — 사람/칩 공간 절약**: 사람 많을 때 칩(N명×M결제)이 차지하는 공간 재설계. 별도 FLOW(`space-saving.md`)로 분리 — 설계 결정(접기 vs 요약 vs 다른 입력 방식)이 더 필요.
- **결제 이름 자동완성/최근 이름** — 과한 기능, v1 제외.
- **항목별 내역 접기/펼치기** — 결제 많으면 길어질 수 있으나, 우선 전체 표시로 두고 실사용 보고 결정.
</deferred>
