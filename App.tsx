import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Clients from './pages/Clients';
import Vehicles from './pages/Vehicles';
import Reports from './pages/Reports';
import { TransactionType } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [projectFilter, setProjectFilter] = useState('');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    // Clear filter when navigating manually to projects or other pages
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
      
      // Finance Routes
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

  return (
    <Layout activePage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
};

export default App;
