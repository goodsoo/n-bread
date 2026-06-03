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
