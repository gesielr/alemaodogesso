import React, { useState } from 'react';
import { LayoutDashboard, HardHat, Package, Users, Truck, DollarSign, FileText, X, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';

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
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        
        {/* Logo Section */}
        <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="bg-white p-2 rounded-lg w-full flex items-center justify-center overflow-hidden">
             <img 
               src="https://media.discordapp.net/attachments/1314589251834155018/1346213710776733807/alemao.PNG?ex=67c762fe&is=67c6117e&hm=61623910c2c31c0337c7625805562d515a452a22530dfb39d10e083c65df516f&=&format=webp&quality=lossless" 
               alt="Alemão do Gesso" 
               className="h-10 w-auto object-contain"
             />
          </div>
          <button onClick={toggleSidebar} className="md:hidden text-slate-400 hover:text-white ml-2">
            <X size={24} />
          </button>
        </div>

        <nav className="mt-6 px-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Check if this main item is active OR if one of its children is active
            const isActive = activePage === item.id || (item.subItems && item.subItems.some(sub => sub.id === activePage));
            const isExpanded = expandedMenu === item.id;

            return (
              <div key={item.id}>
                <button
                  onClick={() => handleMenuClick(item.id, !!item.subItems)}
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon size={20} className={`mr-3 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                    <span className="font-medium tracking-wide">{item.label}</span>
                  </div>
                  {item.subItems && (
                    isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>

                {/* Sub-menu items */}
                {item.subItems && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l border-slate-700 pl-2 animate-in slide-in-from-top-2 duration-200">
                    {item.subItems.map((sub) => {
                      const isSubActive = activePage === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubMenuClick(sub.id)}
                          className={`flex items-center w-full px-4 py-2 rounded-md text-sm transition-all duration-200 ${
                            isSubActive
                              ? 'text-blue-400 font-semibold bg-slate-800/50'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                          }`}
                        >
                          {isSubActive && <ArrowRight size={12} className="mr-2" />}
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

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3 bg-slate-800 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white ring-2 ring-slate-700">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-white">Alemão</p>
              <p className="text-xs text-slate-400">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;