import React, { useEffect, useState } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Filter, Loader, CheckCircle, Clock, AlertCircle, Edit } from 'lucide-react';
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');
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
      .filter(t => t.date >= startIso && t.date <= endIso);

    const filteredCosts = projectCosts.filter(c => c.date >= startIso && c.date <= endIso);

    return { filteredTx, filteredCosts };
  };

  const { filteredTx, filteredCosts } = getFilteredData();

  const totalRevenue = filteredTx
    .filter(t => t.type === TransactionType.RECEITA)
    .reduce((acc, curr) => acc + (curr.paid_amount || 0), 0);

  const totalExpenses = filteredTx
    .filter(t => t.type === TransactionType.DESPESA)
    .reduce((acc, curr) => acc + (curr.paid_amount || 0), 0) +
    filteredCosts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const pendingRevenue = filteredTx
    .filter(t => t.type === TransactionType.RECEITA)
    .reduce((acc, curr) => acc + (curr.amount - (curr.paid_amount || 0)), 0);

  const pendingExpenses = filteredTx
    .filter(t => t.type === TransactionType.DESPESA)
    .reduce((acc, curr) => acc + (curr.amount - (curr.paid_amount || 0)), 0);

  const getPageTitle = () => {
    if (filterType === TransactionType.RECEITA) return 'Contas a Receber';
    if (filterType === TransactionType.DESPESA) return 'Contas a Pagar';
    return 'Financeiro Geral';
  };

  const getActionLabel = () => {
    if (filterType === TransactionType.RECEITA) return 'Receber';
    if (filterType === TransactionType.DESPESA) return 'Pagar';
    return 'Baixar';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
          <p className="text-gray-500 text-sm">
            {filterType ? `Gerencie suas ${filterType === TransactionType.RECEITA ? 'entradas' : 'saídas'} financeiras.` : 'Visão geral de fluxo de caixa.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            className="w-full sm:w-auto bg-white border border-gray-300 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 outline-none"
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            <option value="THIS_MONTH">Este Mês</option>
            <option value="LAST_MONTH">Mês Passado</option>
            <option value="CUSTOM">Personalizado</option>
          </select>
          {period === 'CUSTOM' && (
            <div className="flex gap-1 items-center justify-between sm:justify-start">
              <input type="date" className="bg-white border border-gray-300 px-2 py-1 rounded-lg text-xs flex-1 sm:flex-none" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} />
              <span className="text-gray-400">até</span>
              <input type="date" className="bg-white border border-gray-300 px-2 py-1 rounded-lg text-xs flex-1 sm:flex-none" value={customRange.end} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} />
            </div>
          )}
          <button
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            Nova Transação
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${!filterType ? 'md:grid-cols-2' : ''} gap-4`}>
        {(!filterType || filterType === TransactionType.RECEITA) && (
          <div className="bg-green-50 p-6 rounded-xl border border-green-100">
            <div className="flex items-center text-green-700 mb-2">
              <ArrowUpCircle size={24} className="mr-2" />
              <span className="font-semibold">Receitas (Recebidas)</span>
            </div>
            <p className="text-3xl font-bold text-green-800">
              {formatMoney(totalRevenue)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Pendente: {formatMoney(pendingRevenue)}
            </p>
          </div>
        )}

        {(!filterType || filterType === TransactionType.DESPESA) && (
          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <div className="flex items-center text-red-700 mb-2">
              <ArrowDownCircle size={24} className="mr-2" />
              <span className="font-semibold">Despesas (Pagas + Custos Obra)</span>
            </div>
            <p className="text-3xl font-bold text-red-800">
              {formatMoney(totalExpenses)}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Pendente: {formatMoney(pendingExpenses)}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 font-semibold text-gray-800 flex justify-between items-center">
          <span>{filterType ? `Listagem de ${filterType === TransactionType.RECEITA ? 'Receitas' : 'Despesas'}` : 'Últimas Movimentações'}</span>
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
            {filteredTx.length} registros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 min-w-[700px]">
            <thead className="bg-gray-50 text-gray-900 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader className="animate-spin mx-auto" /></td></tr>
              ) : filteredTx.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhuma transação encontrada.</td></tr>
              ) : filteredTx.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div>{t.description}</div>
                    {t.project_id && (
                      <div className="text-xs text-blue-600 font-normal mt-0.5" title="Obra vinculada">
                        Obra: {projects.find(p => p.id === t.project_id)?.title || 'Desconhecida'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{t.category}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${t.status === 'Pago' ? 'bg-green-100 text-green-800' :
                        t.status === 'Parcial' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                      {t.status}
                    </span>
                    {t.status === 'Parcial' && (
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${((t.paid_amount || 0) / t.amount) * 100}%` }}></div>
                      </div>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${t.type === TransactionType.RECEITA ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === TransactionType.RECEITA ? '+' : '-'}{formatMoney(t.amount)}
                    {t.status !== 'Pago' && (
                      <div className="text-xs text-gray-400 font-normal">
                        Pago: {formatMoney(t.paid_amount || 0)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 p-1.5 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      {t.status !== 'Pago' && (
                        <button
                          onClick={() => handleOpenSettle(t)}
                          className="bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 p-1.5 rounded-lg transition"
                          title={t.type === TransactionType.RECEITA ? "Receber" : "Pagar"}
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Transação" : "Nova Transação"}>
        <form onSubmit={handleSaveTx} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
              value={newTx.description}
              onChange={e => setNewTx({ ...newTx, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                value={newTx.type}
                onChange={e => setNewTx({ ...newTx, type: e.target.value as TransactionType })}
                disabled={!!filterType}
              >
                <option value={TransactionType.RECEITA}>Receita (+)</option>
                <option value={TransactionType.DESPESA}>Despesa (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
              <input
                required
                type="number" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                value={newTx.amount ?? ''}
                onChange={e => setNewTx({ ...newTx, amount: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Inicial</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                value={newTx.status}
                onChange={e => setNewTx({ ...newTx, status: e.target.value as any })}
                disabled={editingId && newTx.status === 'Parcial'}
              >
                <option value="Pago">Pago / Recebido</option>
                <option value="Pendente">Pendente</option>
                {editingId && newTx.status === 'Parcial' && <option value="Parcial">Parcial</option>}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                value={newTx.category}
                onChange={e => setNewTx({ ...newTx, category: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Obra Associada (Opcional)</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
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
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              {editingId ? 'Salvar Alterações' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Settle (Baixa) Modal */}
      <Modal isOpen={isSettleModalOpen} onClose={() => setIsSettleModalOpen(false)} title={`Confirmar ${getActionLabel()}`}>
        {selectedTx && (
          <form onSubmit={handleSettleTransaction} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
              <p className="text-sm text-gray-500">Descrição</p>
              <p className="font-semibold text-gray-800">{selectedTx.description}</p>
              <div className="flex justify-between mt-2 text-sm">
                <div>
                  <span className="text-gray-500">Total:</span> <span className="font-bold">{formatMoney(selectedTx.amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Já {selectedTx.type === TransactionType.RECEITA ? 'recebido' : 'pago'}:</span> <span className="font-bold text-blue-600">{formatMoney(selectedTx.paid_amount || 0)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor a {getActionLabel()}</label>
              <input
                required
                type="number" step="0.01" max={selectedTx.amount - (selectedTx.paid_amount || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900 font-bold text-lg"
                value={settleData.amount}
                onChange={e => setSettleData({ ...settleData, amount: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">Restante: {formatMoney(selectedTx.amount - (selectedTx.paid_amount || 0))}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento</label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                value={settleData.date}
                onChange={e => setSettleData({ ...settleData, date: e.target.value })}
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setIsSettleModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
              <button
                type="submit"
                disabled={settling}
                className={`px-4 py-2 text-white rounded-lg font-medium flex items-center ${selectedTx.type === TransactionType.RECEITA ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {settling && <Loader size={16} className="animate-spin mr-2" />}
                Confirmar {getActionLabel()}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Finance;
