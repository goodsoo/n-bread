import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './routes/Home.jsx';
import About from './routes/About.jsx';
import Calculation from './routes/Calculation.jsx';
import Result from './routes/Result.jsx';
import './App.css';

/* 구버전(gh-pages)과 같은 #/ URL 구조를 유지한다 */
function App() {
	return (
		<HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/about" element={<About />} />
				<Route path="/calculation" element={<Calculation />} />
				<Route path="/result" element={<Result />} />
			</Routes>
		</HashRouter>
	);
}

export default App;
