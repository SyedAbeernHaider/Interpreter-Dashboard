import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Dashboard } from './pages/Dashboard';
import { Interpreters } from './pages/Interpreters';
import { InterpreterDetails } from './pages/InterpreterDetails';
import { Customers } from './pages/Customers';
import { CustomerDetails } from './pages/CustomerDetails';
import { MissedCalls } from './pages/MissedCalls';
import { Companies } from './pages/Companies';
import { CompanyDetails } from './pages/CompanyDetails';
import { PendingCalls } from './pages/PendingCalls';
import './index.css';

function App() {
  return (
    <Router>
      <div className="layout">
        <Sidebar />
        <div className="main-content">
          <Topbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/interpreters" element={<Interpreters />} />
            <Route path="/interpreters/:id" element={<InterpreterDetails />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
            <Route path="/missed-calls" element={<MissedCalls />} />
            <Route path="/pending-calls" element={<PendingCalls />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:id" element={<CompanyDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
