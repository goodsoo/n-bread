import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Calculation.css';
import logo from '../images/logo_before.png';
import { MAX_PEOPLE } from '../lib/settle.js';
import { encodeData, loadDraft, saveDraft } from '../lib/share.js';

const MIN_PEOPLE = 2;

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

	const [names, setNames] = useState(draft ? draft.names : ['', '']);
	const [payments, setPayments] = useState(draft
		? withPids(draft.payments)
		: [newPayment(0, MIN_PEOPLE)]);
	const [errorMsg, setErrorMsg] = useState('');

	const number = names.length;

	/* 새로고침해도 입력이 날아가지 않도록 draft 를 보존한다 */
	useEffect(() => {
		saveDraft({
			names,
			payments: payments.map(({ payer, money, joins }) => ({ payer, money, joins })),
		});
	}, [names, payments]);

	const handleAddPerson = () => {
		if (number >= MAX_PEOPLE) {
			setErrorMsg(`죄송해요, ${MAX_PEOPLE}명까지만 지원해요.`);
			return;
		}
		setNames([...names, '']);
		setPayments(payments.map((payment) =>
			({ ...payment, joins: [...payment.joins, true] })));
		setErrorMsg('');
	};

	const handleRemovePerson = () => {
		if (number <= MIN_PEOPLE) {
			setErrorMsg('혼자서 정산을..?');
			return;
		}
		const removed = number - 1;
		setNames(names.slice(0, removed));
		setPayments(payments.map((payment) => {
			const joins = payment.joins.slice(0, removed);
			/* 적어도 한 명은 N빵 대상이어야 한다 */
			if (!joins.some(Boolean))
				joins[0] = true;
			return {
				...payment,
				joins,
				payer: payment.payer === removed ? 0 : payment.payer,
			};
		}));
		setErrorMsg('');
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

	const handleToggleJoin = (pid, personId) => {
		setPayments(payments.map((payment) => {
			if (payment.pid !== pid)
				return payment;
			const joins = payment.joins.map((join, i) => (i === personId ? !join : join));
			/* 적어도 한 명은 N빵 대상이어야 한다 */
			return joins.some(Boolean) ? { ...payment, joins } : payment;
		}));
	};

	const handleAddPayment = () => {
		const nextPid = payments[payments.length - 1].pid + 1;
		setPayments([...payments, newPayment(nextPid, number)]);
	};

	const handleDeletePayment = (pid) => {
		/* 하나 남은 항목은 없앨 수 없다 */
		if (payments.length === 1)
			return;
		setPayments(payments.filter((payment) => payment.pid !== pid));
	};

	const handleSubmit = () => {
		const data = {
			names,
			payments: payments.map(({ payer, money, joins }) => ({ payer, money, joins })),
		};
		navigate(`/result?d=${encodeData(data)}`);
	};

	const displayName = (id) => (names[id] === '' ? `사람${id + 1}` : names[id]);

	return (
		<div className="page">
			<div className="topbar">
				<Link to="/">
					<img className="topbar__logo" src={logo} alt="빵" />
				</Link>
				<div className="topbar__title">정보 입력</div>
			</div>

			{/* 인원 */}
			<div className="card">
				<div className="card__label">몇 명인가요?</div>
				<div className="stepper">
					<button
						className="btn stepper__button"
						aria-label="인원 줄이기"
						onClick={handleRemovePerson}>−</button>
					<div className="stepper__count">{number}명</div>
					<button
						className="btn stepper__button"
						aria-label="인원 늘리기"
						onClick={handleAddPerson}>+</button>
				</div>
				<div className="errorMsg">{errorMsg}</div>
			</div>

			{/* 이름 */}
			<div className="card">
				<div className="card__label">이름</div>
				<div className="nameGrid">
					{names.map((name, id) => (
						<input
							key={id}
							className="field"
							placeholder={`사람${id + 1}`}
							autoComplete="off"
							value={name}
							onChange={(e) => handleChangeName(id, e.target.value)} />
					))}
				</div>
			</div>

			{/* 결제 내역 */}
			<div className="card__label card__label--section">결제 내역</div>
			{payments.map((payment, idx) => (
				<div key={payment.pid} className="card paymentCard">
					<div className="paymentCard__head">
						<span className="paymentCard__index">결제 {idx + 1}</span>
						{payments.length > 1 &&
						<button
							className="btn paymentCard__delete"
							aria-label="결제 삭제"
							onClick={() => handleDeletePayment(payment.pid)}>✕</button>
						}
					</div>
					<div className="paymentCard__row">
						<select
							className="field paymentCard__payer"
							value={payment.payer}
							onChange={(e) => handleSelectPayer(payment.pid, Number(e.target.value))}>
							{names.map((_, id) => (
								<option key={id} value={id}>{displayName(id)}</option>
							))}
						</select>
						<div className="moneyField">
							<input
								className="field"
								type="number"
								inputMode="numeric"
								placeholder="0"
								value={payment.money}
								autoComplete="off"
								onChange={(e) => handleChangeMoney(payment.pid, e.target.value)} />
							<span className="moneyField__unit">원</span>
						</div>
					</div>
					<div className="paymentCard__joinsLabel">함께한 사람</div>
					<div className="chips">
						{payment.joins.map((join, id) => (
							<button
								key={id}
								className={`btn chip${join ? ' chip--on' : ''}`}
								aria-pressed={join}
								onClick={() => handleToggleJoin(payment.pid, id)}>
								{displayName(id)}
							</button>
						))}
					</div>
				</div>
			))}

			<button className="btn addPayment" onClick={handleAddPayment}>
				＋ 결제 추가
			</button>

			<div className="submitArea">
				<button className="btn btn--primary" onClick={handleSubmit}>
					정산하기
				</button>
			</div>
		</div>
	);
}

export default Calculation;
