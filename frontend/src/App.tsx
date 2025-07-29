import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import MemberForm from './components/MemberForm';
import SignupForm from './components/SignupForm';
import OAuth2Callback from './components/OAuth2Callback';
import OAuth2Success from './components/OAuth2Success';
import OAuth2Failure from './components/OAuth2Failure';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<MemberForm />} />
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/auth/:provider/callback" element={<OAuth2Callback />} />
        <Route path="/auth/success" element={<OAuth2Success />} />
        <Route path="/auth/failure" element={<OAuth2Failure />} />
        <Route path="/" element={<MemberForm />} />
      </Routes>
    </Router>
  );
}

export default App;
