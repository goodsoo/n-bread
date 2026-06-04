import { describe, it, expect } from 'vitest';
import { formatResultText } from './share.js';

describe('formatResultText', () => {
	it('헤더 + "보내는이 → 받는이  금액" 목록을 만든다', () => {
		const text = formatResultText(['민수', '영희', '철수'], [
			{ from: 1, to: 0, money: 7000 },
			{ from: 2, to: 0, money: 12000 },
		]);
		expect(text).toBe('[N빵 정산]\n영희 → 민수  7,000원\n철수 → 민수  12,000원');
	});

	it('이름이 비면 "사람N" 으로 채운다', () => {
		const text = formatResultText(['', ''], [{ from: 1, to: 0, money: 5000 }]);
		expect(text).toBe('[N빵 정산]\n사람2 → 사람1  5,000원');
	});

	it('송금이 없으면 헤더만 남긴다', () => {
		expect(formatResultText(['민수', '영희'], [])).toBe('[N빵 정산]');
	});
});
