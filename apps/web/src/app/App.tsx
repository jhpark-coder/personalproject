import { HashRouter as Router } from 'react-router-dom';
import ScrollToTop from '../components/ScrollToTop';
import AppProviders from './providers/AppProviders';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <Router>
        <ScrollToTop />
        <div className="relative min-h-dvh w-full">
          <AppRoutes />
        </div>
      </Router>
    </AppProviders>
  );
}
