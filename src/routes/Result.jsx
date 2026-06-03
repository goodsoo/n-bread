import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './Result.css';
import logo from '../images/logo_after.png';
import { settle } from '../lib/settle.js';
import { decodeData, saveDraft } from '../lib/share.js';

function Result() {
	const [searchParams] = useSearchParams();
	const data = decodeData(searchParams.get('d') ?? '');

	/* 공유받은 URL 로 열어도 [수정하기] 가 동작하도록 draft 로 보존한다 */
	useEffect(() => {
		if (data)
			saveDraft(data);
	}, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

	/* 구버전은 /result 새로고침 시 크래시했다 — 데이터가 없으면 안내로 대신한다 */
	if (!data)
		return (
			<div className="container">
				<Link to="/">
					<img className="logoImage_small" src={logo} alt="빵" />
				</Link>
				<div className="title">앗</div>
				<div className="bodyText">정산할 내용을 찾지 못했어요.<br />정보를 다시 입력해 주세요.</div>
				<div className="navButton">
					<Link className="navButton__link" to="/calculation">
						정보 입력으로 ▶
					</Link>
				</div>
			</div>
		);

	const { names, payments } = data;
	const { balances, flows } = settle(names.length, payments);
	const isAllZero = flows.length === 0;

	const displayName = (id) => (names[id] === '' ? `사람${id + 1}` : names[id]);

	return (
		<div className="container">
			<Link to="/">
				<img className="logoImage_small" src={logo} alt="빵" />
			</Link>

			<div className="title">엔빵 완료!</div>
			<div className="payments">
				<div className="table__row">
					<span className="bodyText table__name">이름</span>
					<span className="bodyText table__pay">총 지불액</span>
				</div>
				{names.map((_, id) => (
					<div key={id} className="table__row">
						<div className="table__name whiteBox">{displayName(id)}</div>
						<div className="table__pay whiteBox">{balances[id]}</div>
					</div>
				))}
			</div>

			<div className="empty" />

			{isAllZero ?
			<div className="bodyText">정산할 게 없네요! 이렇게 깔끔할 수가!</div>
			:
			<div>
				<div className="bodyText">돈 보내주세요</div>
				<div className="moneyFlow">
					<div className="table__row">
						<span className="bodyText table__name">보내는 이</span>
						<span className="bodyText table__pay">금액</span>
						<span className="bodyText table__name">받는 이</span>
					</div>
					{flows.map((flow, idx) => (
						<div key={idx} className="table__row">
							<div className="table__name whiteBox">{displayName(flow.from)}</div>
							<div className="table__pay whiteBox">{flow.money}원</div>
							<div className="table__name whiteBox">{displayName(flow.to)}</div>
						</div>
					))}
				</div>
			</div>
			}
			<div className="empty" />

			<div className="navButton">
				<Link className="navButton__link" to="/calculation">
					◀ 수정하기
				</Link>
			</div>
		</div>
	);
}

export default Result;
