/**
 * N빵 정산 알고리즘 — 순수 함수 모듈.
 *
 * 1. computeBalances : 결제 내역 → 각자의 순 지불액 (올림 정책: 결제자가 "이자" 수령)
 * 2. partitionZeroSumSubsets : 합이 0 이 되는 부분집합으로 최대한 쪼갠다 (subset sum)
 *    — 부분집합 수만큼 송금 횟수가 줄어든다
 * 3. computeFlows : 각 부분집합 안에서 송금 흐름(보내는 이→받는 이)을 구한다
 *
 * settle() 이 세 단계를 묶은 진입점.
 */

export const MAX_PEOPLE = 20;

/**
 * 각자의 순 지불액을 구한다. 양수 = 보내야 할 돈, 음수 = 받아야 할 돈.
 *
 * 올림 정책: 금액이 참가자 수로 나누어 떨어지지 않으면 올림해서 N등분한다.
 * 결제자는 올림된 총액을 돌려받으므로 차액(최대 N-1원)은 결제자가 받는 "이자".
 * 예) 3명이서 1000원 → 각자 334원, 결제자가 받을 돈 668원.
 *
 * @param {number} count 전체 인원 수
 * @param {{payer: number, money: number|string, joins: boolean[]}[]} payments
 * @returns {number[]} 인원별 순 지불액 (합은 항상 0)
 */
export function computeBalances(count, payments) {
	const balances = new Array(count).fill(0);

	for (const { payer, money, joins } of payments) {
		const joinCount = joins.filter(Boolean).length;
		let amount = Math.floor(Number(money)) || 0;
		if (joinCount === 0 || amount <= 0)
			continue;

		/* 나누어 떨어지지 않으면 올림해서 보내기로 한다 */
		const rest = amount % joinCount;
		if (rest !== 0)
			amount += joinCount - rest;
		const share = amount / joinCount;

		/* 결제자는 (올림된) 사용 금액만큼 제외 */
		balances[payer] -= amount;

		/* N등분하여 각 참가자의 지불액에 추가 */
		for (let i = 0; i < joins.length; i++)
			if (joins[i])
				balances[i] += share;
	}
	return balances;
}

/**
 * 결제별 분담 내역을 구한다 — "각자 어느 결제에 얼마씩" 을 펼쳐 보기 위한 것.
 *
 * 올림 정책은 computeBalances 와 동일하다(정합 보장): 나누어 떨어지지 않으면
 * 올림해서 N등분하고, 결제자는 올림된 총액(rounded)을 회수한다. 따라서
 * Σ(분담액) − Σ(결제자 회수액) 은 computeBalances 결과와 정확히 일치한다.
 *
 * 금액 0·빈 결제, N빵 대상 0명인 결제는 내역에서 제외한다.
 * 원래 결제 위치(index)를 보존해 "결제 N" 표시에 쓴다.
 *
 * @param {{label?: string, payer: number, money: number|string, joins: boolean[]}[]} payments
 * @returns {{index:number,label:string,payer:number,total:number,rounded:number,share:number,shares:{id:number,amount:number}[]}[]}
 */
export function computeShares(payments) {
	const result = [];

	payments.forEach((payment, index) => {
		const { payer, money, joins, label } = payment;
		const joinCount = joins.filter(Boolean).length;
		const total = Math.floor(Number(money)) || 0;
		if (joinCount === 0 || total <= 0)
			return;

		/* computeBalances 와 같은 올림 */
		const rest = total % joinCount;
		const rounded = rest === 0 ? total : total + (joinCount - rest);
		const share = rounded / joinCount;

		const shares = [];
		for (let i = 0; i < joins.length; i++)
			if (joins[i])
				shares.push({ id: i, amount: share });

		result.push({ index, label: label ?? '', payer, total, rounded, share, shares });
	});

	return result;
}

/**
 * 사람별 내역을 구한다 — "내가 어디에 얼마를 썼고, 무엇을 냈나" 를 펼쳐 보기 위한 것.
 *
 * computeShares 를 사람 축으로 뒤집는다:
 * - consumed: 그 사람이 참가한 결제들의 분담액(올림된 share)
 * - paid:     그 사람이 결제자인 결제들의 회수액(올림된 rounded)
 *
 * consumedTotal − paidTotal 은 computeBalances 의 순부담과 정확히 일치한다
 * (balances[i] = Σ참가 share − Σ결제 rounded). 그래서 펼친 내역이 "총액이
 * 어떻게 나왔는지" 를 그대로 설명한다.
 *
 * @param {{label?: string, payer: number, money: number|string, joins: boolean[]}[]} payments
 * @param {number} count 전체 인원 수
 * @returns {{id:number,consumed:{index:number,label:string,amount:number}[],paid:{index:number,label:string,amount:number}[],consumedTotal:number,paidTotal:number}[]}
 */
export function computePersonBreakdown(payments, count) {
	const result = Array.from({ length: count }, (_, id) => ({
		id, consumed: [], paid: [], consumedTotal: 0, paidTotal: 0,
	}));

	for (const p of computeShares(payments)) {
		for (const s of p.shares) {
			result[s.id].consumed.push({ index: p.index, label: p.label, amount: s.amount });
			result[s.id].consumedTotal += s.amount;
		}
		result[p.payer].paid.push({ index: p.index, label: p.label, amount: p.rounded });
		result[p.payer].paidTotal += p.rounded;
	}

	return result;
}

/* k 개짜리 조합을 사전순으로 순회하는 generator */
function* combinations(n, k) {
	const combo = Array.from({ length: k }, (_, i) => i);
	while (true) {
		yield combo;
		let i = k - 1;
		while (i >= 0 && combo[i] === n - k + i)
			i -= 1;
		if (i < 0)
			return;
		combo[i] += 1;
		for (let j = i + 1; j < k; j++)
			combo[j] = combo[j - 1] + 1;
	}
}

/**
 * 잔액 배열을 "합이 0 이 되는 부분집합" 들로 최대한 쪼갠다.
 *
 * 크기가 작은 zero-sum 부분집합부터 greedy 하게 떼어낸다.
 * 전체의 절반보다 큰 부분집합은 찾을 필요가 없다 — 그 여집합도 zero-sum 이고
 * 더 작으므로 먼저 발견된다. 더 못 쪼개면 남은 전부가 마지막 부분집합.
 *
 * @param {number[]} balances 순 지불액 배열 (합 0)
 * @returns {number[][]} 부분집합들의 index 배열 (잔액 0 인 사람은 제외)
 */
export function partitionZeroSumSubsets(balances) {
	const result = [];
	let remaining = [];
	for (let i = 0; i < balances.length; i++)
		if (balances[i] !== 0)
			remaining.push(i);

	let found = true;
	while (found && remaining.length > 0) {
		found = false;
		search:
		for (let size = 2; size <= remaining.length / 2; size++) {
			for (const combo of combinations(remaining.length, size)) {
				let sum = 0;
				for (const k of combo)
					sum += balances[remaining[k]];
				if (sum === 0) {
					result.push(combo.map((k) => remaining[k]));
					const used = new Set(combo);
					remaining = remaining.filter((_, k) => !used.has(k));
					found = true;
					break search;
				}
			}
		}
	}
	if (remaining.length > 0)
		result.push(remaining);
	return result;
}

/**
 * 각 부분집합 안에서 송금 흐름을 구한다.
 *
 * 부분집합 내 잔액 합이 0 이므로 집합 안에서만 주고받아 정산이 끝난다.
 * n 명이면 n-1 번의 송금으로 충분하다. 돈을 보내지 않는 한 사람(root)은
 * 받을 돈이 가장 많은 사람으로 정하고, 보내는 사람은 자기 잔액 전부를
 * 한 번에 보낸다 — 각자 송금은 최대 한 번.
 *
 * @param {number[]} balances 순 지불액 배열
 * @param {number[][]} subsets partitionZeroSumSubsets 결과
 * @returns {{from: number, to: number, money: number}[]}
 */
export function computeFlows(balances, subsets) {
	const flows = [];

	for (const subset of subsets) {
		const money = subset.map((i) => balances[i]);
		/* 받을 돈이 가장 많은 사람 = 잔액이 가장 작은(음수) 사람 */
		const root = money.indexOf(Math.min(...money));

		while (money[root] !== 0) {
			let from;
			let to;
			for (let j = 0; j < money.length; j++) {
				if (from === undefined && money[j] > 0) {
					from = j;
					/* root 가 받을 금액 안에 들어가면 root 에게 우선적으로 보낸다 */
					if (money[from] <= Math.abs(money[root]))
						to = root;
				}
				else if (to === undefined && money[j] < 0 && j !== root)
					to = j;

				if (from !== undefined && to !== undefined)
					break;
			}
			flows.push({ from: subset[from], to: subset[to], money: money[from] });
			money[to] += money[from];
			money[from] = 0;
		}
	}
	return flows;
}

/**
 * 정산 한 번에 끝내기: 결제 내역 → { balances, subsets, flows }.
 */
export function settle(count, payments) {
	const balances = computeBalances(count, payments);
	const subsets = partitionZeroSumSubsets(balances);
	const flows = computeFlows(balances, subsets);
	return { balances, subsets, flows };
}
