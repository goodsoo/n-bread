import { describe, it, expect } from 'vitest';
import {
	computeBalances,
	partitionZeroSumSubsets,
	computeFlows,
	settle,
} from './settle.js';

const allJoin = (n) => new Array(n).fill(true);

describe('computeBalances', () => {
	it('나누어 떨어지는 금액을 N등분한다', () => {
		const balances = computeBalances(3, [
			{ payer: 0, money: 3000, joins: allJoin(3) },
		]);
		expect(balances).toEqual([-2000, 1000, 1000]);
	});

	it('README 예시: 3명이서 1000원 → 각자 334원, 결제자가 668원 수령 (올림 정책)', () => {
		const balances = computeBalances(3, [
			{ payer: 0, money: 1000, joins: allJoin(3) },
		]);
		expect(balances).toEqual([-668, 334, 334]);
	});

	it('결제자가 N빵 대상이 아니면 전액을 돌려받는다', () => {
		const balances = computeBalances(3, [
			{ payer: 0, money: 1000, joins: [false, true, true] },
		]);
		expect(balances).toEqual([-1000, 500, 500]);
	});

	it('여러 결제를 합산한다', () => {
		const balances = computeBalances(2, [
			{ payer: 0, money: 1000, joins: allJoin(2) },
			{ payer: 1, money: 600, joins: allJoin(2) },
		]);
		expect(balances).toEqual([-200, 200]);
	});

	it('금액이 비었거나 0 인 결제는 무시한다', () => {
		const balances = computeBalances(2, [
			{ payer: 0, money: '', joins: allJoin(2) },
			{ payer: 1, money: 0, joins: allJoin(2) },
		]);
		expect(balances).toEqual([0, 0]);
	});

	it('잔액의 합은 항상 0 이다', () => {
		const balances = computeBalances(4, [
			{ payer: 0, money: 1234, joins: [true, true, true, false] },
			{ payer: 2, money: 567, joins: [false, true, true, true] },
			{ payer: 3, money: 89, joins: allJoin(4) },
		]);
		expect(balances.reduce((a, b) => a + b, 0)).toBe(0);
	});
});

describe('partitionZeroSumSubsets', () => {
	it('독립적으로 정산 가능한 쌍을 쪼갠다', () => {
		/* (0,1) 끼리, (2,3) 끼리 정산 가능 */
		const subsets = partitionZeroSumSubsets([-500, 500, -300, 300]);
		expect(subsets).toHaveLength(2);
		const sorted = subsets.map((s) => [...s].sort()).sort();
		expect(sorted).toEqual([[0, 1], [2, 3]]);
	});

	it('쪼갤 수 없으면 전체가 하나의 부분집합이 된다', () => {
		const subsets = partitionZeroSumSubsets([-6, 1, 2, 3]);
		expect(subsets).toEqual([[0, 1, 2, 3]]);
	});

	it('잔액이 0 인 사람은 어떤 부분집합에도 들어가지 않는다', () => {
		const subsets = partitionZeroSumSubsets([-100, 0, 100, 0]);
		expect(subsets).toEqual([[0, 2]]);
	});

	it('모두 0 이면 빈 결과를 낸다', () => {
		expect(partitionZeroSumSubsets([0, 0, 0])).toEqual([]);
	});

	it('각 부분집합의 합은 0 이다', () => {
		const balances = [-668, 334, 334, -250, 250, -70, 30, 40];
		const subsets = partitionZeroSumSubsets(balances);
		for (const subset of subsets) {
			const sum = subset.reduce((s, i) => s + balances[i], 0);
			expect(sum).toBe(0);
		}
		/* 전원이 정확히 한 번씩 포함된다 */
		const all = subsets.flat().sort((a, b) => a - b);
		expect(all).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it('부분집합 수가 많을수록 송금 횟수가 준다 — 3쌍이면 3개로 쪼갠다', () => {
		const subsets = partitionZeroSumSubsets([-668, 334, 334, -250, 250, -70, 30, 40]);
		expect(subsets).toHaveLength(3);
	});
});

describe('computeFlows', () => {
	/* 송금을 모두 실행했을 때 전원 잔액이 0 으로 끝나는지 검증하는 헬퍼 */
	const expectSettled = (balances, flows) => {
		const after = [...balances];
		for (const { from, to, money } of flows) {
			expect(money).toBeGreaterThan(0);
			after[from] -= money;
			after[to] += money;
		}
		expect(after.every((m) => m === 0)).toBe(true);
	};

	it('부분집합마다 인원-1 번의 송금으로 정산이 끝난다', () => {
		const balances = [-668, 334, 334];
		const subsets = partitionZeroSumSubsets(balances);
		const flows = computeFlows(balances, subsets);
		expect(flows).toHaveLength(2);
		expectSettled(balances, flows);
	});

	it('보내는 사람은 잔액 전부를 한 번에 보낸다 (한 번의 송금)', () => {
		const balances = [-500, 500, -300, 300];
		const subsets = partitionZeroSumSubsets(balances);
		const flows = computeFlows(balances, subsets);
		const senders = flows.map((f) => f.from);
		expect(new Set(senders).size).toBe(senders.length);
		expectSettled(balances, flows);
	});

	it('root 가 받을 금액을 넘는 송금은 다른 받을 사람에게 간다', () => {
		const balances = [-3, -3, 6];
		const flows = computeFlows(balances, [[0, 1, 2]]);
		expect(flows).toHaveLength(2);
		expectSettled(balances, flows);
	});

	it('정산할 게 없으면 송금도 없다', () => {
		expect(computeFlows([0, 0], [])).toEqual([]);
	});
});

describe('settle (통합)', () => {
	it('여행 시나리오: 결제 3건, 4명 — 송금 흐름이 잔액을 정확히 0 으로 만든다', () => {
		const payments = [
			{ payer: 0, money: 40000, joins: allJoin(4) },
			{ payer: 1, money: 13000, joins: [true, true, true, false] },
			{ payer: 2, money: 7000, joins: [false, true, true, true] },
		];
		const { balances, flows } = settle(4, payments);
		expect(balances.reduce((a, b) => a + b, 0)).toBe(0);

		const after = [...balances];
		for (const { from, to, money } of flows) {
			after[from] -= money;
			after[to] += money;
		}
		expect(after.every((m) => m === 0)).toBe(true);
	});

	it('송금 횟수는 (잔액 있는 인원 - 부분집합 수) 이다', () => {
		const payments = [
			{ payer: 0, money: 1000, joins: allJoin(6) },
			{ payer: 3, money: 2400, joins: [false, false, false, true, true, true] },
		];
		const { balances, subsets, flows } = settle(6, payments);
		const nonZero = balances.filter((m) => m !== 0).length;
		expect(flows).toHaveLength(nonZero - subsets.length);
	});

	it('20명 (지원 최대 인원) 도 빠르게 정산한다', () => {
		const n = 20;
		const payments = Array.from({ length: n }, (_, i) => ({
			payer: i,
			money: (i + 1) * 1000,
			joins: allJoin(n),
		}));
		const start = performance.now();
		const { balances, flows } = settle(n, payments);
		expect(performance.now() - start).toBeLessThan(2000);

		const after = [...balances];
		for (const { from, to, money } of flows) {
			after[from] -= money;
			after[to] += money;
		}
		expect(after.every((m) => m === 0)).toBe(true);
	});
});
