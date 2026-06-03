import { Link } from 'react-router-dom';
import './Home.css';
import logo from '../images/logo.png';

function Home() {
	return (
		<div className="container">
			<img className="logoImage" src={logo} alt="빵" />
			<div className="bodyText">여러 명이 결제해도<br />
				<b>한 번의 송금</b>으로 정산을 완료하세요.</div>
			<div className="navButton">
				<Link className="navButton__link" to="/calculation">
					N빵하기
				</Link>
				<Link className="navButton__link" to="/about">
					만든이
				</Link>
			</div>
		</div>
	);
}

export default Home;
