import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Component */}
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activePage={activePage}
        onNavigate={onNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) min-h-screen">
        {/* Header */}
        <header className="glass-effect h-20 flex items-center justify-between px-10 sticky top-0 z-20 border-b border-slate-200/40">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mr-4 p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl md:hidden transition-all"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {activePage === 'dashboard' ? 'Painel de Controle' : 
                 activePage.includes('finance') ? 'Gestão Financeira' :
                 activePage === 'projects' ? 'Obras e Projetos' :
                 activePage.charAt(0).toUpperCase() + activePage.slice(1)}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest mt-0.5">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-5">
             <button className="relative p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all group">
               <Bell size={20} className="transition-transform group-hover:rotate-12" />
               <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
             </button>
             
             <div className="w-px h-8 bg-slate-200/60"></div>
             
             <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">Alemão</p>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Online</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold shadow-sm">
                  <span className="text-xs">U</span>
                </div>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 lg:p-10">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;