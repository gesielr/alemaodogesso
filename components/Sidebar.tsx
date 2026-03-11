import React, { useState } from 'react';
import { LayoutDashboard, HardHat, Package, Users, Truck, DollarSign, FileText, X, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import brandLogo from '../src/assets/Gemini_Generated_Image_l0vw5al0vw5al0vw23-removebg-preview.png';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar, activePage, onNavigate }) => {
  // State to track expanded menus. Initially, expand finance if active page is related.
  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    activePage.startsWith('finance') ? 'finance' : null
  );

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Obras', icon: HardHat },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { 
      id: 'finance', 
      label: 'Financeiro', 
      icon: DollarSign,
      subItems: [
        { id: 'finance', label: 'Visão Geral' },
        { id: 'finance-receivables', label: 'Contas a Receber' },
        { id: 'finance-payables', label: 'Contas a Pagar' },
      ]
    },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'vehicles', label: 'Veículos', icon: Truck },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const handleMenuClick = (itemId: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      setExpandedMenu(expandedMenu === itemId ? null : itemId);
    } else {
      onNavigate(itemId);
      if (window.innerWidth < 768) toggleSidebar();
    }
  };

  const handleSubMenuClick = (subItemId: string) => {
    onNavigate(subItemId);
    if (window.innerWidth < 768) toggleSidebar();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-slate-900/98 backdrop-blur-2xl text-white transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col border-r border-white/5 shadow-2xl animate-fade-in`}>
        
        {/* Logo Section */}
        <div className="p-8 pb-6 flex items-center justify-between">
          <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl w-full flex items-center justify-center overflow-hidden shadow-lg shadow-black/20 group transition-transform hover:scale-[1.02]">
             <img 
               src={brandLogo}
               alt="Alemão do Gesso" 
               className="h-12 w-auto object-contain transition-transform group-hover:scale-110"
             />
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white ml-2 p-2 rounded-full hover:bg-white/10 transition">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-2">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
        </div>

        <nav className="mt-4 px-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id || (item.subItems && item.subItems.some(sub => sub.id === activePage));
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id} className="relative">
                {isActive && !item.subItems && (
                  <div className="absolute left-0 top-1 bottom-1 w-1 bg-blue-500 rounded-r-full shadow-[0_0_15px_rgba(37,99,235,0.8)]" />
                )}
                
                <button
                  onClick={() => handleMenuClick(item.id, !!item.subItems)}
                  className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl transition-all duration-300 group ${
                    isActive && !item.subItems
                      ? 'bg-blue-600/10 text-white' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                   }`}
                >
                  <div className="flex items-center">
                    <div className={`p-2 rounded-xl mr-3 transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-800 group-hover:text-white'}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`font-bold tracking-tight text-sm transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{item.label}</span>
                  </div>
                  {item.subItems && (
                    <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={14} className={isActive ? 'text-blue-400' : 'text-slate-600'} />
                    </div>
                  )}
                </button>

                {/* Sub-menu items */}
                {item.subItems && isExpanded && (
                  <div className="mt-1 ml-11 space-y-1 border-l border-white/5 pl-3 animate-in fade-in slide-in-from-top-1 duration-300">
                    {item.subItems.map((sub) => {
                      const isSubActive = activePage === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubMenuClick(sub.id)}
                          className={`flex items-center w-full px-4 py-2.5 rounded-lg text-[13px] transition-all duration-200 ${
                            isSubActive
                              ? 'text-blue-400 font-semibold bg-blue-500/5'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          {sub.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900 border border-white/5 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-blue-600/20">
                  AD
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-slate-900 ring-1 ring-white/10" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">Alemão</p>
                <p className="text-[11px] text-blue-400 font-medium uppercase tracking-wider">Administrador</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
