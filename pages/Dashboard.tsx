import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  HardHat,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCcw,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { DashboardStats, Project, ProjectStatus, Transaction, TransactionType } from '../types';

interface DashboardProps {
  onViewAllProjects?: () => void;
}

interface DateRange {
  start: string;
  end: string;
}

interface CashflowPoint {
  name: string;
  receita: number;
  despesa: number;
}

const getMonthBounds = (dateIso: string): DateRange => {
  const [yearText, monthText] = dateIso.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  const start = `${yearText}-${monthText}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${yearText}-${monthText}-${String(lastDay).padStart(2, '0')}`;

  return { start, end };
};

const formatMonthLabel = (monthKey: string) => {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit'
  });
};

const buildCashflowChart = (transactions: Transaction[]): CashflowPoint[] => {
  if (transactions.length === 0) return [];

  const grouped = new Map<string, { receita: number; despesa: number }>();

  for (const tx of transactions) {
    const monthKey = tx.date.slice(0, 7);
    const current = grouped.get(monthKey) ?? { receita: 0, despesa: 0 };
    const paid = Number(tx.paid_amount || 0);

    if (tx.type === TransactionType.RECEITA) {
      current.receita += paid;
    } else {
      current.despesa += paid;
    }

    grouped.set(monthKey, current);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, values]) => ({
      name: formatMonthLabel(monthKey),
      receita: values.receita,
      despesa: values.despesa
    }));
};

const Dashboard: React.FC<DashboardProps> = ({ onViewAllProjects }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [chartData, setChartData] = useState<CashflowPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [defaultRange, setDefaultRange] = useState<DateRange>({ start: firstDayOfMonth, end: today });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const initializeDefaultRange = async () => {
    setLoading(true);
    try {
      const transactions = await api.getTransactions();
      const latestTxDate = transactions.reduce<string | null>((latest, tx) => {
        if (!latest) return tx.date;
        return tx.date > latest ? tx.date : latest;
      }, null);

      const range = latestTxDate ? getMonthBounds(latestTxDate) : { start: firstDayOfMonth, end: today };
      setDefaultRange(range);
      setStartDate(range.start);
      setEndDate(range.end);
      setChartData(buildCashflowChart(transactions));
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    try {
      const [statsData, projectsData, transactionsData] = await Promise.all([
        api.getDashboard(startDate, endDate),
        api.getProjects(),
        api.getTransactions(startDate, endDate)
      ]);

      setStats(statsData);
      setRecentProjects(projectsData.slice(0, 5));
      setChartData(buildCashflowChart(transactionsData));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeDefaultRange();
  }, []);

  useEffect(() => {
    if (!startDate || !endDate) return;
    // O carregamento inicial agora é feito pelo initializeDefaultRange
  }, []);

  const resetFilters = () => {
    setStartDate(defaultRange.start);
    setEndDate(defaultRange.end);
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bem-vindo, Alemão!</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Seu resumo operacional e financeiro de hoje.</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center text-slate-400 px-3 py-1 bg-slate-50 rounded-xl">
            <Calendar size={16} className="mr-2 text-blue-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Período</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-300 font-bold">→</span>
            <input
              type="date"
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto ml-2">
            <button
              onClick={loadData}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm"
            >
              Buscar
            </button>
            <button
              onClick={resetFilters}
              className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Resetar Datas"
            >
              <RefreshCcw size={16} />
            </button>
            <button className="flex-1 sm:flex-none bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/20 active:scale-95">
              Refinar Busca
            </button>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-32 text-slate-400">
          <RefreshCcw className="animate-spin mr-3 text-blue-500" /> 
          <span className="font-semibold tracking-wide">Sincronizando dados...</span>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="premium-card p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Receita</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{formatBRL(stats.revenue)}</h3>
                </div>
                <div className="p-3 bg-green-500/10 text-green-600 rounded-xl">
                  <TrendingUp size={22} />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg">
                  <ArrowUpRight size={14} className="mr-1" />
                  <span>Crescimento</span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">No período</span>
              </div>
            </div>

            <div className="premium-card p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Despesas</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{formatBRL(stats.expenses)}</h3>
                </div>
                <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
                  <TrendingDown size={22} />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center text-xs text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg">
                  <ArrowDownRight size={14} className="mr-1" />
                  <span>Operacional</span>
                </div>
                <span className="text-[10px] text-slate-300 font-medium">{Math.round((stats.expenses / (stats.revenue || 1)) * 100)}% da receita</span>
              </div>
            </div>

            <div className="premium-card p-6 relative overflow-hidden group bg-slate-900">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl opacity-50" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Lucro Líquido</p>
                  <h3 className={`text-2xl font-extrabold tracking-tight ${stats.net_profit >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatBRL(stats.net_profit)}
                  </h3>
                </div>
                <div className="p-3 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/40">
                  <DollarSign size={22} />
                </div>
              </div>
              <div className="mt-6 flex items-center">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${Math.max(0, Math.min(100, (stats.net_profit / (stats.revenue || 1)) * 100))}%` }} 
                  />
                </div>
                <span className="ml-3 text-xs font-bold text-blue-400">{stats.revenue > 0 ? Math.round((stats.net_profit / stats.revenue) * 100) : 0}%</span>
              </div>
            </div>

            <div className="premium-card p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Operação</p>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{stats.active_projects} Obras</h3>
                </div>
                <div className="p-3 bg-orange-500/10 text-orange-600 rounded-xl">
                  <HardHat size={22} />
                </div>
              </div>
              <div className="mt-6">
                {stats.low_stock_items > 0 ? (
                  <div className="flex items-center gap-2 text-xs text-orange-600 font-bold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                    <AlertTriangle size={14} className="animate-pulse" />
                    <span>{stats.low_stock_items} alertas de estoque</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-lg">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span>Estoque Regular</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 premium-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Performance Financeira</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Fluxo de caixa comparativo (6 meses)</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                    <span className="text-slate-600">Receita</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-sm" />
                    <span className="text-slate-600">Despesa</span>
                  </div>
                </div>
              </div>
              
              <div className="h-[340px] w-full">
                {chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <RefreshCcw size={20} className="opacity-20" />
                    <p className="text-sm font-medium">Aguardando movimentações...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                        dy={15} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                        tickFormatter={(value) => `R$${value / 1000}k`} 
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          padding: '12px'
                        }}
                        itemStyle={{ fontWeight: 700, fontSize: '13px' }}
                        labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase' }}
                      />
                      <Bar dataKey="receita" name="Receita" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                      <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="premium-card p-8 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Obras Recentes</h3>
                <span className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                  <HardHat size={18} />
                </span>
              </div>
              
              <div className="space-y-3 flex-1">
                {recentProjects.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                     <p className="text-sm font-medium">Nenhuma obra ativa.</p>
                  </div>
                ) : recentProjects.map((project) => (
                  <div key={project.id} className="group p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors uppercase tracking-tight">{project.title}</h4>
                        <div className="flex items-center text-xs text-slate-500 font-medium">
                          <Users size={12} className="mr-1.5 opacity-60" />
                          {project.client_name}
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-tighter shadow-sm
                        ${project.status === ProjectStatus.EM_ANDAMENTO
                            ? 'bg-blue-500 text-white shadow-blue-500/20'
                            : project.status === ProjectStatus.CONCLUIDO
                              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                              : 'bg-slate-100 text-slate-600'}`}
                      >
                        {project.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={onViewAllProjects}
                className="w-full mt-6 bg-slate-50 text-slate-900 border border-slate-200 p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 active:scale-95"
              >
                Gerenciar Todas as Obras
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Dashboard;
