import React, { useEffect, useState } from 'react';
import { AlertTriangle, Edit, Loader, Package, Plus, Save, Search, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { Material } from '../types';

interface MaterialFormState {
  name: string;
  unit: string;
  supplier: string;
  price_cost: string;
  price_sale: string;
  quantity: string;
  min_quantity: string;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const calcProfitability = (priceCost: number, priceSale: number) => {
  if (!priceCost || priceCost <= 0) return 0;
  return ((priceSale - priceCost) / priceCost) * 100;
};

const emptyForm = (): MaterialFormState => ({
  name: '',
  unit: 'un',
  supplier: '',
  price_cost: '',
  price_sale: '',
  quantity: '',
  min_quantity: ''
});

const toNumber = (value: string) => {
  if (!value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Inventory: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovementMode, setIsMovementMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialFormState>(emptyForm());
  const [movementQty, setMovementQty] = useState('');
  const [movementNotes, setMovementNotes] = useState('');

  useEffect(() => {
    void fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory();
      setMaterials(data);
    } catch (error) {
      console.error('Falha ao buscar estoque', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setMovementQty('');
    setMovementNotes('');
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setIsMovementMode(false);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Material) => {
    setEditingId(item.id);
    setIsMovementMode(false);
    setForm({
      name: item.name,
      unit: item.unit,
      supplier: item.supplier || '',
      price_cost: item.price_cost ? String(item.price_cost) : '',
      price_sale: item.price_sale ? String(item.price_sale) : '',
      quantity: item.quantity ? String(item.quantity) : '',
      min_quantity: item.min_quantity ? String(item.min_quantity) : ''
    });
    setIsModalOpen(true);
  };

  const handleOpenMovementModal = (item: Material) => {
    setEditingId(item.id);
    setIsMovementMode(true);
    setForm({
      name: item.name,
      unit: item.unit,
      supplier: item.supplier || '',
      price_cost: item.price_cost ? String(item.price_cost) : '',
      price_sale: item.price_sale ? String(item.price_sale) : '',
      quantity: item.quantity ? String(item.quantity) : '',
      min_quantity: item.min_quantity ? String(item.min_quantity) : ''
    });
    setMovementQty('');
    setMovementNotes('Entrada de mercadoria via ajuste rápido');
    setIsModalOpen(true);
  };

  const handleSaveMovement = async () => {
    if (!editingId || !movementQty) return;
    setSubmitting(true);
    try {
      await api.addInventoryMovement({
        material_id: editingId,
        movement_type: 'Entrada',
        quantity: toNumber(movementQty),
        movement_date: new Date().toISOString().split('T')[0],
        notes: movementNotes || 'Movimentação manual'
      });
      await fetchMaterials();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao registrar movimento:', error);
      window.alert('Erro ao registrar entrada de estoque.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMovementMode) {
      await handleSaveMovement();
      return;
    }

    setSubmitting(true);

    try {
      const itemToSave = {
        name: form.name.trim(),
        unit: form.unit,
        supplier: form.supplier.trim(),
        price_cost: toNumber(form.price_cost),
        price_sale: toNumber(form.price_sale),
        quantity: toNumber(form.quantity),
        min_quantity: toNumber(form.min_quantity)
      } as Omit<Material, 'id'>;

      if (editingId) {
        await api.updateItem({ ...itemToSave, id: editingId });
      } else {
        await api.addItem(itemToSave);
      }

      await fetchMaterials();
      setIsModalOpen(false);
      resetForm();
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar item:', error);
      window.alert('Erro ao salvar item. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!window.confirm('Tem certeza que deseja excluir este item do estoque?')) {
      return;
    }

    try {
      await api.deleteItem(id);
      setMaterials((prev) => prev.filter((material) => material.id !== id));
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      window.alert('Erro ao excluir item.');
    }
  };

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formProfitability = calcProfitability(toNumber(form.price_cost), toNumber(form.price_sale));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Almoxarifado Digital</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Gestão estratégica de materiais e controle de insumos.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center w-full sm:w-auto"
        >
          <Plus size={16} className="mr-2" />
          Cadastrar Insumo
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30 backdrop-blur-sm">
          <div className="relative flex-1 max-w-xl group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Pesquisar por nome do material ou fornecedor..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-500/20">
               {filteredMaterials.length} Itens Mapeados
             </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <th className="px-8 py-5">Material / Insumo</th>
                <th className="px-8 py-5">Fabricante / Fornecedor</th>
                <th className="px-8 py-5 text-center">Unid.</th>
                <th className="px-8 py-5 text-right">Custo de Aquisição</th>
                <th className="px-8 py-5 text-right">Preço de Repasse</th>
                <th className="px-8 py-5 text-center">Volume em Estoque</th>
                <th className="px-8 py-5 text-center">Status Crítico</th>
                <th className="px-8 py-5 text-right">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <Loader className="animate-spin mx-auto text-blue-500" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-4 block">Sincronizando Inventário...</span>
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-slate-400 italic font-medium">
                    Nenhum material encontrado no almoxarifado.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                    onClick={() => handleOpenMovementModal(item)}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl mr-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
                          <Package size={18} />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-800 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{item.name}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">REF: {item.id.slice(0,8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{item.supplier || '-'}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border border-slate-200/50">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right font-black text-slate-900">{formatMoney(item.price_cost)}</td>
                    <td className="px-8 py-6 text-right font-black text-emerald-600">{formatMoney(item.price_sale || 0)}</td>
                    <td className="px-8 py-6 text-center">
                       <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-slate-900 tracking-tighter">{item.quantity}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${item.quantity <= item.min_quantity ? 'text-rose-500' : 'text-slate-400'}`}>Estoque Real</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {item.quantity <= item.min_quantity ? (
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest shadow-sm">
                          <AlertTriangle size={12} className="mr-1.5" /> Reposição Necessária
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                          Nível Seguro
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(item);
                          }}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg shadow-sm transition-all active:scale-95"
                          title="Ficha Técnica / Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:shadow-lg shadow-sm transition-all active:scale-95"
                          title="Eliminar Registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={isMovementMode ? 'Abastecer Estoque' : editingId ? 'Ajuste de Patrimônio' : 'Novo Insumo Estratégico'}
      >
        <form onSubmit={handleSaveItem} className="space-y-6 pb-2">
          {isMovementMode ? (
            <>
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-[24px]">
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-600 text-white rounded-xl mr-4 shadow-lg shadow-blue-500/20">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{form.name}</h3>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Entrada de Mercadoria</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</label>
                    <span className="text-2xl font-black text-slate-900">{form.quantity} {form.unit}</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm ring-2 ring-blue-500/5">
                    <label className="block text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Nova Quantidade</label>
                    <input
                      required
                      autoFocus
                      type="number"
                      step="0.001"
                      min="0.001"
                      placeholder="0.000"
                      className="w-full bg-transparent border-none p-0 focus:ring-0 text-2xl font-black text-blue-600 placeholder:text-blue-200"
                      value={movementQty}
                      onChange={(e) => setMovementQty(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Notas de Observação</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-blue-300 transition-colors"
                    placeholder="Ex: Nota Fiscal 123..."
                    value={movementNotes}
                    onChange={(e) => setMovementNotes(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precisa alterar o preço ou unidade?</span>
                <button
                  type="button"
                  onClick={() => setIsMovementMode(false)}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center"
                >
                  <Edit size={12} className="mr-1.5" /> Abrir Ficha Técnica
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Nome Comercial do Material</label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900"
                  placeholder="Ex: Placa de Gesso ST 12.5mm"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Fornecedor Primário</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900"
                    placeholder="Nome da Indústria/Loja"
                    value={form.supplier}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Unidade de Medida</label>
                  <select
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-bold text-slate-900 cursor-pointer"
                    value={form.unit}
                    onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                    disabled={submitting}
                  >
                    <option value="un">Peça / Unidade (un)</option>
                    <option value="m2">Metro Quadrado (m2)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="cx">Caixa (cx)</option>
                    <option value="sc">Saco (sc)</option>
                    <option value="barra">Barra Linear</option>
                    <option value="lata">Lata / Balde</option>
                    <option value="galao">Galão</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Custo de Compra (R$)</label>
                  <input
                    required
                    type="number" step="0.01" min="0"
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-slate-900 text-lg"
                    value={form.price_cost}
                    onChange={(e) => setForm((prev) => ({ ...prev, price_cost: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Preço Sugerido Venda (R$)</label>
                  <input
                    type="number" step="0.01" min="0"
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-emerald-600 text-lg"
                    value={form.price_sale}
                    onChange={(e) => setForm((prev) => ({ ...prev, price_sale: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rentabilidade de Repasse</span>
                <span className={`text-xl font-black ${formProfitability >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formProfitability.toFixed(2)}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Quantidade Física Atual</label>
                  <input
                    required
                    type="number" min="0"
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white font-black text-slate-900 text-xl"
                    value={form.quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Ponto de Ressuprimento (Mín)</label>
                  <input
                    required
                    type="number" min="0"
                    className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/10 outline-none transition-all bg-white font-black text-rose-600 text-xl"
                    value={form.min_quantity}
                    onChange={(e) => setForm((prev) => ({ ...prev, min_quantity: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
            </>
          )}

          <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
              disabled={submitting}
            >
              Descartar
            </button>
            <button
              type="submit"
              className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/30 hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center min-w-[220px] disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader size={16} className="animate-spin mr-2" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {isMovementMode ? 'Confirmar Entrada' : editingId ? 'Efetivar Ajustes' : 'Consolidar Cadastro'}
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
