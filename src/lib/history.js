/**
 * 정산 기록의 localStorage 보존.
 *
 * draft(share.js)가 "지금 입력 중인 한 건" 이라면, 기록은 "정산하기를
 * 누른 결과들" 의 목록이다. 두 가지 역할을 한다:
 * - 지난 정산 목록 화면(/history)의 저장소
 * - 결과 화면의 owner/viewer 판별 — 내 기록에 있는 d 면 내가 만든 정산
 */

const HISTORY_KEY = 'n-bread:history';

export const MAX_HISTORY = 20;

/* 기록: { d, createdAt, peopleCount, total, flowCount } 의 배열, 최신순 */
export function listHistory() {
	try {
		const list = JSON.parse(localStorage.getItem(HISTORY_KEY));
		return Array.isArray(list) ? list : [];
	}
	catch {
		return [];
	}
}

export function addHistory(record) {
	try {
		/* 같은 정산(d)을 다시 제출해도 중복 저장하지 않는다 */
		const rest = listHistory().filter((r) => r.d !== record.d);
		const list = [record, ...rest].slice(0, MAX_HISTORY);
		localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
	}
	catch {
		/* 시크릿 모드 등에서 저장 실패해도 정산 자체는 동작해야 한다 */
	}
}

export function hasHistory(d) {
	return listHistory().some((r) => r.d === d);
}

export function removeHistory(d) {
	try {
		const list = listHistory().filter((r) => r.d !== d);
		localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
	}
	catch {
		/* 위와 같은 원칙 */
	}
}
