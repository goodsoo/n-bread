import { Link } from 'react-router-dom';
import './About.css';
import logo from '../images/logo_after.png';

function About() {
	return (
		<div className="page about">
			<img className="about__logo" src={logo} alt="빵" />
			<div className="card about__card">
				<b>N빵 (N-bread)</b>
				<p>
					정산할 때, 송금 한 번만 하고 싶어서 만들었어요.
				</p>
				<p className="about__meta">
					개발·꾸밈: 함창수<br />
					2021년 1월 처음 만듦 · 2026년 6월 다시 만듦
				</p>
			</div>
			<Link className="btn btn--ghost" to="/">
				홈으로
			</Link>
		</div>
	);
}

export default About;
