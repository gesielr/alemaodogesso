import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Clients from './pages/Clients';
import Vehicles from './pages/Vehicles';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { TransactionType } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [projectFilter, setProjectFilter] = useState('');

  // Persistência simples de login (Session Storage)
  useEffect(() => {
    const auth = sessionStorage.getItem('alemaodogesso_auth');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (phone: string, pass: string) => {
    // Credenciais específicas solicitadas pelo usuário
    const validPhone = '(48) 99635-2987';
    const validPass = 'resgatados2026';

    if (phone === validPhone && pass === validPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem('alemaodogesso_auth', 'true');
    } else {
      window.alert('Telefone ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('alemaodogesso_auth');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setProjectFilter('');
  };

  const handleViewClientProjects = (clientName: string) => {
    setProjectFilter(clientName);
    setCurrentPage('projects');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onViewAllProjects={() => handleNavigate('projects')} />;
      case 'projects':
        return <Projects initialSearchTerm={projectFilter} />;
      case 'inventory':
        return <Inventory />;
      case 'finance':
        return <Finance />;
      case 'finance-receivables':
        return <Finance filterType={TransactionType.RECEITA} />;
      case 'finance-payables':
        return <Finance filterType={TransactionType.DESPESA} />;
      case 'clients':
        return <Clients onViewProjects={handleViewClientProjects} />;
      case 'vehicles':
        return <Vehicles />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout activePage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
};

export default App;
