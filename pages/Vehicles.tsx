import React, { useEffect, useState } from 'react';
import { Plus, Truck, Calendar, Activity, PenTool, Trash2, Loader, DollarSign, Save, X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Vehicle, Transaction, TransactionType } from '../types';
import Modal from '../components/Modal';

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State for New Vehicle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    model: '',
    plate: '',
    current_km: undefined,
    status: 'Ativo'
  });

  // Modal State for Expenses
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleTransactions, setVehicleTransactions] = useState<Transaction[]>([]);
  const [newExpense, setNewExpense] = useState({
      description: '',
      amount: 0,
      category: 'Combustível',
      date: new Date().toISOString().split('T')[0]
  });
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = () => {
    setLoading(true);
    api.getVehicles().then(data => {
        setVehicles(data);
        setLoading(false);
    });
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addVehicle(newVehicle as Vehicle);
    fetchVehicles();
    setIsModalOpen(false);
    setNewVehicle({ model: '', plate: '', current_km: undefined, status: 'Ativo' });
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('Remover veículo?')) {
        await api.deleteVehicle(id);
        fetchVehicles();
    }
  }

  // --- Expenses Logic ---

  const handleOpenExpenses = async (vehicle: Vehicle) => {
      setSelectedVehicle(vehicle);
      setLoadingExpenses(true);
      setIsExpenseModalOpen(true);
      
      const allTx = await api.getTransactions();
      const vehicleTx = allTx.filter(t => t.vehicle_id === vehicle.id);
      setVehicleTransactions(vehicleTx);
      setLoadingExpenses(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedVehicle) return;

      const tx: any = {
          description: newExpense.description || `Despesa ${selectedVehicle.model}`,
          amount: newExpense.amount,
          type: TransactionType.DESPESA,
          category: newExpense.category,
          date: newExpense.date,
          status: 'Pago',
          vehicle_id: selectedVehicle.id
      };

      await api.addTransaction(tx);
      
      const allTx = await api.getTransactions();
      const vehicleTx = allTx.filter(t => t.vehicle_id === selectedVehicle.id);
      setVehicleTransactions(vehicleTx);
      
      setNewExpense({
          description: '',
          amount: 0,
          category: 'Combustível',
          date: new Date().toISOString().split('T')[0]
      });
  };

  const totalExpenses = vehicleTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Frota Operacional</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Gestão de logística, manutenção e custos de rodagem.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center w-full sm:w-auto"
        >
          <Plus size={16} className="mr-2" />
          Adicionar Unidade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
         {loading ? (
             <div className="col-span-full flex justify-center py-20"><Loader className="animate-spin text-blue-500" size={48}/></div>
         ) : vehicles.length === 0 ? (
             <div className="col-span-full text-center py-24 text-slate-400 italic font-medium bg-white rounded-[32px] border border-slate-100 shadow-sm">
                 <Truck size={64} className="mx-auto text-slate-200 mb-4" />
                 <p className="text-lg">Nenhum veículo cadastrado na frota.</p>
             </div>
         ) : vehicles.map(v => (
             <div key={v.id} className="premium-card overflow-hidden group">
                 <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-slate-900 text-white rounded-[20px] shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform duration-500">
                            <Truck size={28} />
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${v.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {v.status}
                        </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{v.model}</h3>
                    <p className="text-xs text-slate-400 font-bold tracking-[0.2em] mb-8 mt-1 uppercase border-b border-slate-50 pb-4">{v.plate}</p>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Activity size={14} className="mr-2 text-blue-500"/> Kilometragem</span>
                            <span className="text-base font-black text-slate-900 tracking-tighter">{v.current_km.toLocaleString()} KM</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Calendar size={14} className="mr-2 text-amber-500"/> Manutenção</span>
                             <span className="text-xs font-bold text-slate-700">{v.last_maintenance ? new Date(v.last_maintenance).toLocaleDateString('pt-BR') : 'PENDENTE'}</span>
                        </div>
                    </div>
                 </div>
                 <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between gap-3 backdrop-blur-sm">
                     <button 
                        onClick={() => handleOpenExpenses(v)}
                        className="flex-1 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-sm"
                     >
                        <DollarSign size={14} className="mr-1.5" /> Despesas
                     </button>
                     <button className="flex-1 bg-white border border-slate-200 hover:border-slate-800 hover:text-slate-900 text-slate-600 py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <PenTool size={14} className="mr-1.5" /> Logs
                     </button>
                     <button onClick={() => handleDelete(v.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 size={18} />
                     </button>
                 </div>
             </div>
         ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Ativo Logístico">
        <form onSubmit={handleAddVehicle} className="space-y-6 pb-2">
            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Modelo do Veículo</label>
                <input required type="text" className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900"
                    placeholder="Ex: Toyota Hilux SRV"
                    value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Placa / Identificação</label>
                    <input required type="text" className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-slate-900 uppercase"
                        placeholder="ABC-1234"
                        value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} />
                </div>
                 <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">KM Inicial de Registro</label>
                    <input required type="number" className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-slate-900"
                        value={newVehicle.current_km ?? ''} onChange={e => setNewVehicle({...newVehicle, current_km: parseInt(e.target.value, 10)})} />
                </div>
            </div>
            <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Status Operacional</label>
                 <select className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900 cursor-pointer"
                    value={newVehicle.status} onChange={e => setNewVehicle({...newVehicle, status: e.target.value as any})}
                 >
                     <option value="Ativo">Operação Normal (Ativo)</option>
                     <option value="Manutenção">Em Manutenção / Reparo</option>
                 </select>
            </div>
            <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Descartar</button>
             <button type="submit" className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black shadow-xl shadow-slate-900/30 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center min-w-[200px]">Incorporar Veículo</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Centro de Custos Logísticos" maxWidth="max-w-3xl">
         {selectedVehicle && (
             <div className="flex flex-col h-full space-y-8">
                 <div className="bg-slate-900 p-8 rounded-[28px] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-slate-900/40 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                        <Truck size={200} className="absolute -top-10 -left-10 text-white rotate-12" />
                     </div>
                     <div className="relative z-10">
                        <h4 className="font-black text-white text-2xl tracking-tight uppercase tracking-widest">{selectedVehicle.model}</h4>
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.3em] mt-1">{selectedVehicle.plate}</p>
                     </div>
                     <div className="text-center md:text-right relative z-10">
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Custo Total Acumulado</p>
                         <p className="text-4xl font-black text-emerald-400 tracking-tighter">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
                         </p>
                     </div>
                 </div>

                 <form onSubmit={handleAddExpense} className="bg-slate-50/50 p-8 rounded-[28px] border border-slate-100 space-y-6">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center">
                         <Plus size={14} className="mr-2 text-blue-500"/> Registrar Novo Desembolso
                     </h5>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                             <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Data da Ocorrência</label>
                             <input type="date" required className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                             <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria de Custo</label>
                             <select className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                                value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                             >
                                 <option value="Combustível">Abastecimento</option>
                                 <option value="Manutenção">Manutenção Técnica</option>
                                 <option value="IPVA/Licenc.">Impostos / Taxas</option>
                                 <option value="Seguro">Seguro Automotivo</option>
                                 <option value="Outros">Outras Despesas</option>
                             </select>
                         </div>
                         <div className="space-y-2">
                             <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Valor do Lançamento</label>
                             <input type="number" step="0.01" min="0" required placeholder="0,00" className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white font-black text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
                         </div>
                     </div>
                     <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Descrição / Detalhes (Opcional)</label>
                        <input type="text" placeholder="Ex: Troca de óleo e filtros de ar" className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                     </div>
                     <div className="flex justify-end pt-2">
                         <button type="submit" className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                             Efetivar Lançamento
                         </button>
                     </div>
                 </form>

                 <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center">
                        <Activity size={14} className="mr-2 text-amber-500"/> Histórico Cronológico
                     </h5>
                     <div className="overflow-y-auto flex-1 border border-slate-100 rounded-[28px] bg-white shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-4 py-4">Categoria</th>
                                    <th className="px-6 py-4">Observação</th>
                                    <th className="px-6 py-4 text-right">Montante</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loadingExpenses ? (
                                    <tr><td colSpan={4} className="text-center py-12"><Loader className="animate-spin mx-auto text-blue-500" size={32}/></td></tr>
                                ) : vehicleTransactions.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-12 text-slate-400 italic font-medium">Nenhum custo registrado para este veículo.</td></tr>
                                ) : vehicleTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${tx.category === 'Combustível' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500 truncate max-w-[200px]">{tx.description}</td>
                                        <td className="px-6 py-4 text-right font-black text-rose-500">
                                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 </div>

                 <div className="flex justify-end pt-4">
                     <button
                        onClick={() => setIsExpenseModalOpen(false)}
                        className="px-10 py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Fechar Módulo
                    </button>
                </div>
             </div>
         )}
      </Modal>
    </div>
  );
};

export default Vehicles;
