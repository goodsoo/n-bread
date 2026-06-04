import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Result.css';
import logo from '../images/logo_after.png';
import { computePersonBreakdown, settle } from '../lib/settle.js';
import { decodeData, saveDraft } from '../lib/share.js';
import { hasHistory } from '../lib/history.js';

const won = (n) => `${n.toLocaleString('ko-KR')}원`;

function Result() {
	const [searchParams] = useSearchParams();
	const [copied, setCopied] = useState(false);
	const [copyFailed, setCopyFailed] = useState(false);
	/* 각자 부담 정리에서 펼쳐 본 사람들 — "내가 어디에 얼마 썼나" 를 행 안에서 본다 */
	const [openRows, setOpenRows] = useState([]);
	const toggleRow = (id) =>
		setOpenRows((open) => (open.includes(id) ? open.filter((x) => x !== id) : [...open, id]));
	const d = searchParams.get('d') ?? '';
	const data = decodeData(d);

	/* 내 기록에 있는 d 면 내가 만든 정산(owner), 아니면 공유받은 것(viewer).
		 viewer 에게 [수정하기] 를 보여주지 않고, 열람만으로 viewer 의 draft 를
		 덮어쓰지 않는다 — draft 적재는 owner 가 [수정하기] 를 누르는 시점에만. */
	const isMine = hasHistory(d);

	/* 구버전은 /result 새로고침 시 크래시했다 — 데이터가 없으면 안내로 대신한다 */
	if (!data)
		return (
			<div className="page">
				<div className="topbar">
					<Link to="/">
						<img className="topbar__logo" src={logo} alt="빵" />
					</Link>
					<div className="topbar__title">앗</div>
				</div>
				<div className="card resultEmpty">
					정산할 내용을 찾지 못했어요.<br />정보를 다시 입력해 주세요.
				</div>
				<Link className="btn btn--primary" to="/calculation">
					정보 입력으로
				</Link>
			</div>
		);

	const { names, payments } = data;
	const { balances, flows } = settle(names.length, payments);
	const breakdown = computePersonBreakdown(payments, names.length);

	/* 입력 실수(금액 0)와 진짜 0원 정산을 구분한다 */
	const noAmount = !payments.some((payment) => Number(payment.money) > 0);

	/* 올림이 발생한 결제가 있으면 "왜 1,000원이 아니지?" 를 설명한다 */
	const hasRounding = payments.some((payment) => {
		const joinCount = payment.joins.filter(Boolean).length;
		const amount = Math.floor(Number(payment.money)) || 0;
		return joinCount > 0 && amount > 0 && amount % joinCount !== 0;
	});

	const displayName = (id) => (names[id] === '' ? `사람${id + 1}` : names[id]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(location.href);
			setCopied(true);
			setCopyFailed(false);
			setTimeout(() => setCopied(false), 1500);
		}
		catch {
			/* clipboard 권한이 없으면 직접 복사하도록 안내한다 */
			setCopyFailed(true);
		}
	};

	return (
		<div className="page">
			<div className="topbar">
				{/* owner 는 입력으로 돌아가고, 수신자(viewer)는 입력 이력이 없으니 홈으로 */}
				<Link className="btn topbar__back" to={isMine ? '/calculation' : '/'} aria-label="뒤로">←</Link>
				<Link to="/">
					<img className="topbar__logo" src={logo} alt="빵" />
				</Link>
				<div className="topbar__title">정산 결과</div>
			</div>

			{flows.length === 0 ?
			<div className="card resultEmpty">
				{noAmount ?
				<>정산할 금액이 없어요.<br />결제 금액을 입력해 주세요.</>
				:
				<>정산할 게 없네요! 이렇게 깔끔할 수가!</>}
			</div>
			:
			<>
				<div className="card__label card__label--section">
					이렇게 보내면 끝나요 — 송금 {flows.length}번
				</div>
				{flows.map((flow, idx) => (
					<div key={idx} className="card flowCard">
						<span className="flowCard__name">{displayName(flow.from)}</span>
						<span className="flowCard__arrow">
							<span className="flowCard__money">{won(flow.money)}</span>
							<span className="flowCard__line">⟶</span>
						</span>
						<span className="flowCard__name flowCard__name--to">{displayName(flow.to)}</span>
					</div>
				))}
				{hasRounding &&
				<div className="roundingNote">
					나누어 떨어지지 않는 금액은 올림했어요. 남는 돈은 결제한 사람이 받아요.
				</div>
				}
			</>
			}

			{!noAmount &&
			<>
				<div className="card__label card__label--section">각자 부담 정리</div>
				<div className="card balanceCard">
					{names.map((_, id) => {
						const b = breakdown[id];
						const hasDetail = b.consumed.length > 0 || b.paid.length > 0;
						const open = openRows.includes(id);
						return (
						<div key={id} className="balanceRow">
							{/* 행을 탭하면 그 사람이 어디에 얼마 썼고 무엇을 냈는지 펼친다 */}
							<button
								className="balanceRow__head"
								onClick={() => hasDetail && toggleRow(id)}
								aria-expanded={hasDetail ? open : undefined}
								disabled={!hasDetail}>
								<span className="balanceRow__name">{displayName(id)}</span>
								<span className="balanceRow__right">
									{balances[id] > 0 &&
									<span className="balanceRow__amount balanceRow__amount--send">{won(balances[id])} 보내요</span>
									}
									{balances[id] < 0 &&
									<span className="balanceRow__amount balanceRow__amount--receive">{won(-balances[id])} 받아요</span>
									}
									{balances[id] === 0 &&
									<span className="balanceRow__amount">정산 끝!</span>
									}
									{hasDetail &&
									<span className={`balanceRow__chevron${open ? ' balanceRow__chevron--open' : ''}`}>▾</span>
									}
								</span>
							</button>
							{open &&
							<div className="balanceDetail">
								{b.consumed.length > 0 &&
								<div className="balanceDetail__group">
									<div className="balanceDetail__label">쓴 내역</div>
									{b.consumed.map((it) => (
										<div key={`c${it.index}`} className="balanceDetail__row">
											<span className="balanceDetail__name">{it.label || `결제 ${it.index + 1}`}</span>
											<span className="balanceDetail__amount">{won(it.amount)}</span>
										</div>
									))}
								</div>
								}
								{b.paid.length > 0 &&
								<div className="balanceDetail__group">
									<div className="balanceDetail__label">낸 내역</div>
									{b.paid.map((it) => (
										<div key={`p${it.index}`} className="balanceDetail__row">
											<span className="balanceDetail__name">{it.label || `결제 ${it.index + 1}`}</span>
											<span className="balanceDetail__amount balanceDetail__amount--paid">{won(it.amount)}</span>
										</div>
									))}
								</div>
								}
							</div>
							}
						</div>
						);
					})}
				</div>
			</>
			}

			<div className="resultActions">
				{noAmount ?
				<Link className="btn btn--primary" to="/calculation">
					금액 입력하러 가기
				</Link>
				: isMine ?
				<>
					<button className="btn btn--primary" onClick={handleCopy}>
						{copied ? '복사했어요!' : '결과 링크 복사'}
					</button>
					{/* draft 적재는 이 클릭 시점에만 — 열람만으로는 덮어쓰지 않는다 */}
					<Link className="btn btn--ghost" to="/calculation" onClick={() => saveDraft(data)}>
						수정하기
					</Link>
				</>
				:
				<>
					<Link className="btn btn--primary" to="/calculation">
						나도 N빵 만들기
					</Link>
					<button className="btn btn--ghost" onClick={handleCopy}>
						{copied ? '복사했어요!' : '결과 링크 복사'}
					</button>
				</>
				}
				{copyFailed &&
				<div className="errorMsg">복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.</div>
				}
			</div>
		</div>
	);
}

export default Result;
