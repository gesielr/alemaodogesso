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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialFormState>(emptyForm());

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
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Material) => {
    setEditingId(item.id);
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

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-gray-500 text-sm">Gerencie materiais, entradas e saidas.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition w-full sm:w-auto justify-center shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          Adicionar Item
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar material..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-white text-gray-900 font-semibold uppercase text-xs border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4 text-center">Unidade</th>
                <th className="px-6 py-4 text-right">Custo Unit.</th>
                <th className="px-6 py-4 text-right">Preco Venda</th>
                <th className="px-6 py-4 text-right">Rentabilidade</th>
                <th className="px-6 py-4 text-center">Estoque</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader className="animate-spin mx-auto text-blue-500" size={24} />
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <Package size={48} className="mx-auto text-gray-300 mb-2" />
                    <p>Nenhum material encontrado no estoque.</p>
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition group">
                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-3">
                        <Package size={16} />
                      </div>
                      {item.name}
                    </td>
                    <td className="px-6 py-4">{item.supplier || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-xs font-mono text-gray-600">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{formatMoney(item.price_cost)}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatMoney(item.price_sale || 0)}</td>
                    <td className="px-6 py-4 text-right font-semibold">
                      <span className={(item.profitability_pct || 0) >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {(item.profitability_pct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-800 text-base">{item.quantity}</td>
                    <td className="px-6 py-4 text-center">
                      {item.quantity <= item.min_quantity ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle size={12} className="mr-1" /> Baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(item);
                          }}
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                          title="Editar Item"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                          title="Excluir Item"
                        >
                          <Trash2 size={18} />
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
        title={editingId ? 'Editar Material' : 'Novo Material'}
      >
        <form onSubmit={handleSaveItem} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Material</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
              placeholder="Ex: Placa de Gesso ST"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                placeholder="Nome do Fornecedor"
                value={form.supplier}
                onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                value={form.unit}
                onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                disabled={submitting}
              >
                <option value="un">Unidade (un)</option>
                <option value="m2">Metro Quad. (m2)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="cx">Caixa (cx)</option>
                <option value="sc">Saco (sc)</option>
                <option value="barra">Barra</option>
                <option value="lata">Lata</option>
                <option value="galao">Galao</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custo (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                value={form.price_cost}
                onChange={(e) => setForm((prev) => ({ ...prev, price_cost: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preco de Venda (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                value={form.price_sale}
                onChange={(e) => setForm((prev) => ({ ...prev, price_sale: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-sm text-blue-800">
            Rentabilidade estimada: <strong>{formProfitability.toFixed(2)}%</strong>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Atual</label>
              <input
                required
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                value={form.quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. Minima</label>
              <input
                required
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 shadow-sm"
                value={form.min_quantity}
                onChange={(e) => setForm((prev) => ({ ...prev, min_quantity: e.target.value }))}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader size={18} className="animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Salvar Alteracoes' : 'Salvar Item'}
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
