import { HashRouter as Router } from 'react-router-dom';
import '../App.css';
import ScrollToTop from '../components/ScrollToTop';
import AppProviders from './providers/AppProviders';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <Router>
        <ScrollToTop />
        <div className="app-wrapper">
          <AppRoutes />
        </div>
      </Router>
    </AppProviders>
  );
}
