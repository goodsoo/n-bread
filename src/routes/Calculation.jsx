import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Calculation.css';
import logo from '../images/logo_before.png';
import { MAX_PEOPLE } from '../lib/settle.js';
import { encodeData, loadDraft, saveDraft } from '../lib/share.js';

const errorMsgs = [
	'',
	'사람이 아무도 없어요..',
	'혼자서 정산을..?',
	'양의 정수로 입력해 주세요.',
	`죄송해요, ${MAX_PEOPLE}명까지만 지원해요.`,
	'몇 명인지 먼저 입력하고 [확인]을 눌러주세요.',
];

const newPayment = (pid, number) => ({
	pid,
	payer: 0,
	money: '',
	joins: new Array(number).fill(true),
});

/* localStorage 의 draft 에는 pid 가 없으므로 다시 붙인다 */
const withPids = (payments) =>
	payments.map((payment, i) => ({ ...payment, pid: i }));

function Calculation() {
	const navigate = useNavigate();
	const draft = useRef(loadDraft()).current;

	const [numberInput, setNumberInput] = useState(draft ? String(draft.names.length) : '');
	const [names, setNames] = useState(draft ? draft.names : []);
	const [payments, setPayments] = useState(draft ? withPids(draft.payments) : []);
	const [errorIdx, setErrorIdx] = useState(0);

	const number = names.length;

	/* 새로고침해도 입력이 날아가지 않도록 draft 를 보존한다 */
	useEffect(() => {
		if (number >= 2)
			saveDraft({
				names,
				payments: payments.map(({ payer, money, joins }) => ({ payer, money, joins })),
			});
	}, [names, payments, number]);

	const handleClickSetNumber = () => {
		const value = Number(numberInput);

		if (value === 0)
			setErrorIdx(1);
		else if (value === 1)
			setErrorIdx(2);
		else if (value < 0 || !Number.isInteger(value))
			setErrorIdx(3);
		else if (value > MAX_PEOPLE)
			setErrorIdx(4);
		else {
			setNames(new Array(value).fill(''));
			setPayments([newPayment(0, value)]);
			setErrorIdx(0);
		}
	};

	const handleReset = () => {
		setNumberInput('');
		setNames([]);
		setPayments([]);
		setErrorIdx(0);
	};

	const handleChangeName = (id, value) => {
		setNames(names.map((name, i) => (i === id ? value : name)));
	};

	const handleChangeMoney = (pid, value) => {
		setPayments(payments.map((payment) =>
			payment.pid === pid ? { ...payment, money: value } : payment));
	};

	const handleSelectPayer = (pid, payer) => {
		setPayments(payments.map((payment) =>
			payment.pid === pid ? { ...payment, payer } : payment));
	};

	const handleCheck = (pid, personId, checked) => {
		setPayments(payments.map((payment) => {
			if (payment.pid !== pid)
				return payment;
			const joins = payment.joins.map((join, i) => (i === personId ? checked : join));
			/* 적어도 한 명은 N빵 대상이어야 한다 */
			return joins.some(Boolean) ? { ...payment, joins } : payment;
		}));
	};

	const handleAdd = () => {
		const nextPid = payments.length === 0 ? 0 : payments[payments.length - 1].pid + 1;
		setPayments([...payments, newPayment(nextPid, number)]);
	};

	const handleDelete = (pid) => {
		/* 하나 남은 항목은 없앨 수 없다 */
		if (payments.length === 1)
			return;
		setPayments(payments.filter((payment) => payment.pid !== pid));
	};

	const handleSubmit = () => {
		if (number === 0) {
			setErrorIdx(5);
			return;
		}
		const data = {
			names,
			payments: payments.map(({ payer, money, joins }) => ({ payer, money, joins })),
		};
		navigate(`/result?d=${encodeData(data)}`);
	};

	const displayName = (id) => (names[id] === '' ? `사람${id + 1}` : names[id]);

	return (
		<div className="container">
			<Link to="/">
				<img className="logoImage_small" src={logo} alt="빵" />
			</Link>

			<div className="title">정보 입력</div>

			{number < 2 ?
			<div>
				<div className="bodyText">몇 명인가요?</div>
				<div className="numberBox">
					<input
						type="number"
						placeholder="0"
						autoComplete="off"
						value={numberInput}
						onChange={(e) => setNumberInput(e.target.value)} />
					<button onClick={handleClickSetNumber}>확인</button>
				</div>
			</div>
			:
			<div className="bodyText">
				모두 {number}명이군요!{' '}
				<button className="resetButton" onClick={handleReset}>다시 입력</button>
			</div>
			}
			<div className="errorMsg">{errorMsgs[errorIdx]}</div>

			{/* people list */}
			{number >= 2 &&
			<div className="people">
				<div className="table__row">
					<div className="bodyText table__name">이름</div>
				</div>
				{names.map((name, id) => (
					<div key={id} className="table__row">
						<div className="table__name whiteBox">
							<input
								placeholder={`사람${id + 1}`}
								autoComplete="off"
								value={name}
								onChange={(e) => handleChangeName(id, e.target.value)} />
						</div>
					</div>
				))}
			</div>
			}

			{/* payment list */}
			{number >= 2 &&
			<div className="payments">
				<div className="table__row">
					<div className="bodyText table__name">결제자</div>
					<div className="bodyText table__pay">금액</div>
					{names.map((name, id) => (
						<div key={id} className="bodyText table__checkbox table__checkboxTag">
							{name.length > 4 ? `${name.slice(0, 4)}..` : displayName(id)}
						</div>
					))}
					<div className="bodyText table__delButton" />
				</div>
				{payments.map((payment) => (
					<div key={payment.pid} className="table__row">
						<div className="table__name whiteBox">
							<select
								value={payment.payer}
								onChange={(e) => handleSelectPayer(payment.pid, Number(e.target.value))}>
								{names.map((_, id) => (
									<option key={id} value={id}>{displayName(id)}</option>
								))}
							</select>
						</div>
						<div className="table__pay whiteBox">
							<input
								type="number"
								placeholder={0}
								value={payment.money}
								autoComplete="off"
								onChange={(e) => handleChangeMoney(payment.pid, e.target.value)} />
							<div>원</div>
						</div>
						{payment.joins.map((join, id) => (
							<div key={id} className="table__checkbox whiteBox">
								<input
									type="checkbox"
									checked={join}
									onChange={(e) => handleCheck(payment.pid, id, e.target.checked)} />
							</div>
						))}
						<div className="table__delButton">
							<button onClick={() => handleDelete(payment.pid)}>X</button>
						</div>
					</div>
				))}
			</div>
			}

			{number >= 2 &&
			<button className="addButton" onClick={handleAdd}>+</button>
			}

			<div className="navButton">
				<button className="navButton__link" onClick={handleSubmit}>
					정산하기 ▶
				</button>
			</div>
		</div>
	);
}

export default Calculation;
