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
  RefreshCcw
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
        api.getTransactions()
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
    loadData();
  }, [startDate, endDate]);

  const resetFilters = () => {
    setStartDate(defaultRange.start);
    setEndDate(defaultRange.end);
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Visao Geral</h1>
          <p className="text-gray-500 text-sm">Resumo financeiro e operacional estrategico</p>
        </div>

        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center text-gray-400 px-2">
            <Calendar size={18} className="mr-2" />
            <span className="text-xs font-bold uppercase tracking-wider">Filtrar Periodo</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-gray-400">ate</span>
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
          <RefreshCcw className="animate-spin mr-2" /> Carregando estatisticas...
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">Receita no Periodo</p>
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
                  <p className="text-sm font-medium text-gray-500">Despesas no Periodo</p>
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
                  <p className="text-sm font-medium text-gray-500">Resultado Liquido</p>
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
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center justify-between">
                <span>Fluxo de Caixa Comparativo</span>
                <span className="text-xs font-normal text-gray-400 uppercase tracking-tighter">Comparacao com meses anteriores</span>
              </h3>
              <div className="h-80">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">Nenhuma movimentacao encontrada.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `R$${value / 1000}k`} />
                      <Tooltip
                        cursor={{ fill: '#f3f4f6' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="receita" name="Receita" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

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
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                        ${project.status === ProjectStatus.EM_ANDAMENTO
                            ? 'bg-blue-100 text-blue-700'
                            : project.status === ProjectStatus.CONCLUIDO
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'}`}
                      >
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
