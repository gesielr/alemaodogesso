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
      
      // Fetch all transactions and filter by vehicle_id
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
      
      // Refresh list
      const allTx = await api.getTransactions();
      const vehicleTx = allTx.filter(t => t.vehicle_id === selectedVehicle.id);
      setVehicleTransactions(vehicleTx);
      
      // Reset form
      setNewExpense({
          description: '',
          amount: 0,
          category: 'Combustível',
          date: new Date().toISOString().split('T')[0]
      });
  };

  const totalExpenses = vehicleTransactions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Frota de Veículos</h1>
          <p className="text-gray-500 text-sm">Controle de quilometragem e manutenção.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          <Plus size={18} className="mr-2" />
          Adicionar Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {loading ? (
             <div className="col-span-full flex justify-center py-10"><Loader className="animate-spin text-gray-400"/></div>
         ) : vehicles.map(v => (
             <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden group">
                 <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Truck size={24} />
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${v.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {v.status}
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{v.model}</h3>
                    <p className="text-sm text-gray-500 font-mono mb-6 uppercase">{v.plate}</p>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-500 flex items-center"><Activity size={14} className="mr-2"/> KM Atual</span>
                            <span className="font-bold text-gray-800">{v.current_km.toLocaleString()} km</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                             <span className="text-gray-500 flex items-center"><Calendar size={14} className="mr-2"/> Últ. Manutenção</span>
                             <span className="font-medium text-gray-800">{v.last_maintenance ? new Date(v.last_maintenance).toLocaleDateString('pt-BR') : '-'}</span>
                        </div>
                    </div>
                 </div>
                 <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between gap-2">
                     <button 
                        onClick={() => handleOpenExpenses(v)}
                        className="flex-1 text-xs font-bold text-gray-700 hover:text-blue-600 hover:bg-blue-50 py-2 rounded transition flex items-center justify-center border border-gray-200 bg-white"
                     >
                        <DollarSign size={14} className="mr-1" /> DESPESAS
                     </button>
                     {/* Placeholder for future features */}
                     <button className="flex-1 text-xs font-bold text-gray-700 hover:text-blue-600 hover:bg-blue-50 py-2 rounded transition flex items-center justify-center border border-gray-200 bg-white">
                        <PenTool size={14} className="mr-1" /> USO
                     </button>
                     <button onClick={() => handleDelete(v.id)} className="px-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition border border-transparent">
                        <Trash2 size={16} />
                     </button>
                 </div>
             </div>
         ))}
      </div>

      {/* New Vehicle Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Veículo">
        <form onSubmit={handleAddVehicle} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                    value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                    <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 uppercase bg-white text-gray-900"
                        value={newVehicle.plate} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KM Atual</label>
                    <input required type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                        value={newVehicle.current_km ?? ''} onChange={e => setNewVehicle({...newVehicle, current_km: parseInt(e.target.value, 10)})} />
                </div>
            </div>
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900"
                    value={newVehicle.status} onChange={e => setNewVehicle({...newVehicle, status: e.target.value as any})}
                 >
                     <option value="Ativo">Ativo</option>
                     <option value="Manutenção">Manutenção</option>
                 </select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
             <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Salvar Veículo</button>
          </div>
        </form>
      </Modal>

      {/* Expenses Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Controle de Despesas" maxWidth="max-w-2xl">
         {selectedVehicle && (
             <div className="flex flex-col h-full">
                 <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-center justify-between">
                     <div>
                        <h4 className="font-bold text-blue-900 text-lg">{selectedVehicle.model}</h4>
                        <p className="text-blue-700 font-mono text-sm uppercase">{selectedVehicle.plate}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-xs text-blue-600 font-medium uppercase">Total Gasto</p>
                         <p className="text-2xl font-bold text-blue-800">
                             {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
                         </p>
                     </div>
                 </div>

                 {/* Add New Expense Form */}
                 <form onSubmit={handleAddExpense} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                     <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                         <Plus size={16} className="mr-1"/> Nova Despesa
                     </h5>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                         <div className="md:col-span-1">
                             <input type="date" required className="w-full px-3 py-2 text-sm border rounded-md bg-white text-gray-900"
                                value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                         </div>
                         <div className="md:col-span-1">
                             <select className="w-full px-3 py-2 text-sm border rounded-md bg-white text-gray-900"
                                value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                             >
                                 <option value="Combustível">Combustível</option>
                                 <option value="Manutenção">Manutenção</option>
                                 <option value="IPVA/Licenc.">IPVA/Licenc.</option>
                                 <option value="Seguro">Seguro</option>
                                 <option value="Outros">Outros</option>
                             </select>
                         </div>
                         <div className="md:col-span-1">
                             <input type="number" step="0.01" min="0" required placeholder="Valor R$" className="w-full px-3 py-2 text-sm border rounded-md bg-white text-gray-900"
                                value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
                         </div>
                         <div className="md:col-span-1">
                             <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                                 Lançar
                             </button>
                         </div>
                     </div>
                     <div className="mt-3">
                        <input type="text" placeholder="Descrição (Opcional)" className="w-full px-3 py-2 text-sm border rounded-md bg-white text-gray-900"
                                value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                     </div>
                 </form>

                 {/* History Table */}
                 <div className="flex-1 overflow-hidden flex flex-col">
                     <h5 className="text-sm font-bold text-gray-700 mb-2">Histórico de Lançamentos</h5>
                     <div className="overflow-y-auto flex-1 border border-gray-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase sticky top-0">
                                <tr>
                                    <th className="px-4 py-2">Data</th>
                                    <th className="px-4 py-2">Categoria</th>
                                    <th className="px-4 py-2">Descrição</th>
                                    <th className="px-4 py-2 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingExpenses ? (
                                    <tr><td colSpan={4} className="text-center py-4"><Loader className="animate-spin mx-auto" size={20}/></td></tr>
                                ) : vehicleTransactions.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhuma despesa registrada.</td></tr>
                                ) : vehicleTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                                    <tr key={tx.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-600">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${tx.category === 'Combustível' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-700'}`}>
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-800">{tx.description}</td>
                                        <td className="px-4 py-2 text-right font-medium text-red-600">
                                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 </div>

                 <div className="flex justify-end pt-4 mt-2">
                     <button
                        onClick={() => setIsExpenseModalOpen(false)}
                        className="px-6 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition"
                    >
                        Fechar
                    </button>
                </div>
             </div>
         )}
      </Modal>
    </div>
  );
};

export default Vehicles;
