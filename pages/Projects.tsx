
import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  DollarSign,
  FileText,
  Loader,
  MapPin,
  Package,
  Pencil,
  Plus,
  PlusCircle,
  Save,
  Search,
  Trash2,
  Truck,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { Project, ProjectBudgetRevision, ProjectCost, ProjectStatus } from '../types';
import Modal from '../components/Modal';

interface ProjectsProps {
  initialSearchTerm?: string;
}

type ProjectCostType = ProjectCost['type'];
type CostFilter = 'ALL' | ProjectCostType;

interface CostFormState {
  type: ProjectCostType;
  description: string;
  amount: number;
  date: string;
  notes: string;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatMoney = (value?: number) => money.format(Number(value || 0));

const costTypeLabel: Record<ProjectCostType, string> = {
  MATERIAL: 'Material',
  VEHICLE: 'Veiculo',
  LABOR: 'Mao de obra'
};

const todayDate = () => new Date().toISOString().split('T')[0];

const emptyCostForm = (type: ProjectCostType = 'MATERIAL'): CostFormState => ({
  type,
  description: '',
  amount: 0,
  date: todayDate(),
  notes: ''
});

const getCostIcon = (type: ProjectCostType) => {
  switch (type) {
    case 'MATERIAL':
      return Package;
    case 'VEHICLE':
      return Truck;
    case 'LABOR':
      return Users;
    default:
      return FileText;
  }
};

const getFinanceIndicator = (percent: number) => {
  if (percent > 100) {
    return { label: 'Estourado', classes: 'bg-red-100 text-red-700 border-red-200' };
  }
  if (percent >= 80) {
    return { label: 'Atencao', classes: 'bg-amber-100 text-amber-700 border-amber-200' };
  }
  return { label: 'Saudavel', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

const sortCosts = (costs: ProjectCost[]) =>
  [...costs].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });

const isWithinDays = (dateString: string, days: number) => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

const Projects: React.FC<ProjectsProps> = ({ initialSearchTerm = '' }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    title: '',
    client_name: '',
    total_value: 0,
    address: '',
    status: ProjectStatus.ORCAMENTO
  });

  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCost[]>([]);
  const [budgetRevisions, setBudgetRevisions] = useState<ProjectBudgetRevision[]>([]);
  const [budgetReason, setBudgetReason] = useState('');
  const [savingProject, setSavingProject] = useState(false);
  const [costFilter, setCostFilter] = useState<CostFilter>('ALL');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [costForm, setCostForm] = useState<CostFormState>(emptyCostForm());
  const [savingCost, setSavingCost] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const fetchProjects = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);

      if (selectedProject) {
        const updated = data.find((p) => p.id === selectedProject.id);
        if (updated) {
          setSelectedProject((prev) => (prev ? { ...prev, ...updated } : updated));
          setProjectDraft((prev) =>
            prev && prev.id === updated.id
              ? { ...prev, total_cost: updated.total_cost, profit_margin: updated.profit_margin }
              : prev
          );
        }
      }
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadTrackingData = async (projectId: string, replaceDraft = false) => {
    setTrackingLoading(true);
    try {
      const [projectData, costs, revisions] = await Promise.all([
        api.getProjectById(projectId),
        api.getProjectCosts(projectId),
        api.getProjectBudgetRevisions(projectId)
      ]);

      if (projectData) {
        setSelectedProject(projectData);
        setProjectDraft((prev) =>
          !prev || prev.id !== projectId || replaceDraft
            ? { ...projectData }
            : { ...prev, total_cost: projectData.total_cost, profit_margin: projectData.profit_margin }
        );
      }

      setProjectCosts(sortCosts(costs));
      setBudgetRevisions(revisions);
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel carregar o acompanhamento da obra.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const openTrackingModal = async (project: Project) => {
    setIsTrackingModalOpen(true);
    setSelectedProject(project);
    setProjectDraft({ ...project });
    setProjectCosts([]);
    setBudgetRevisions([]);
    setBudgetReason('');
    setCostFilter('ALL');
    setEditingCostId(null);
    setCostForm(emptyCostForm());
    await loadTrackingData(project.id, true);
  };

  const closeTrackingModal = () => {
    setIsTrackingModalOpen(false);
    setSelectedProject(null);
    setProjectDraft(null);
    setProjectCosts([]);
    setBudgetRevisions([]);
    setBudgetReason('');
    setCostFilter('ALL');
    setEditingCostId(null);
    setCostForm(emptyCostForm());
  };

  const startNewCost = (type: ProjectCostType = 'MATERIAL') => {
    setEditingCostId(null);
    setCostForm(emptyCostForm(type));
  };

  const startEditCost = (cost: ProjectCost) => {
    setEditingCostId(cost.id);
    setCostForm({
      type: cost.type,
      description: cost.description,
      amount: cost.amount,
      date: cost.date,
      notes: cost.notes || ''
    });
  };

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(normalizedSearch) ||
      p.client_name?.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.client_name) return;

    setLoading(true);
    try {
      const clientName = newProject.client_name.trim();
      const allClients = await api.getClients();
      const existingClient = allClients.find(
        (client) => client.name.trim().toLowerCase() === clientName.toLowerCase()
      );

      let clientId = existingClient?.id;
      if (!clientId) {
        const createdClient = await api.addClient({
          name: clientName,
          phone: '',
          email: '',
          address: newProject.address || '',
          document: '',
          observations: 'Cliente criado automaticamente ao cadastrar obra.'
        });
        clientId = createdClient.id;
      }

      await api.addProject({
        ...(newProject as Project),
        start_date: new Date().toISOString().split('T')[0],
        client_id: clientId,
        client_name: clientName
      });

      await fetchProjects(false);
      setIsModalOpen(false);
      setNewProject({ title: '', client_name: '', total_value: 0, address: '', status: ProjectStatus.ORCAMENTO });
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel cadastrar a obra.');
    } finally {
      setLoading(false);
    }
  };

  const saveTrackingProject = async () => {
    if (!projectDraft || !selectedProject) return;

    const previousBudget = Number(selectedProject.total_value || 0);
    const nextBudget = Number(projectDraft.total_value || 0);
    const budgetChanged = Math.abs(previousBudget - nextBudget) > 0.009;

    if (budgetChanged && !budgetReason.trim()) {
      window.alert('Informe o motivo da alteracao de orcamento.');
      return;
    }

    setSavingProject(true);
    try {
      await api.updateProject(projectDraft);

      if (budgetChanged) {
        await api.addProjectBudgetRevision({
          project_id: projectDraft.id,
          previous_value: previousBudget,
          new_value: nextBudget,
          reason: budgetReason.trim()
        });
        setBudgetReason('');
      }

      await Promise.all([loadTrackingData(projectDraft.id, true), fetchProjects(false)]);
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel salvar o acompanhamento da obra.');
    } finally {
      setSavingProject(false);
    }
  };

  const saveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!costForm.description.trim()) {
      window.alert('Informe a descricao do lancamento.');
      return;
    }
    if (Number(costForm.amount) <= 0) {
      window.alert('Informe um valor maior que zero.');
      return;
    }

    setSavingCost(true);
    try {
      if (editingCostId) {
        await api.updateProjectCost({
          id: editingCostId,
          project_id: selectedProject.id,
          type: costForm.type,
          description: costForm.description.trim(),
          amount: Number(costForm.amount),
          date: costForm.date,
          notes: costForm.notes.trim() || undefined
        });
      } else {
        await api.addProjectCost({
          project_id: selectedProject.id,
          type: costForm.type,
          description: costForm.description.trim(),
          amount: Number(costForm.amount),
          date: costForm.date,
          notes: costForm.notes.trim() || undefined
        });
      }

      await Promise.all([loadTrackingData(selectedProject.id, false), fetchProjects(false)]);
      startNewCost(costForm.type);
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel salvar o lancamento.');
    } finally {
      setSavingCost(false);
    }
  };

  const deleteCost = async (id: string) => {
    if (!selectedProject) return;
    if (!window.confirm('Deseja excluir este lancamento?')) return;

    try {
      await api.deleteProjectCost(id);
      await Promise.all([loadTrackingData(selectedProject.id, false), fetchProjects(false)]);
      if (editingCostId === id) {
        startNewCost(costForm.type);
      }
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel excluir o lancamento.');
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.EM_ANDAMENTO: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ProjectStatus.CONCLUIDO: return 'bg-green-100 text-green-700 border-green-200';
      case ProjectStatus.ORCAMENTO: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case ProjectStatus.APROVADO: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ProjectStatus.CANCELADO: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const materialTotal = projectCosts
    .filter((cost) => cost.type === 'MATERIAL')
    .reduce((sum, cost) => sum + cost.amount, 0);
  const vehicleTotal = projectCosts
    .filter((cost) => cost.type === 'VEHICLE')
    .reduce((sum, cost) => sum + cost.amount, 0);
  const laborTotal = projectCosts
    .filter((cost) => cost.type === 'LABOR')
    .reduce((sum, cost) => sum + cost.amount, 0);
  const totalCost = materialTotal + vehicleTotal + laborTotal;
  const budgetValue = Number(projectDraft?.total_value || 0);
  const balanceValue = budgetValue - totalCost;
  const budgetPercent = budgetValue > 0 ? (totalCost / budgetValue) * 100 : 0;
  const financeIndicator = getFinanceIndicator(budgetPercent);
  const filteredCosts = sortCosts(projectCosts).filter((cost) => (costFilter === 'ALL' ? true : cost.type === costFilter));
  const timelineCosts = sortCosts(projectCosts).slice(0, 5);
  const summary7Days = projectCosts.reduce((sum, cost) => sum + (isWithinDays(cost.date, 7) ? cost.amount : 0), 0);
  const summary30Days = projectCosts.reduce((sum, cost) => sum + (isWithinDays(cost.date, 30) ? cost.amount : 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Obras</h1>
          <p className="text-gray-500 text-sm">Acompanhe orçamentos e execuções em tempo real.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium transition"
        >
          <Plus size={18} className="mr-2" />
          Nova Obra
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome da obra ou cliente..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}
        >
          <option value="ALL">Todos os Status</option>
          {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 flex items-center justify-center">
            <Loader className="animate-spin mr-2" size={20} /> Carregando obras...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition duration-200 flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => void openTrackingModal(project)}
                    className="text-gray-400 hover:text-gray-600"
                    title="Acompanhar obra"
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">{project.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{project.client_name}</p>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2 text-gray-400" />
                    <span className="truncate">{project.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-2 text-gray-400" />
                    <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : 'Data não definida'}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">
                      {formatMoney(project.total_value)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 rounded-b-xl">
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Rentabilidade Estimada</span>
                    {project.profit_margin !== undefined && (
                      <span className={`font-bold ${project.profit_margin > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {formatMoney(project.profit_margin)}
                      </span>
                    )}
                 </div>
                 {project.total_cost !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full" 
                        style={{ width: `${Math.min(((project.total_cost || 0) / project.total_value) * 100, 100)}%` }}
                      ></div>
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Obra">
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título da Obra</label>
            <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              value={newProject.title}
              onChange={e => setNewProject({...newProject, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              value={newProject.client_name}
              onChange={e => setNewProject({...newProject, client_name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
              <input 
                required
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.total_value}
                onChange={e => setNewProject({...newProject, total_value: parseFloat(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.status}
                onChange={e => setNewProject({...newProject, status: e.target.value as ProjectStatus})}
              >
                {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <input 
              required
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              value={newProject.address}
              onChange={e => setNewProject({...newProject, address: e.target.value})}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
             <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Salvar Obra</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isTrackingModalOpen}
        onClose={closeTrackingModal}
        title={projectDraft ? `Acompanhar Obra - ${projectDraft.title}` : 'Acompanhar Obra'}
        maxWidth="max-w-6xl"
      >
        {!projectDraft ? (
          <div className="text-sm text-gray-500">Nenhuma obra selecionada.</div>
        ) : (
          <div className="space-y-5">
            {trackingLoading && (
              <div className="flex items-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Loader size={16} className="animate-spin mr-2" />
                Carregando dados da obra...
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-gray-200 rounded-xl p-4 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Dados e observacoes</h4>
                    <p className="text-xs text-gray-500">Acompanhe a obra e registre alteracoes</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${financeIndicator.classes}`}>
                    {financeIndicator.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={projectDraft.title} onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.status} onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value as ProjectStatus })}>
                      {Object.values(ProjectStatus).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={projectDraft.address} onChange={(e) => setProjectDraft({ ...projectDraft, address: e.target.value })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes da obra</label>
                  <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y" value={projectDraft.description || ''} onChange={(e) => setProjectDraft({ ...projectDraft, description: e.target.value })} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="font-semibold text-gray-900">Orcamento da Obra</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orcamento atual (R$)</label>
                  <input type="number" min={0} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={projectDraft.total_value} onChange={(e) => setProjectDraft({ ...projectDraft, total_value: Number(e.target.value || 0) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da alteracao</label>
                  <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ex.: acrescimo de servico" value={budgetReason} onChange={(e) => setBudgetReason(e.target.value)} />
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Custo acumulado</span><span className="font-semibold">{formatMoney(totalCost)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Saldo previsto</span><span className={`font-semibold ${balanceValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatMoney(balanceValue)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">% consumido</span><span className="font-semibold">{budgetPercent.toFixed(1)}%</span></div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className={`h-2 ${budgetPercent > 100 ? 'bg-red-500' : budgetPercent >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(Math.max(budgetPercent, 0), 100)}%` }} /></div>
                </div>
                {budgetPercent >= 80 && (
                  <div className={`text-xs rounded-lg px-3 py-2 border flex items-start ${budgetPercent > 100 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                    <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                    <span>{budgetPercent > 100 ? 'Custo acima do orcamento.' : 'Atencao: custo proximo do orcamento.'}</span>
                  </div>
                )}
                <button type="button" onClick={() => void saveTrackingProject()} disabled={savingProject} className="w-full inline-flex justify-center items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-70">
                  {savingProject ? <Loader size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                  Salvar alteracoes
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{ type: 'MATERIAL' as ProjectCostType, value: materialTotal }, { type: 'VEHICLE' as ProjectCostType, value: vehicleTotal }, { type: 'LABOR' as ProjectCostType, value: laborTotal }].map(({ type, value }) => {
                const Icon = getCostIcon(type);
                return (
                  <div key={type} className="border border-gray-200 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center"><Icon size={18} className="mr-2 text-gray-700" /><span className="text-sm font-medium text-gray-700">{costTypeLabel[type]}</span></div>
                      <button type="button" onClick={() => startNewCost(type)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Adicionar lancamento</button>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{formatMoney(value)}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="text-sm text-gray-600">Ultimos 7 dias</div>
                <div className="text-lg font-bold text-gray-900">{formatMoney(summary7Days)}</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="text-sm text-gray-600">Ultimos 30 dias</div>
                <div className="text-lg font-bold text-gray-900">{formatMoney(summary30Days)}</div>
              </div>
              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="text-sm text-gray-600">Total de lancamentos</div>
                <div className="text-lg font-bold text-gray-900">{projectCosts.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
              <div className="xl:col-span-2 border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{editingCostId ? 'Editar lancamento' : 'Novo lancamento'}</h4>
                  {editingCostId && (
                    <button type="button" onClick={() => startNewCost(costForm.type)} className="text-xs text-gray-600 hover:text-gray-800">
                      Cancelar edicao
                    </button>
                  )}
                </div>
                <form onSubmit={saveCost} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={costForm.type} onChange={(e) => setCostForm({ ...costForm, type: e.target.value as ProjectCostType })}>
                      <option value="MATERIAL">Material</option>
                      <option value="VEHICLE">Veiculo</option>
                      <option value="LABOR">Mao de obra</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ex.: Saco de gesso / Combustivel / Diaria" value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                      <input type="number" min={0} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: Number(e.target.value || 0) })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                      <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={costForm.date} onChange={(e) => setCostForm({ ...costForm, date: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observacao (opcional)</label>
                    <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-y" value={costForm.notes} onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })} />
                  </div>
                  <button type="submit" disabled={savingCost} className="w-full inline-flex justify-center items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-70">
                    {savingCost ? <Loader size={16} className="animate-spin mr-2" /> : <PlusCircle size={16} className="mr-2" />}
                    {editingCostId ? 'Salvar lancamento' : 'Adicionar lancamento'}
                  </button>
                </form>
              </div>

              <div className="xl:col-span-3 border border-gray-200 rounded-xl p-4 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">Lancamentos da Obra</h4>
                    <p className="text-xs text-gray-500">Lista, filtro por tipo, edicao e exclusao</p>
                  </div>
                  <select className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm" value={costFilter} onChange={(e) => setCostFilter(e.target.value as CostFilter)}>
                    <option value="ALL">Todos</option>
                    <option value="MATERIAL">Material</option>
                    <option value="VEHICLE">Veiculo</option>
                    <option value="LABOR">Mao de obra</option>
                  </select>
                </div>

                {filteredCosts.length === 0 ? (
                  <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-4">Nenhum lancamento para o filtro selecionado.</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredCosts.map((cost) => {
                      const Icon = getCostIcon(cost.type);
                      return (
                        <div key={cost.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><Icon size={16} className="text-gray-700" /></div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900">{cost.description}</div>
                                <div className="text-xs text-gray-500">{costTypeLabel[cost.type]} - {new Date(`${cost.date}T00:00:00`).toLocaleDateString('pt-BR')}</div>
                                {cost.notes && <div className="text-xs text-gray-600 mt-1">{cost.notes}</div>}
                              </div>
                            </div>
                            <div className="flex items-start gap-2 shrink-0">
                              <span className="text-sm font-semibold text-gray-900">{formatMoney(cost.amount)}</span>
                              <button type="button" onClick={() => startEditCost(cost)} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Editar"><Pencil size={14} /></button>
                              <button type="button" onClick={() => void deleteCost(cost.id)} className="p-1.5 rounded hover:bg-red-100 text-red-600" title="Excluir"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Linha do tempo (recentes)</h5>
                    {timelineCosts.length === 0 ? (
                      <div className="text-xs text-gray-500">Sem lancamentos.</div>
                    ) : (
                      <div className="space-y-2">
                        {timelineCosts.map((cost) => (
                          <div key={`timeline-${cost.id}`} className="text-xs text-gray-600">
                            <span className="font-medium text-gray-800">{new Date(`${cost.date}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                            {' - '}
                            {costTypeLabel[cost.type]}: {cost.description} ({formatMoney(cost.amount)})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-3">
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Historico de orcamento</h5>
                    {budgetRevisions.length === 0 ? (
                      <div className="text-xs text-gray-500">Nenhuma alteracao registrada.</div>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {budgetRevisions.map((item) => (
                          <div key={item.id} className="text-xs text-gray-600 border-b border-gray-100 pb-2 last:border-b-0">
                            <div className="text-gray-500">{new Date(item.changed_at).toLocaleString('pt-BR')}</div>
                            <div><span className="font-medium">{formatMoney(item.previous_value)}</span> {' -> '} <span className="font-medium">{formatMoney(item.new_value)}</span></div>
                            <div>{item.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
      </div>
  );
};

export default Projects;
