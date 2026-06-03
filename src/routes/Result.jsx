import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Result.css';
import logo from '../images/logo_after.png';
import { settle } from '../lib/settle.js';
import { decodeData, saveDraft } from '../lib/share.js';

const won = (n) => `${n.toLocaleString('ko-KR')}원`;

function Result() {
	const [searchParams] = useSearchParams();
	const [copied, setCopied] = useState(false);
	const data = decodeData(searchParams.get('d') ?? '');

	/* 공유받은 URL 로 열어도 [수정하기] 가 동작하도록 draft 로 보존한다 */
	useEffect(() => {
		if (data)
			saveDraft(data);
	}, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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

	const displayName = (id) => (names[id] === '' ? `사람${id + 1}` : names[id]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(location.href);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		}
		catch {
			/* clipboard 권한이 없으면 조용히 무시 */
		}
	};

	return (
		<div className="page">
			<div className="topbar">
				<Link to="/">
					<img className="topbar__logo" src={logo} alt="빵" />
				</Link>
				<div className="topbar__title">엔빵 완료!</div>
			</div>

			{flows.length === 0 ?
			<div className="card resultEmpty">정산할 게 없네요! 이렇게 깔끔할 수가!</div>
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
			</>
			}

			<div className="card__label card__label--section">정산 내역</div>
			<div className="card balanceCard">
				{names.map((_, id) => (
					<div key={id} className="balanceRow">
						<span className="balanceRow__name">{displayName(id)}</span>
						{balances[id] > 0 &&
						<span className="balanceRow__amount balanceRow__amount--send">{won(balances[id])} 보내요</span>
						}
						{balances[id] < 0 &&
						<span className="balanceRow__amount balanceRow__amount--receive">{won(-balances[id])} 받아요</span>
						}
						{balances[id] === 0 &&
						<span className="balanceRow__amount">정산 끝!</span>
						}
					</div>
				))}
			</div>

			<div className="resultActions">
				<button className="btn btn--primary" onClick={handleCopy}>
					{copied ? '복사했어요!' : '결과 링크 복사'}
				</button>
				<Link className="btn btn--ghost" to="/calculation">
					수정하기
				</Link>
			</div>
		</div>
	);
}

export default Result;
