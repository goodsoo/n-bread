/**
 * 정산 데이터의 URL 인코딩 + localStorage 보존.
 *
 * 구버전은 라우터 location.state 로 데이터를 넘겨서 /result 에서
 * 새로고침하면 크래시했다. 재작성에서는:
 * - 결과 화면: URL 쿼리(?d=...) 에 데이터를 실어 새로고침·공유 가능
 * - 입력 화면: localStorage 에 draft 를 보존해 새로고침해도 유지
 */

const STORAGE_KEY = 'n-bread:draft';
const SESSION_KEY = 'n-bread:active-session';

/**
 * 송금 흐름을 메신저에 붙여넣을 일반 텍스트로 만든다 — 링크 없이 "누가 누구에게
 * 얼마" 만. 결과 화면의 [텍스트 복사] 가 쓴다.
 *
 * @param {string[]} names
 * @param {{from:number,to:number,money:number}[]} flows
 * @returns {string}
 */
export function formatResultText(names, flows) {
	const name = (id) => (names[id] === '' ? `사람${id + 1}` : names[id]);
	const lines = flows.map((f) => `${name(f.from)} → ${name(f.to)}  ${f.money.toLocaleString('ko-KR')}원`);
	return ['[N빵 정산]', ...lines].join('\n');
}

/**
 * 클립보드 복사 — 보안 컨텍스트(HTTPS·localhost)면 Clipboard API 를,
 * 아니면(예: HTTP 로 열린 커스텀 도메인) execCommand 로 폴백한다.
 *
 * navigator.clipboard 는 보안 컨텍스트에서만 존재해서, HTTPS 인증서가 아직
 * 안 붙은 http:// 로 열면 링크·텍스트 복사가 조용히 실패했다. 폴백을 둬서
 * 어느 환경에서든 복사되게 한다.
 *
 * @param {string} text
 * @returns {Promise<boolean>} 복사 성공 여부
 */
export async function copyText(text) {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	}
	catch {
		/* 권한 거부 등 — 아래 execCommand 폴백을 시도한다 */
	}
	try {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.top = '-9999px';
		document.body.appendChild(ta);
		ta.select();
		ta.setSelectionRange(0, text.length);
		const ok = document.execCommand('copy');
		document.body.removeChild(ta);
		return ok;
	}
	catch {
		return false;
	}
}

/* 같은 브라우저 세션(새로고침)과 새 방문을 구분한다.
   새로고침이면 draft 를 조용히 복원하고, 새 방문이면 배너로 제안만 한다. */
export function isSessionActive() {
	try {
		return sessionStorage.getItem(SESSION_KEY) === '1';
	}
	catch {
		return false;
	}
}

/* 세션을 끝낸다 — 다음 입력 화면 진입을 "새 방문"으로 취급하게 한다.
   홈 [N빵하기]는 새 정산 의도이므로, 같은 탭이어도 조용히 복원하지 않고
   깨끗한 폼 + 복원 배너로 제안만 하도록 이 플래그를 지운다. */
export function endSession() {
	try {
		sessionStorage.removeItem(SESSION_KEY);
	}
	catch {
		/* 저장소 접근 불가(시크릿 등)면 어차피 세션도 없다 */
	}
}

/* base64url (유니코드 이름 안전) */
export function encodeData(data) {
	const bytes = new TextEncoder().encode(JSON.stringify(data));
	let binary = '';
	for (const b of bytes)
		binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeData(encoded) {
	try {
		const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		const data = JSON.parse(new TextDecoder().decode(bytes));
		if (!Array.isArray(data?.names) || !Array.isArray(data?.payments))
			return null;
		return data;
	}
	catch {
		return null;
	}
}

export function saveDraft(data) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		sessionStorage.setItem(SESSION_KEY, '1');
	}
	catch {
		/* 시크릿 모드 등에서 저장 실패해도 동작에는 지장 없다 */
	}
}

/* draft 를 비운다 — 정산하기로 완료된 정산은 '지난 정산'(history)에 들어가므로
   draft 에 남겨 '이어하기' 로 다시 제안하면 이상하다. draft 는 '미완료 입력' 만
   뜻하도록 제출 시 비운다. */
export function clearDraft() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	}
	catch {
		/* 저장소 접근 불가면 어차피 draft 도 없다 */
	}
}

export function loadDraft() {
	try {
		const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
		if (!Array.isArray(data?.names) || !Array.isArray(data?.payments))
			return null;
		return data;
	}
	catch {
		return null;
	}
}
