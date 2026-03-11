import React, { useEffect, useState } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Filter, 
  Loader, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Edit, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Calendar, 
  Search,
  RefreshCcw,
  Tag,
  ChevronRight,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Save
} from 'lucide-react';
import { api } from '../services/api';
import { Transaction, TransactionType, Project, ProjectCost } from '../types';
import Modal from '../components/Modal';

interface FinanceProps {
  filterType?: TransactionType;
}

const Finance: React.FC<FinanceProps> = ({ filterType }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projectCosts, setProjectCosts] = useState<ProjectCost[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // Modal State for New/Edit Transaction
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    description: '',
    amount: undefined,
    paid_amount: undefined,
    type: filterType || TransactionType.DESPESA,
    category: 'Outros',
    date: new Date().toISOString().split('T')[0],
    status: 'Pago',
    project_id: ''
  });

  // Modal State for Settle (Baixa)
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [settleData, setSettleData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });
  const [settling, setSettling] = useState(false);

  const [period, setPeriod] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    void fetchTransactions();
    void fetchProjects();
    void fetchProjectCosts();
    // Reset newTx default type if filterType changes
    if (filterType) {
      setNewTx(prev => ({ ...prev, type: filterType }));
    }
  }, [filterType]);

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Erro ao buscar obras:', error);
    }
  };

  const fetchProjectCosts = async () => {
    try {
      const allProjects = await api.getProjects();
      const costsPromises = allProjects.map(p => api.getProjectCosts(p.id));
      const allCostsArrays = await Promise.all(costsPromises);
      setProjectCosts(allCostsArrays.flat());
    } catch (error) {
      console.error('Erro ao buscar custos de obras:', error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions();
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNewTx({
      description: '',
      amount: undefined,
      paid_amount: undefined,
      type: filterType || TransactionType.DESPESA,
      category: 'Outros',
      date: new Date().toISOString().split('T')[0],
      status: 'Pago',
      project_id: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setNewTx({ ...tx });
    setIsModalOpen(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = Number(newTx.amount || 0);
    const paidAmount = Number(newTx.paid_amount || 0);
    const txToSave = {
      ...newTx,
      amount: totalAmount,
      paid_amount: newTx.status === 'Pago' ? totalAmount : paidAmount
    };

    if (editingId) {
      await api.updateTransaction({ ...txToSave, id: editingId } as Transaction);
    } else {
      await api.addTransaction(txToSave as Transaction);
    }

    void fetchTransactions();
    setIsModalOpen(false);
    setEditingId(null);
    setNewTx({
      description: '',
      amount: undefined,
      paid_amount: undefined,
      type: filterType || TransactionType.DESPESA,
      category: 'Outros',
      date: new Date().toISOString().split('T')[0],
      status: 'Pago',
      project_id: ''
    });
  };

  const handleOpenSettle = (tx: Transaction) => {
    setSelectedTx(tx);
    const remaining = tx.amount - (tx.paid_amount || 0);
    setSettleData({
      amount: remaining,
      date: new Date().toISOString().split('T')[0]
    });
    setIsSettleModalOpen(true);
  };

  const handleSettleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    setSettling(true);

    try {
      await api.addTransactionSettlement(selectedTx.id, Number(settleData.amount), settleData.date);
      void fetchTransactions();
      setIsSettleModalOpen(false);
      setSelectedTx(null);
    } finally {
      setSettling(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  
  const formatMoney = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

  const getFilteredData = () => {
    const today = new Date();
    let start: Date, end: Date;

    if (period === 'THIS_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (period === 'LAST_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      start = customRange.start ? new Date(customRange.start) : new Date(0);
      end = customRange.end ? new Date(customRange.end) : new Date();
    }

    const startIso = start.toISOString().split('T')[0];
    const endIso = end.toISOString().split('T')[0];

    const filteredTx = (filterType ? transactions.filter(t => t.type === filterType) : transactions)
      .filter(t => t.date >= startIso && t.date <= endIso)
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredCosts = projectCosts.filter(c => c.date >= startIso && c.date <= endIso);

    return { filteredTx, filteredCosts };
  };

  const { filteredTx, filteredCosts } = getFilteredData();

  const receitasTotais = filteredTx.filter(t => t.type === TransactionType.RECEITA).reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const receitasPendentes = filteredTx.filter(t => t.type === TransactionType.RECEITA).reduce((acc, curr) => acc + (curr.amount - (curr.paid_amount || 0)), 0);
  const despesasTotais = filteredTx.filter(t => t.type === TransactionType.DESPESA).reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);
  const despesasPendentes = filteredTx.filter(t => t.type === TransactionType.DESPESA).reduce((acc, curr) => acc + (curr.amount - (curr.paid_amount || 0)), 0);
  const totalCosts = filteredCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  
  // Para compatibilidade com os cards premium
  const despesasTotaisComCustos = despesasTotais + totalCosts;

  const getPageTitle = () => {
    if (filterType === TransactionType.RECEITA) return 'Contas a Receber';
    if (filterType === TransactionType.DESPESA) return 'Contas a Pagar';
    return 'Financeiro Central';
  };

  const getActionLabel = () => {
    return 'Baixar';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{getPageTitle()}</h1>
          <p className="text-slate-500 mt-1 font-medium italic">
            {filterType ? `Monitoramento e gestão de ${filterType === TransactionType.RECEITA ? 'entradas' : 'saídas'} de capital.` : 'Visão panorâmica do fluxo de caixa operacional.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center">
          <select
            className="w-full sm:w-auto bg-white border border-slate-200 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 outline-none transition-all shadow-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="THIS_MONTH">Este Mês</option>
            <option value="LAST_MONTH">Mês Passado</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
          {period === 'CUSTOM' && (
            <div className="flex gap-2 items-center">
              <input type="date" className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} />
              <span className="text-slate-300 font-bold">→</span>
              <input type="date" className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} />
            </div>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
             <button className="flex-1 sm:flex-none flex items-center bg-white border border-slate-200 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/50 transition-all active:scale-95">
               <Download size={16} className="mr-2 text-blue-500" /> Exportar
             </button>
             <button 
               onClick={handleOpenAddModal}
               className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center"
              >
               <Plus size={16} className="mr-2" /> Novo Registro
             </button>
          </div>
        </div>
      </div>
      {/* Stats Cards Dashboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(!filterType || filterType === TransactionType.RECEITA) && (
            <>
              <div className="premium-card p-6 bg-emerald-50/50 border-emerald-100/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Recebido</p>
                <h3 className="text-2xl font-black text-emerald-900 tracking-tighter">{formatMoney(receitasTotais)}</h3>
                <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500 bg-white/60 w-fit px-2 py-1 rounded-lg border border-emerald-100">
                  <ArrowUpRight size={12} className="mr-1" /> Fluxo de Entrada
                </div>
              </div>

              <div className="premium-card p-6 border-emerald-100/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">A Receber</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatMoney(receitasPendentes)}</h3>
                <div className="mt-4 flex items-center text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                  <Clock size={12} className="mr-1" /> Aguardando Liquidação
                </div>
              </div>
            </>
          )}
          
          {(!filterType || filterType === TransactionType.DESPESA) && (
            <>
              <div className="premium-card p-6 bg-rose-50/50 border-rose-100/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors" />
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5">Pago (Tx + Obras)</p>
                <h3 className="text-2xl font-black text-rose-900 tracking-tighter">{formatMoney(despesasTotaisComCustos)}</h3>
                <div className="mt-4 flex items-center text-[10px] font-bold text-rose-500 bg-white/60 w-fit px-2 py-1 rounded-lg border border-rose-100">
                  <ArrowDownRight size={12} className="mr-1" /> Fluxo de Saída
                </div>
              </div>

              <div className="premium-card p-6 border-rose-100/30 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">A Pagar</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{formatMoney(despesasPendentes)}</h3>
                <div className="mt-4 flex items-center text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                  <AlertCircle size={12} className="mr-1" /> Contas Pendentes
                </div>
              </div>
            </>
          )}
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-slate-900 tracking-tight shrink-0">Movimentações</h3>
            <div className="flex items-center bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
              {filteredTx.length} registros
            </div>
          </div>
          
          <div className="flex flex-1 max-w-2xl gap-3">
            <div className="relative flex-1 group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar por descrição ou categoria..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all active:scale-95 shadow-sm">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Identificação</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5 text-center">Status</th>
                <th className="px-8 py-5 text-right">Valor Consolidado</th>
                <th className="px-8 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr>
                   <td colSpan={6} className="text-center py-20 text-slate-400">
                     <RefreshCcw className="animate-spin mx-auto mb-4 text-blue-500" size={32} />
                     <span className="text-xs font-black uppercase tracking-widest">Sincronizando Fluxo...</span>
                   </td>
                 </tr>
              ) : filteredTx.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="text-center py-20 text-slate-400 italic font-medium">Nenhum registro encontrado no Almoxarifado Digital.</td>
                 </tr>
              ) : filteredTx.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{formatDate(t.date)}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Competência</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{t.description}</span>
                      {t.project_id && (
                        <div className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-0.5" title="Obra vinculada">
                           <Save size={10} /> Obra: {projects.find(p => p.id === t.project_id)?.title || 'Desconhecida'}
                        </div>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                        <Tag size={10} /> ID: {t.id.slice(0, 8)}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 bg-slate-100/80 uppercase tracking-tighter border border-slate-100">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm
                          ${t.status === 'Pago' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            t.status === 'Parcial' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {t.status}
                      </span>
                      {t.status === 'Parcial' && (
                          <div className="w-16 bg-slate-100 rounded-full h-1 relative overflow-hidden">
                              <div className="absolute inset-0 bg-blue-500 transition-all duration-1000" style={{ width: `${((t.paid_amount || 0) / t.amount) * 100}%` }}></div>
                          </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-base font-black tracking-tighter ${t.type === TransactionType.RECEITA ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === TransactionType.RECEITA ? '+' : '-'}{formatMoney(t.amount)}
                      </span>
                      {t.status !== 'Pago' && (
                           <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-1">
                                Liquidação: <span className="text-blue-500">{formatMoney(t.paid_amount || 0)}</span>
                           </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg shadow-sm transition-all active:scale-95"
                            title="Editar Dados"
                        >
                            <Edit size={16} />
                        </button>
                        {t.status !== 'Pago' && (
                            <button 
                                onClick={() => handleOpenSettle(t)}
                                className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:shadow-lg shadow-sm transition-all active:scale-95"
                                title={t.type === TransactionType.RECEITA ? "Receber Valor" : "Pagar Valor"}
                            >
                                <CheckCircle size={16} />
                            </button>
                        )}
                        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                           <MoreVertical size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal - Enhanced */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Ajuste de Movimentação" : "Lançamento de Caixa"}>
        <form onSubmit={handleSaveTx} className="space-y-6 pb-2">
          <div className="space-y-4 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Descrição do Lançamento</label>
              <input 
                required
                type="text" 
                placeholder="Ex: Aquisição de gesso acartonado - Obra XPTO"
                className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900"
                value={newTx.description}
                onChange={e => setNewTx({...newTx, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Natureza do Fluxo</label>
                  <select 
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900 cursor-pointer"
                      value={newTx.type}
                      onChange={e => setNewTx({...newTx, type: e.target.value as TransactionType})}
                      disabled={!!filterType}
                  >
                      <option value={TransactionType.RECEITA}>Receita (Entrada +)</option>
                      <option value={TransactionType.DESPESA}>Despesa (Saída -)</option>
                  </select>
               </div>
               <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Valor do Título (R$)</label>
                  <div className="relative">
                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        required
                        type="number" step="0.01"
                        className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-slate-900 text-lg"
                        value={newTx.amount ?? ''}
                        onChange={e => setNewTx({...newTx, amount: parseFloat(e.target.value)})}
                    />
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Data de Referência</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                      required
                      type="date"
                      className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900"
                      value={newTx.date}
                      onChange={e => setNewTx({...newTx, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Situação de Liquidação</label>
                <select 
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900 cursor-pointer"
                    value={newTx.status}
                    onChange={e => setNewTx({...newTx, status: e.target.value as any})}
                    disabled={editingId && newTx.status === 'Parcial'}
                >
                    <option value="Pago">Pago / Recebido</option>
                    <option value="Pendente">Aguardando Pagamento</option>
                    {editingId && newTx.status === 'Parcial' && <option value="Parcial">Liquidação Parcial</option>}
                </select>
              </div>
          </div>

          <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Centro de Custo / Categoria / Obra Associada</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <select
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900 cursor-pointer"
                      value={newTx.category}
                      onChange={e => setNewTx({...newTx, category: e.target.value})}
                    >
                      <option value="Material">Material</option>
                      <option value="Venda de Material">Venda de Material</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                      <option value="Recebimento Obra">Recebimento Obra</option>
                      <option value="Combustível">Combustível</option>
                      <option value="Administrativo">Administrativo</option>
                      <option value="Aluguel">Aluguel</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <select
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900 cursor-pointer"
                      value={newTx.project_id || ''}
                      onChange={e => setNewTx({ ...newTx, project_id: e.target.value })}
                    >
                      <option value="">Nenhuma Obra</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title} - {p.client_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Descartar</button>
             <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/30 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center min-w-[200px]">
                 {editingId ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                 {editingId ? 'Confirmar Ajustes' : 'Efetivar Lançamento'}
             </button>
          </div>
        </form>
      </Modal>

      {/* Settle (Baixa) Modal - Enhanced */}
      <Modal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} title={`Confirmação de Baixa`}>
         {selectedTx && (
             <form onSubmit={handleSettleTransaction} className="space-y-6 pb-2">
                 <div className="bg-slate-900 p-8 rounded-[32px] border border-slate-800 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 -mr-6 -mt-6">
                        {selectedTx.type === TransactionType.RECEITA ? <TrendingUp size={120} /> : <TrendingDown size={120} />}
                     </div>
                     <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Registro Selecionado</span>
                        <h4 className="text-2xl font-black text-white tracking-tight leading-tight uppercase mb-6">{selectedTx.description}</h4>
                        
                        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total do Título</span>
                                <span className="text-xl font-black text-white">{formatMoney(selectedTx.amount)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Amortizado</span>
                                <span className="text-xl font-black text-blue-400">{formatMoney(selectedTx.paid_amount || 0)}</span>
                            </div>
                        </div>
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Valor da Baixa (R$)</label>
                      <div className="relative">
                        <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            required
                            type="number" step="0.01" max={selectedTx.amount - (selectedTx.paid_amount || 0)}
                            className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-slate-900 text-2xl tracking-tighter"
                            value={settleData.amount}
                            onChange={e => setSettleData({...settleData, amount: parseFloat(e.target.value)})}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-rose-500 mt-2 px-1 leading-relaxed">Pendente Residual: {formatMoney(selectedTx.amount - (selectedTx.paid_amount || 0))}</p>
                    </div>

                    <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Data da Operação</label>
                        <div className="relative">
                           <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                           <input 
                               required
                               type="date"
                               className="w-full pl-12 pr-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900"
                               value={settleData.date}
                               onChange={e => setSettleData({...settleData, date: e.target.value})}
                           />
                        </div>
                    </div>
                 </div>

                 <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
                    <button type="button" onClick={() => setIsSettleModalOpen(false)} className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Cancelar</button>
                    <button 
                        type="submit" 
                        disabled={settling}
                        className={`px-10 py-4 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center min-w-[240px] hover:-translate-y-1 active:translate-y-0 transition-all ${
                            selectedTx.type === TransactionType.RECEITA ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        }`}
                    >
                        {settling ? <RefreshCcw size={16} className="animate-spin mr-2" /> : <ChevronRight size={16} className="mr-2" />}
                        Efetivar {getActionLabel()} de {formatMoney(settleData.amount)}
                    </button>
                </div>
             </form>
         )}
      </Modal>
    </div>
  );
};

export default Finance;
