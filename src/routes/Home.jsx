import { Link } from 'react-router-dom';
import './Home.css';
import logo from '../images/logo.png';
import { listHistory } from '../lib/history.js';
import { endSession } from '../lib/share.js';

function Home() {
	const hasHistory = listHistory().length > 0;

	return (
		<div className="page home">
			<img className="home__logo" src={logo} alt="N빵" />
			<h1 className="home__headline">
				여러 명이 결제해도<br />
				<em>한 번의 송금</em>으로
			</h1>
			<p className="home__sub">
				누가 누구에게 얼마를 보내야 하는지,<br />
				가장 적은 송금 횟수로 계산해 드려요.
			</p>
			<div className="home__actions">
				{/* 새 정산 의도 — 같은 탭이어도 조용히 복원하지 않고 배너로 제안만 하게 세션 종료 */}
				<Link className="btn btn--primary" to="/calculation" onClick={endSession}>
					N빵하기
				</Link>
				{hasHistory &&
				<Link className="btn btn--ghost" to="/history">
					지난 정산
				</Link>
				}
				<Link className="btn btn--ghost" to="/about">
					만든이
				</Link>
			</div>
		</div>
	);
}

export default Home;
