import { useState } from 'react';
import { Link } from 'react-router-dom';
import './History.css';
import logo from '../images/logo_after.png';
import { listHistory, removeHistory } from '../lib/history.js';

const won = (n) => `${(n ?? 0).toLocaleString('ko-KR')}원`;

/* 2026. 6. 4. 형태 — 목록에선 날짜만으로 충분하다 */
const formatDate = (ms) => {
	if (!ms)
		return '';
	try {
		return new Date(ms).toLocaleDateString('ko-KR');
	}
	catch {
		return '';
	}
};

function History() {
	/* 삭제 후 다시 그리기 위한 로컬 상태 — 기록은 localStorage 가 진실 */
	const [records, setRecords] = useState(() => listHistory());

	const handleRemove = (d) => {
		removeHistory(d);
		setRecords(listHistory());
	};

	return (
		<div className="page">
			<div className="topbar">
				<Link className="btn topbar__back" to="/" aria-label="홈으로">←</Link>
				<Link to="/">
					<img className="topbar__logo" src={logo} alt="빵" />
				</Link>
				<div className="topbar__title">지난 정산</div>
			</div>

			{records.length === 0 ?
			<div className="card historyEmpty">
				아직 정산 기록이 없어요.<br />첫 N빵을 시작해 보세요.
			</div>
			:
			<div className="historyList">
				{records.map((r) => (
					<div key={r.d} className="card historyItem">
						<Link className="historyItem__main" to={`/result?d=${r.d}`}>
							<div className="historyItem__top">
								<span className="historyItem__date">{formatDate(r.createdAt)}</span>
								<span className="historyItem__total">{won(r.total)}</span>
							</div>
							<div className="historyItem__meta">
								{r.peopleCount}명 · 송금 {r.flowCount}번
							</div>
						</Link>
						<button
							className="btn historyItem__remove"
							aria-label="기록 지우기"
							onClick={() => handleRemove(r.d)}>지우기</button>
					</div>
				))}
			</div>
			}

			<Link className="btn btn--primary historyCta" to="/calculation">
				새 N빵
			</Link>
		</div>
	);
}

export default History;
