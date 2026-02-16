
import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, HardHat, AlertTriangle, ArrowUpRight, ArrowDownRight, Calendar, RefreshCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { DashboardStats, Project, ProjectStatus } from '../types';

interface DashboardProps {
  onViewAllProjects?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewAllProjects }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  const loadData = async () => {
    setLoading(true);
    const [statsData, projectsData] = await Promise.all([
      api.getDashboard(startDate, endDate),
      api.getProjects()
    ]);
    setStats(statsData);
    setRecentProjects(projectsData.slice(0, 5));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const resetFilters = () => {
    setStartDate(firstDayOfMonth);
    setEndDate(today);
  };

  // Formatting currency
  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Mock data for chart - using stats if dates match current month or just dynamic sample
  const chartData = [
    { name: 'Jan', receita: 12000, despesa: 8000 },
    { name: 'Fev', receita: 15000, despesa: 9500 },
    { name: 'Mar', receita: 18000, despesa: 7000 },
    { name: 'Abr', receita: 11000, despesa: 12000 },
    { name: 'Período Selecionado', receita: stats?.revenue || 0, despesa: stats?.expenses || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>
          <p className="text-gray-500 text-sm">Resumo financeiro e operacional estratégico</p>
        </div>
        
        {/* Date Filter Bar */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center text-gray-400 px-2">
                <Calendar size={18} className="mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider">Filtrar Período</span>
            </div>
            <div className="flex items-center gap-2">
                <input 
                    type="date" 
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-gray-400">até</span>
                <input 
                    type="date" 
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <button 
                    onClick={resetFilters}
                    className="flex-1 sm:flex-none p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Resetar Datas"
                >
                    <RefreshCcw size={18} />
                </button>
                <button className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                    Exportar
                </button>
            </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCcw className="animate-spin mr-2" /> Carregando estatísticas...
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Receita no Período</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatBRL(stats.revenue)}</h3>
                </div>
                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600">
                <ArrowUpRight size={16} className="mr-1" />
                <span className="font-medium">Atualizado</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Despesas no Período</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatBRL(stats.expenses)}</h3>
                </div>
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <TrendingDown size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-red-600">
                <ArrowDownRight size={16} className="mr-1" />
                <span className="font-medium">Consolidado</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Resultado Líquido</p>
                  <h3 className={`text-2xl font-bold mt-1 ${stats.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatBRL(stats.net_profit)}
                  </h3>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <span className="text-gray-400">Margem: </span>
                <span className="font-medium ml-1 text-gray-700">{stats.revenue > 0 ? Math.round((stats.net_profit / stats.revenue) * 100) : 0}%</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Obras Ativas</p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.active_projects}</h3>
                </div>
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                  <HardHat size={20} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-orange-600">
                {stats.low_stock_items > 0 && (
                  <>
                    <AlertTriangle size={16} className="mr-1" />
                    <span className="font-medium">{stats.low_stock_items} Itens</span>
                    <span className="text-gray-400 ml-2">baixo estoque</span>
                  </>
                )}
                {stats.low_stock_items === 0 && <span className="text-gray-400">Estoque OK</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-between">
                <span>Fluxo de Caixa Comparativo</span>
                <span className="text-xs font-normal text-gray-400 uppercase tracking-tighter">Comparação com Meses Anteriores</span>
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar dataKey="receita" name="Receita" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Projects List */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Obras Recentes</h3>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-200">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{project.title}</h4>
                      <p className="text-xs text-gray-500">{project.client_name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${project.status === ProjectStatus.EM_ANDAMENTO ? 'bg-blue-100 text-blue-700' : 
                          project.status === ProjectStatus.CONCLUIDO ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-700'}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={onViewAllProjects}
                  className="w-full mt-2 text-sm text-blue-600 font-bold hover:text-blue-800 text-center py-2 bg-blue-50 rounded-lg transition"
                >
                  Ver todas as obras
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
