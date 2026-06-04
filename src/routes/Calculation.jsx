import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Calculation.css';
import logo from '../images/logo_before.png';
import { MAX_PEOPLE } from '../lib/settle.js';
import { encodeData, isSessionActive, loadDraft, saveDraft } from '../lib/share.js';

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

/* 복원을 권할 만큼 내용이 있는 draft 인가 */
const hasContent = (draft) =>
	draft !== null && (
		draft.names.some((name) => name !== '')
		|| draft.payments.some((payment) => Number(payment.money) > 0)
		|| draft.names.length > MIN_PEOPLE
		|| draft.payments.length > 1
	);

function Calculation() {
	const navigate = useNavigate();

	/* 같은 세션의 새로고침이면 조용히 복원하고,
		 새 방문에 지난 정산이 남아 있으면 깨끗하게 시작 + 배너로 제안만 한다 */
	const [init] = useState(() => {
		const draft = loadDraft();
		if (draft && isSessionActive())
			return { names: draft.names, payments: withPids(draft.payments), pending: null };
		return {
			names: ['', ''],
			payments: [newPayment(0, MIN_PEOPLE)],
			pending: hasContent(draft) ? draft : null,
		};
	});
	const [pendingDraft, setPendingDraft] = useState(init.pending);
	const [names, setNames] = useState(init.names);
	const [payments, setPayments] = useState(init.payments);
	const [peopleMsg, setPeopleMsg] = useState('');
	const [submitMsg, setSubmitMsg] = useState('');

	const number = names.length;

	/* 새로고침해도 입력이 날아가지 않도록 draft 를 보존한다.
		 단, 복원 배너가 떠 있는 동안은 지난 draft 를 덮어쓰지 않는다. */
	useEffect(() => {
		if (pendingDraft)
			return;
		saveDraft({
			names,
			payments: payments.map(({ payer, money, joins }) => ({ payer, money, joins })),
		});
	}, [names, payments, pendingDraft]);

	/* 배너를 둔 채 입력을 시작하면 "새로 시작" 을 고른 것으로 본다 */
	const touch = () => {
		if (pendingDraft)
			setPendingDraft(null);
	};

	const handleRestoreDraft = () => {
		setNames(pendingDraft.names);
		setPayments(withPids(pendingDraft.payments));
		setPendingDraft(null);
	};

	const handleDismissDraft = () => {
		setPendingDraft(null);
	};

	const handleAddPerson = () => {
		if (number >= MAX_PEOPLE) {
			setPeopleMsg(`죄송해요, ${MAX_PEOPLE}명까지만 지원해요.`);
			return;
		}
		setNames([...names, '']);
		setPayments(payments.map((payment) =>
			({ ...payment, joins: [...payment.joins, true] })));
		setPeopleMsg('');
		touch();
	};

	const handleRemovePerson = (id) => {
		if (number <= MIN_PEOPLE) {
			setPeopleMsg('혼자서 정산을..?');
			return;
		}
		setNames(names.filter((_, i) => i !== id));
		setPayments(payments.map((payment) => {
			const joins = payment.joins.filter((_, i) => i !== id);
			/* 적어도 한 명은 N빵 대상이어야 한다 */
			if (!joins.some(Boolean))
				joins[0] = true;
			/* 삭제된 사람을 가리키던 결제자 참조를 재매핑한다 */
			let payer = payment.payer;
			if (payer === id)
				payer = 0;
			else if (payer > id)
				payer -= 1;
			return { ...payment, joins, payer };
		}));
		setPeopleMsg('');
		touch();
	};

	const handleChangeName = (id, value) => {
		setNames(names.map((name, i) => (i === id ? value : name)));
		touch();
	};

	const handleChangeMoney = (pid, value) => {
		setPayments(payments.map((payment) =>
			payment.pid === pid ? { ...payment, money: value } : payment));
		setSubmitMsg('');
		touch();
	};

	const handleSelectPayer = (pid, payer) => {
		setPayments(payments.map((payment) =>
			payment.pid === pid ? { ...payment, payer } : payment));
		touch();
	};

	const handleToggleJoin = (pid, personId) => {
		setPayments(payments.map((payment) => {
			if (payment.pid !== pid)
				return payment;
			const joins = payment.joins.map((join, i) => (i === personId ? !join : join));
			/* 적어도 한 명은 N빵 대상이어야 한다 */
			return joins.some(Boolean) ? { ...payment, joins } : payment;
		}));
		touch();
	};

	const handleAddPayment = () => {
		const nextPid = payments[payments.length - 1].pid + 1;
		setPayments([...payments, newPayment(nextPid, number)]);
		touch();
	};

	const handleDeletePayment = (pid) => {
		/* 하나 남은 항목은 없앨 수 없다 */
		if (payments.length === 1)
			return;
		setPayments(payments.filter((payment) => payment.pid !== pid));
	};

	const handleSubmit = () => {
		/* 입력 실수를 결과 화면("정산할 게 없네요")으로 보내지 않는다 */
		if (!payments.some((payment) => Number(payment.money) > 0)) {
			setSubmitMsg('결제 금액을 입력해 주세요.');
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
		<div className="page">
			<div className="topbar">
				<Link to="/">
					<img className="topbar__logo" src={logo} alt="빵" />
				</Link>
				<div className="topbar__title">누가 얼마 냈나요?</div>
			</div>

			{/* 지난 정산 복원 배너 */}
			{pendingDraft &&
			<div className="draftBanner">
				<span className="draftBanner__text">지난 정산이 남아 있어요</span>
				<div className="draftBanner__actions">
					<button className="btn draftBanner__restore" onClick={handleRestoreDraft}>
						이어하기
					</button>
					<button className="btn draftBanner__dismiss" onClick={handleDismissDraft}>
						새로 시작
					</button>
				</div>
			</div>
			}

			{/* 사람 */}
			<div className="card">
				<div className="card__head">
					<span className="card__label">누가 함께했나요?</span>
					<span className="card__count">{number}명</span>
				</div>
				<div className="personList">
					{names.map((name, id) => (
						<div key={id} className="personRow">
							<input
								className="field"
								placeholder={`사람${id + 1}`}
								autoComplete="off"
								value={name}
								onChange={(e) => handleChangeName(id, e.target.value)} />
							<button
								className="btn personRow__remove"
								aria-label={`${displayName(id)} 빼기`}
								onClick={() => handleRemovePerson(id)}>✕</button>
						</div>
					))}
				</div>
				<button className="btn addInline" onClick={handleAddPerson}>
					＋ 사람 추가
				</button>
				{peopleMsg && <div className="errorMsg">{peopleMsg}</div>}
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
						<label className="fieldGroup">
							<span className="fieldGroup__label">누가 냈나요?</span>
							<select
								className="field paymentCard__payer"
								value={payment.payer}
								onChange={(e) => handleSelectPayer(payment.pid, Number(e.target.value))}>
								{names.map((_, id) => (
									<option key={id} value={id}>{displayName(id)}</option>
								))}
							</select>
						</label>
						<label className="fieldGroup">
							<span className="fieldGroup__label">얼마였나요?</span>
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
						</label>
					</div>
					<div className="paymentCard__joinsLabel">누구끼리 N빵하나요?</div>
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
				{submitMsg && <div className="errorMsg">{submitMsg}</div>}
			</div>
		</div>
	);
}

export default Calculation;
