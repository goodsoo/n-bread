import { Link } from 'react-router-dom';
import './About.css';
import logo from '../images/logo_after.png';

function About() {
	return (
		<div className="container">
			<img className="logoImage" src={logo} alt="빵" />
			<div className="bodyText">
				개발: 함창수<br />
				꾸밈: 함창수<br /><br />
				<b>N빵 (N-bread)</b><br /><br />
				정산할 때, 송금 한 번만 하고 싶어서 만들었어요.<br /><br />
				2021년 1월 6일 처음 만듦<br />
				2026년 6월 다시 만듦
			</div>
			<div className="navButton">
				<Link className="navButton__link" to="/">
					홈으로
				</Link>
			</div>
		</div>
	);
}

export default About;
