import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_HISTORY, addHistory, hasHistory, listHistory, removeHistory } from './history.js';

/* vitest 는 node 환경 — localStorage 를 인메모리로 흉내 낸다 */
const makeStorage = () => {
	let store = {};
	return {
		getItem: (key) => (key in store ? store[key] : null),
		setItem: (key, value) => { store[key] = String(value); },
		removeItem: (key) => { delete store[key]; },
	};
};

const record = (d, extra = {}) => ({
	d,
	createdAt: 1000,
	peopleCount: 2,
	total: 10000,
	flowCount: 1,
	...extra,
});

beforeEach(() => {
	globalThis.localStorage = makeStorage();
});

describe('listHistory', () => {
	it('기록이 없으면 빈 배열', () => {
		expect(listHistory()).toEqual([]);
	});

	it('저장된 JSON 이 깨져 있으면 빈 배열', () => {
		localStorage.setItem('n-bread:history', '{broken');
		expect(listHistory()).toEqual([]);
	});

	it('배열이 아닌 값이 저장돼 있으면 빈 배열', () => {
		localStorage.setItem('n-bread:history', '"oops"');
		expect(listHistory()).toEqual([]);
	});
});

describe('addHistory', () => {
	it('추가한 기록을 최신순으로 돌려준다', () => {
		addHistory(record('aaa', { createdAt: 1 }));
		addHistory(record('bbb', { createdAt: 2 }));
		const list = listHistory();
		expect(list.map((r) => r.d)).toEqual(['bbb', 'aaa']);
	});

	it('같은 d 는 중복 저장하지 않는다', () => {
		addHistory(record('aaa'));
		addHistory(record('aaa'));
		expect(listHistory()).toHaveLength(1);
	});

	it(`상한 ${20}건 — 넘으면 가장 오래된 것부터 버린다`, () => {
		for (let i = 0; i < MAX_HISTORY + 3; i += 1)
			addHistory(record(`d${i}`, { createdAt: i }));
		const list = listHistory();
		expect(list).toHaveLength(MAX_HISTORY);
		expect(list[0].d).toBe(`d${MAX_HISTORY + 2}`); // 최신은 남고
		expect(list.some((r) => r.d === 'd0')).toBe(false); // 가장 오래된 것은 버려짐
	});

	it('localStorage 가 던져도 조용히 넘어간다', () => {
		globalThis.localStorage = {
			getItem: vi.fn(() => { throw new Error('denied'); }),
			setItem: vi.fn(() => { throw new Error('denied'); }),
		};
		expect(() => addHistory(record('aaa'))).not.toThrow();
		expect(listHistory()).toEqual([]);
	});
});

describe('hasHistory', () => {
	it('기록에 있으면 true, 없으면 false', () => {
		expect(hasHistory('aaa')).toBe(false);
		addHistory(record('aaa'));
		expect(hasHistory('aaa')).toBe(true);
		expect(hasHistory('bbb')).toBe(false);
	});
});

describe('removeHistory', () => {
	it('해당 d 만 지운다', () => {
		addHistory(record('aaa'));
		addHistory(record('bbb'));
		removeHistory('aaa');
		expect(listHistory().map((r) => r.d)).toEqual(['bbb']);
		expect(hasHistory('aaa')).toBe(false);
	});
});
