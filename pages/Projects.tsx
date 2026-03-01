import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Calendar, DollarSign, Loader, MapPin, Package, Plus, Save, Search, Truck, Users } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { Material, Project, ProjectCost, ProjectStatus, Employee, Vehicle, ProjectQuoteItem } from '../types';

interface ProjectsProps {
  initialSearchTerm?: string;
}

type ProjectCostType = ProjectCost['type'];

interface NewProjectFormState {
  title: string;
  client_name: string;
  total_value: string;
  address: string;
  status: ProjectStatus;
  execution_deadline_days: string;
}

interface GenericCostFormState {
  type: Exclude<ProjectCostType, 'MATERIAL'>;
  description: string;
  amount: string;
  date: string;
  notes: string;
  employee_id?: string;
  worker_name: string;
  vehicle_id?: string;
  labor_daily_value: string;
  labor_snack_value: string;
  labor_transport_value: string;
  vehicle_fuel_value: string;
  vehicle_toll_value: string;
  vehicle_maintenance_value: string;
}

interface MaterialSelectionState {
  selected: boolean;
  quantity: string;
}

interface MaterialCostFormState {
  date: string;
  notes: string;
  selections: Record<string, MaterialSelectionState>;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatMoney = (value?: number) => money.format(Number(value || 0));

const formatQuantity = (value: number) => {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
};

const todayDate = () => new Date().toISOString().split('T')[0];

const emptyNewProject = (): NewProjectFormState => ({
  title: '',
  client_name: '',
  total_value: '',
  address: '',
  status: ProjectStatus.ORCAMENTO,
  execution_deadline_days: ''
});

const emptyGenericCostForm = (
  type: Exclude<ProjectCostType, 'MATERIAL'> = 'VEHICLE'
): GenericCostFormState => ({
  type,
  description: '',
  amount: '',
  date: todayDate(),
  notes: '',
  employee_id: '',
  worker_name: '',
  vehicle_id: '',
  labor_daily_value: '',
  labor_snack_value: '',
  labor_transport_value: '',
  vehicle_fuel_value: '',
  vehicle_toll_value: '',
  vehicle_maintenance_value: ''
});

const buildMaterialSelections = (materials: Material[]): Record<string, MaterialSelectionState> =>
  materials.reduce<Record<string, MaterialSelectionState>>((acc, material) => {
    acc[material.id] = { selected: false, quantity: '' };
    return acc;
  }, {});

const emptyMaterialCostForm = (materials: Material[]): MaterialCostFormState => ({
  date: todayDate(),
  notes: '',
  selections: buildMaterialSelections(materials)
});

const toNumber = (value: string | number | undefined) => {
  if (typeof value === 'string' && !value.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const costTypeLabel: Record<ProjectCostType, string> = {
  MATERIAL: 'Material',
  VEHICLE: 'Veiculo',
  LABOR: 'Mao de obra'
};

const getCostIcon = (type: ProjectCostType) => {
  switch (type) {
    case 'MATERIAL':
      return Package;
    case 'VEHICLE':
      return Truck;
    case 'LABOR':
      return Users;
    default:
      return Package;
  }
};

const getFinanceIndicator = (percent: number) => {
  if (percent > 100) return { label: 'Estourado', classes: 'bg-red-100 text-red-700 border-red-200' };
  if (percent >= 80) return { label: 'Atencao', classes: 'bg-amber-100 text-amber-700 border-amber-200' };
  return { label: 'Saudavel', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
};

const getStatusColor = (status: ProjectStatus) => {
  switch (status) {
    case ProjectStatus.EM_ANDAMENTO:
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case ProjectStatus.CONCLUIDO:
      return 'bg-green-100 text-green-700 border-green-200';
    case ProjectStatus.ORCAMENTO:
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case ProjectStatus.APROVADO:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case ProjectStatus.CANCELADO:
      return 'bg-red-100 text-red-700 border-red-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const sortCosts = (costs: ProjectCost[]) =>
  [...costs].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });

const Projects: React.FC<ProjectsProps> = ({ initialSearchTerm = '' }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<NewProjectFormState>(emptyNewProject());
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [projectCosts, setProjectCosts] = useState<ProjectCost[]>([]);
  const [savingProject, setSavingProject] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [activeCostType, setActiveCostType] = useState<ProjectCostType | null>(null);
  const [genericCostForm, setGenericCostForm] = useState<GenericCostFormState>(emptyGenericCostForm());
  const [materialCostForm, setMaterialCostForm] = useState<MaterialCostFormState>(emptyMaterialCostForm([]));
  const [inventoryMaterials, setInventoryMaterials] = useState<Material[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [savingCost, setSavingCost] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteItems, setQuoteItems] = useState<Omit<ProjectQuoteItem, 'id' | 'project_id'>[]>([]);
  const [savingQuote, setSavingQuote] = useState(false);

  useEffect(() => {
    void fetchProjects();
    void fetchBaseData();
  }, []);

  const fetchBaseData = async () => {
    try {
      const [empData, vehData] = await Promise.all([api.getEmployees(), api.getVehicles()]);
      setEmployees(empData);
      setVehicles(vehData);
    } catch (error) {
      console.error('Erro ao carregar dados base:', error);
    }
  };

  useEffect(() => {
    if (initialSearchTerm) setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const fetchProjects = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
      if (!selectedProject) return;
      const updated = data.find((project) => project.id === selectedProject.id);
      if (!updated) return;
      setSelectedProject((prev) => (prev ? { ...prev, ...updated } : updated));
      setProjectDraft((prev) =>
        prev && prev.id === updated.id
          ? {
            ...prev,
            title: updated.title,
            status: updated.status,
            address: updated.address,
            client_name: updated.client_name,
            total_cost: updated.total_cost,
            profit_margin: updated.profit_margin,
            total_value: updated.total_value,
            entry_value: updated.entry_value ?? prev.entry_value,
            execution_deadline_days: updated.execution_deadline_days
          }
          : prev
      );
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const loadTrackingData = async (projectId: string, replaceDraft = false) => {
    setTrackingLoading(true);
    setTrackingNotice(null);

    const [projectResult, costsResult] = await Promise.allSettled([api.getProjectById(projectId), api.getProjectCosts(projectId)]);
    let nextNotice: string | null = null;

    if (projectResult.status === 'fulfilled' && projectResult.value) {
      const projectData = projectResult.value;
      setSelectedProject(projectData);
      setProjectDraft((prev) =>
        !prev || prev.id !== projectId || replaceDraft
          ? { ...projectData }
          : {
            ...prev,
            title: projectData.title,
            status: projectData.status,
            address: projectData.address,
            client_name: projectData.client_name,
            total_cost: projectData.total_cost,
            profit_margin: projectData.profit_margin,
            total_value: projectData.total_value,
            entry_value: projectData.entry_value ?? prev.entry_value,
            execution_deadline_days: projectData.execution_deadline_days
          }
      );
    } else {
      console.error(projectResult.status === 'rejected' ? projectResult.reason : 'Projeto nao encontrado');
      nextNotice = 'Alguns dados da obra nao puderam ser carregados agora.';
    }

    if (costsResult.status === 'fulfilled') {
      setProjectCosts(sortCosts(costsResult.value));
    } else {
      console.error(costsResult.reason);
      setProjectCosts([]);
      nextNotice = nextNotice || 'Os lancamentos da obra nao puderam ser carregados agora.';
    }

    setTrackingNotice(nextNotice);
    setTrackingLoading(false);
  };

  const refreshInventoryMaterials = async () => {
    setInventoryLoading(true);
    try {
      const materials = await api.getInventory();
      setInventoryMaterials(materials);
      return materials;
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel carregar os materiais do estoque.');
      return [];
    } finally {
      setInventoryLoading(false);
    }
  };

  const openTrackingModal = async (project: Project) => {
    setIsTrackingModalOpen(true);
    setSelectedProject(project);
    setProjectDraft({ ...project });
    setProjectCosts([]);
    setTrackingNotice(null);
    setIsCostModalOpen(false);
    setActiveCostType(null);
    setGenericCostForm(emptyGenericCostForm());
    setMaterialCostForm(emptyMaterialCostForm(inventoryMaterials));
    await loadTrackingData(project.id, true);
  };

  const closeTrackingModal = () => {
    setIsTrackingModalOpen(false);
    setSelectedProject(null);
    setProjectDraft(null);
    setProjectCosts([]);
    setTrackingNotice(null);
    setIsCostModalOpen(false);
    setActiveCostType(null);
    setGenericCostForm(emptyGenericCostForm());
    setMaterialCostForm(emptyMaterialCostForm(inventoryMaterials));
  };

  const closeCostModal = () => {
    if (savingCost) return;
    setIsCostModalOpen(false);
    setActiveCostType(null);
  };

  const openCostModal = async (type: ProjectCostType) => {
    setActiveCostType(type);
    setIsCostModalOpen(true);
    if (type === 'MATERIAL') {
      const materials = await refreshInventoryMaterials();
      setMaterialCostForm(emptyMaterialCostForm(materials));
      return;
    }
    setGenericCostForm(emptyGenericCostForm(type));
  };

  const openQuoteModal = async (project: Project) => {
    setSelectedProject(project);
    setIsQuoteModalOpen(true);
    try {
      const items = await api.getProjectServiceItems(project.id);
      setQuoteItems(items.length > 0 ? items : [{ description: '', quantity: 1, unit_value: 0, total_value: 0, order_index: 0 }]);
    } catch (error) {
      console.error(error);
      setQuoteItems([{ description: '', quantity: 1, unit_value: 0, total_value: 0, order_index: 0 }]);
    }
  };

  const saveQuoteItems = async () => {
    if (!selectedProject) return;
    setSavingQuote(true);
    try {
      const validItems = quoteItems.filter(item => item.description.trim());
      await api.updateProjectServiceItems(selectedProject.id, validItems);

      const totalValue = validItems.reduce((acc, curr) => acc + curr.total_value, 0);
      if (totalValue !== selectedProject.total_value) {
        await api.updateProject({ ...selectedProject, total_value: totalValue });
      }

      await fetchProjects(false);
      setIsQuoteModalOpen(false);
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel salvar os itens do orcamento.');
    } finally {
      setSavingQuote(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim() || !newProject.client_name.trim()) return;

    setLoading(true);
    try {
      const clientName = newProject.client_name.trim();
      const allClients = await api.getClients();
      const existingClient = allClients.find((client) => client.name.trim().toLowerCase() === clientName.toLowerCase());

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
        title: newProject.title.trim(),
        client_id: clientId,
        client_name: clientName,
        description: '',
        status: newProject.status,
        start_date: todayDate(),
        end_date: undefined,
        total_value: toNumber(newProject.total_value),
        entry_value: 0,
        address: newProject.address.trim(),
        execution_deadline_days: toNumber(newProject.execution_deadline_days)
      });

      await fetchProjects(false);
      setIsModalOpen(false);
      setNewProject(emptyNewProject());
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel cadastrar a obra.');
    } finally {
      setLoading(false);
    }
  };

  const saveTrackingProject = async () => {
    if (!projectDraft || !selectedProject) return;
    setSavingProject(true);
    try {
      await api.updateProject(projectDraft);
      await Promise.all([loadTrackingData(projectDraft.id, true), fetchProjects(false)]);
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel salvar o acompanhamento da obra.');
    } finally {
      setSavingProject(false);
    }
  };

  const saveGenericCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    if (!genericCostForm.description.trim()) {
      window.alert('Informe a descricao do lancamento.');
      return;
    }
    if (toNumber(genericCostForm.amount) <= 0) {
      window.alert('Informe um valor maior que zero.');
      return;
    }

    setSavingCost(true);
    try {
      const daily = toNumber(genericCostForm.labor_daily_value);
      const snack = toNumber(genericCostForm.labor_snack_value);
      const transport = toNumber(genericCostForm.labor_transport_value);
      const fuel = toNumber(genericCostForm.vehicle_fuel_value);
      const toll = toNumber(genericCostForm.vehicle_toll_value);
      const maint = toNumber(genericCostForm.vehicle_maintenance_value);

      await api.addProjectCost({
        project_id: selectedProject.id,
        type: genericCostForm.type,
        description: genericCostForm.description.trim(),
        amount: toNumber(genericCostForm.amount),
        date: genericCostForm.date,
        employee_id: genericCostForm.employee_id || undefined,
        worker_name: genericCostForm.worker_name.trim() || undefined,
        vehicle_id: genericCostForm.vehicle_id || undefined,
        labor_daily_value: daily,
        labor_snack_value: snack,
        labor_transport_value: transport,
        vehicle_fuel_value: fuel,
        vehicle_toll_value: toll,
        vehicle_maintenance_value: maint,
        notes: genericCostForm.notes.trim() || undefined
      });

      await Promise.all([loadTrackingData(selectedProject.id, false), fetchProjects(false)]);
      setIsCostModalOpen(false);
      setActiveCostType(null);
      setGenericCostForm(emptyGenericCostForm(genericCostForm.type));
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel salvar o lancamento.');
    } finally {
      setSavingCost(false);
    }
  };

  const saveMaterialCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const selectedItems = inventoryMaterials
      .map((material) => {
        const selection = materialCostForm.selections[material.id] || { selected: false, quantity: '' };
        return {
          material,
          isSelected: selection.selected,
          requestedQuantity: toNumber(selection.quantity),
          deductedQuantity: Math.min(toNumber(selection.quantity), Number(material.quantity || 0))
        };
      })
      .filter((item) => item.isSelected);

    if (selectedItems.length === 0) {
      window.alert('Selecione pelo menos um material para o lancamento.');
      return;
    }
    if (selectedItems.some((item) => item.requestedQuantity <= 0)) {
      window.alert('Informe a quantidade dos materiais selecionados.');
      return;
    }

    setSavingCost(true);
    try {
      for (const item of selectedItems) {
        const totalAmount = Number((item.requestedQuantity * Number(item.material.price_cost || 0)).toFixed(2));
        const missingQuantity = Math.max(item.requestedQuantity - item.deductedQuantity, 0);
        const noteParts = [materialCostForm.notes.trim()].filter(Boolean);

        if (item.deductedQuantity > 0) noteParts.push(`Baixa em estoque: ${formatQuantity(item.deductedQuantity)} ${item.material.unit}`);
        if (missingQuantity > 0) noteParts.push(`Sem estoque para ${formatQuantity(missingQuantity)} ${item.material.unit}`);

        await api.addProjectCost({
          project_id: selectedProject.id,
          type: 'MATERIAL',
          description: `${item.material.name} (${formatQuantity(item.requestedQuantity)} ${item.material.unit})`,
          amount: totalAmount,
          date: materialCostForm.date,
          material_id: item.material.id,
          quantity: item.requestedQuantity,
          inventory_deducted_quantity: item.deductedQuantity,
          notes: noteParts.join(' | ') || undefined
        });

        if (item.deductedQuantity > 0) {
          await api.addInventoryMovement({
            material_id: item.material.id,
            movement_type: 'Sa\u00edda',
            quantity: item.deductedQuantity,
            unit_cost: Number(item.material.price_cost || 0),
            project_id: selectedProject.id,
            notes: `Saida para a obra ${selectedProject.title}`,
            movement_date: materialCostForm.date
          });
        }
      }

      const hasShortage = selectedItems.some((item) => item.requestedQuantity > item.deductedQuantity);
      await Promise.all([loadTrackingData(selectedProject.id, false), fetchProjects(false)]);
      const materials = await refreshInventoryMaterials();
      setMaterialCostForm(emptyMaterialCostForm(materials));
      setIsCostModalOpen(false);
      setActiveCostType(null);

      if (hasShortage) {
        window.alert('Alguns materiais foram adicionados, mas nao havia estoque suficiente para toda a quantidade informada.');
      }
    } catch (error) {
      console.error(error);
      window.alert('Nao foi possivel salvar o lancamento de material.');
    } finally {
      setSavingCost(false);
    }
  };

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(normalizedSearch) || project.client_name?.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const materialTotal = projectCosts.filter((cost) => cost.type === 'MATERIAL').reduce((sum, cost) => sum + cost.amount, 0);
  const vehicleTotal = projectCosts.filter((cost) => cost.type === 'VEHICLE').reduce((sum, cost) => sum + cost.amount, 0);
  const laborTotal = projectCosts.filter((cost) => cost.type === 'LABOR').reduce((sum, cost) => sum + cost.amount, 0);
  const totalCost = materialTotal + vehicleTotal + laborTotal;
  const budgetValue = Number(projectDraft?.total_value || 0);
  const entryValue = Number(projectDraft?.entry_value || 0);
  const balanceValue = budgetValue - entryValue;
  const budgetPercent = budgetValue > 0 ? (totalCost / budgetValue) * 100 : 0;
  const financeIndicator = getFinanceIndicator(budgetPercent);

  const materialRows = inventoryMaterials.map((material) => {
    const selection = materialCostForm.selections[material.id] || { selected: false, quantity: '' };
    const requestedQuantity = toNumber(selection.quantity);
    const availableQuantity = Number(material.quantity || 0);
    const missingQuantity = Math.max(requestedQuantity - availableQuantity, 0);
    const subtotal = requestedQuantity * Number(material.price_cost || 0);

    return {
      material,
      selected: selection.selected,
      quantityValue: selection.quantity,
      availableQuantity,
      missingQuantity,
      subtotal
    };
  });

  const selectedMaterialRows = materialRows.filter((row) => row.selected);
  const selectedMaterialTotal = selectedMaterialRows.reduce((sum, row) => sum + row.subtotal, 0);
  const shortageRows = selectedMaterialRows.filter((row) => row.missingQuantity > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Obras</h1>
          <p className="text-gray-500 text-sm">Acompanhe orcamentos e execucoes em tempo real.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-sm font-medium transition">
          <Plus size={18} className="mr-2" />
          Nova Obra
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder="Buscar por nome da obra ou cliente..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-gray-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}>
          <option value="ALL">Todos os Status</option>
          {Object.values(ProjectStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 flex items-center justify-center">
          <Loader className="animate-spin mr-2" size={20} /> Carregando obras...
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-10 text-center text-gray-500">
          Nenhuma obra encontrada para o filtro atual.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition duration-200 flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>{project.status}</span>
                  <button type="button" onClick={() => void openTrackingModal(project)} className="text-gray-400 hover:text-gray-600" title="Acompanhar obra">
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
                    <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : 'Data nao definida'}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-gray-400" />
                    <span className="font-medium text-gray-900">{formatMoney(project.total_value)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 rounded-b-xl">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Rentabilidade Estimada</span>
                  {project.profit_margin !== undefined && <span className={`font-bold ${project.profit_margin > 0 ? 'text-green-600' : 'text-gray-600'}`}>{formatMoney(project.profit_margin)}</span>}
                </div>
                {project.total_cost !== undefined && project.total_value > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(((project.total_cost || 0) / project.total_value) * 100, 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Obra">
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titulo da Obra</label>
            <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" value={newProject.title} onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" value={newProject.client_name} onChange={(e) => setNewProject((prev) => ({ ...prev, client_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
              <input required type="number" step="0.01" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" value={newProject.total_value} onChange={(e) => setNewProject((prev) => ({ ...prev, total_value: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" value={newProject.status} onChange={(e) => setNewProject((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))}>
                {Object.values(ProjectStatus).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
            <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" value={newProject.address} onChange={(e) => setNewProject((prev) => ({ ...prev, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Execucao (dias)</label>
            <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900" value={newProject.execution_deadline_days} onChange={(e) => setNewProject((prev) => ({ ...prev, execution_deadline_days: e.target.value }))} placeholder="Ex: 30" />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Salvar Obra</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isTrackingModalOpen} onClose={closeTrackingModal} title={projectDraft ? `Acompanhamento da Obra - ${projectDraft.title}` : 'Acompanhamento da Obra'} maxWidth="max-w-6xl">
        {!projectDraft ? (
          <div className="text-sm text-gray-500">Nenhuma obra selecionada.</div>
        ) : (
          <div className="space-y-5">
            {trackingLoading && <div className="flex items-center text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"><Loader size={16} className="animate-spin mr-2" />Carregando dados da obra...</div>}
            {trackingNotice && <div className="flex items-start text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"><AlertTriangle size={16} className="mr-2 mt-0.5 shrink-0" /><span>{trackingNotice}</span></div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 border border-gray-200 rounded-xl p-4 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Dados da obra</h4>
                    <p className="text-xs text-gray-500">Somente os campos principais do acompanhamento.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${financeIndicator.classes}`}>{financeIndicator.label}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titulo</label>
                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.title} onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.status} onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value as ProjectStatus })}>
                      {Object.values(ProjectStatus).map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">{projectDraft.client_name || '-'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
                    <input className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.address} onChange={(e) => setProjectDraft({ ...projectDraft, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (dias)</label>
                    <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.execution_deadline_days || ''} onChange={(e) => setProjectDraft({ ...projectDraft, execution_deadline_days: toNumber(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Orcamento da Obra</h4>
                  <button
                    type="button"
                    onClick={() => openQuoteModal(projectDraft)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold underline"
                  >
                    Orcamento Detalhado
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orcamento atual (R$)</label>
                  <input type="number" min={0} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.total_value || ''} onChange={(e) => setProjectDraft({ ...projectDraft, total_value: Number(e.target.value || 0) })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entrada (R$)</label>
                  <input type="number" min={0} step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={projectDraft.entry_value || ''} onChange={(e) => setProjectDraft({ ...projectDraft, entry_value: Number(e.target.value || 0) })} />
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Saldo</span>
                    <span className={`font-semibold ${balanceValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatMoney(balanceValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Custo acumulado</span>
                    <span className="font-semibold">{formatMoney(totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">% consumido</span>
                    <span className="font-semibold">{budgetPercent.toFixed(1)}%</span>
                  </div>
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
                      <button type="button" onClick={() => void openCostModal(type)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Adicionar lancamento</button>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{formatMoney(value)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isCostModalOpen} onClose={closeCostModal} title={activeCostType ? `Adicionar lancamento - ${costTypeLabel[activeCostType]}` : 'Adicionar lancamento'} fullScreen bodyClassName="bg-gray-50">
        {activeCostType === 'MATERIAL' ? (
          <form onSubmit={saveMaterialCost} className="h-full flex flex-col gap-6">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
              <div className="xl:col-span-3 bg-white border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={materialCostForm.date} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, date: e.target.value }))} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" placeholder="Opcional" value={materialCostForm.notes} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Itens marcados</div>
                  <div className="text-2xl font-bold text-gray-900">{selectedMaterialRows.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total do lancamento</div>
                  <div className="text-2xl font-bold text-gray-900">{formatMoney(selectedMaterialTotal)}</div>
                </div>
                <p className="text-xs text-gray-500">Todos os materiais cadastrados aparecem aqui, com ou sem saldo no estoque.</p>
              </div>
            </div>

            {shortageRows.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Alguns itens selecionados nao tem saldo suficiente em estoque. O lancamento sera salvo mesmo assim, apenas com aviso.</div>}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex-1 min-h-0">
              <div className="grid grid-cols-[80px_minmax(240px,2fr)_140px_160px_140px_140px] gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Marcar</span>
                <span>Material</span>
                <span>Custo</span>
                <span>Estoque</span>
                <span>Quantidade</span>
                <span>Subtotal</span>
              </div>

              <div className="divide-y divide-gray-100 overflow-y-auto h-full">
                {inventoryLoading ? (
                  <div className="py-16 text-center text-gray-500"><Loader className="animate-spin mx-auto mb-3" size={24} />Carregando materiais...</div>
                ) : materialRows.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">Nenhum material cadastrado no estoque.</div>
                ) : (
                  materialRows.map((row) => (
                    <div key={row.material.id} className={`grid grid-cols-[80px_minmax(240px,2fr)_140px_160px_140px_140px] gap-4 px-4 py-4 items-start ${row.selected ? 'bg-blue-50/40' : 'bg-white'}`}>
                      <label className="flex items-center gap-2 pt-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={row.selected} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, selections: { ...prev.selections, [row.material.id]: { selected: e.target.checked, quantity: e.target.checked ? prev.selections[row.material.id]?.quantity || '' : '' } } }))} />
                        <span className="text-sm text-gray-600">Item</span>
                      </label>

                      <div>
                        <div className="font-medium text-gray-900">{row.material.name}</div>
                        <div className="text-xs text-gray-500">Unidade: {row.material.unit}{row.material.supplier ? ` | Fornecedor: ${row.material.supplier}` : ''}</div>
                        {row.selected && row.missingQuantity > 0 && <div className="text-xs text-amber-700 mt-1">Faltam {formatQuantity(row.missingQuantity)} {row.material.unit} no estoque para esse item.</div>}
                      </div>

                      <div className="pt-2 font-medium text-gray-900">{formatMoney(row.material.price_cost)}</div>

                      <div className="pt-2">
                        {row.availableQuantity > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Saldo: {formatQuantity(row.availableQuantity)} {row.material.unit}</span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">Sem saldo</span>
                        )}
                      </div>

                      <div>
                        <input type="number" min="0" step="0.001" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100" value={row.quantityValue} disabled={!row.selected} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, selections: { ...prev.selections, [row.material.id]: { selected: true, quantity: e.target.value } } }))} />
                      </div>

                      <div className="pt-2 font-semibold text-gray-900">{formatMoney(row.subtotal)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 flex flex-col sm:flex-row justify-between gap-3">
              <div className="text-sm text-gray-600">{shortageRows.length > 0 ? `${shortageRows.length} item(ns) ficarao com aviso de compra fora do estoque.` : 'Somente o saldo disponivel sera baixado automaticamente do estoque.'}</div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeCostModal} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium" disabled={savingCost}>Cancelar</button>
                <button type="submit" disabled={savingCost || inventoryLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 inline-flex items-center">
                  {savingCost ? <Loader size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                  Salvar lancamento
                </button>
              </div>
            </div>
          </form>
        ) : activeCostType ? (
          <form onSubmit={saveGenericCost} className="h-full flex flex-col gap-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Informacoes Basicas</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descricao do Lancamento</label>
                    <input type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder={`Ex: ${activeCostType === 'LABOR' ? 'Montagem de Sanca' : 'Deslocamento ate a obra'}`} value={genericCostForm.description} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valor Total (R$)</label>
                      <input type="number" required min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white font-semibold text-blue-700" value={genericCostForm.amount} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, amount: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                      <input type="date" required className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white" value={genericCostForm.date} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, date: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {activeCostType === 'LABOR' && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 space-y-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-semibold text-blue-900 border-b border-blue-100 pb-2 flex items-center">
                      <Users size={18} className="mr-2" /> Detalhamento de Mao de Obra
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-blue-800 mb-1">Nome do Montador</label>
                        <input
                          type="text"
                          required
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white"
                          placeholder="Ex: Gesiel Gesseiro"
                          value={genericCostForm.worker_name}
                          onChange={(e) => setGenericCostForm((prev) => ({ ...prev, worker_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Valor da Diaria (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white" placeholder="0,00" value={genericCostForm.labor_daily_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, labor_daily_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Valor Alimento / Lanche (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white" placeholder="0,00" value={genericCostForm.labor_snack_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, labor_snack_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-1">Passagem / Transporte (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-blue-200 rounded-lg bg-white" placeholder="0,00" value={genericCostForm.labor_transport_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, labor_transport_value: e.target.value }))} />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition text-sm"
                          onClick={() => {
                            const total = toNumber(genericCostForm.labor_daily_value) + toNumber(genericCostForm.labor_snack_value) + toNumber(genericCostForm.labor_transport_value);
                            if (total > 0) setGenericCostForm(prev => ({ ...prev, amount: total.toString() }));
                          }}
                        >
                          Somar ao Valor Total
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeCostType === 'VEHICLE' && (
                  <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-6 space-y-4 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-semibold text-orange-900 border-b border-orange-100 pb-2 flex items-center">
                      <Truck size={18} className="mr-2" /> Detalhamento de Veiculo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-orange-800 mb-1">Veiculo</label>
                        <select className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white" value={genericCostForm.vehicle_id} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_id: e.target.value }))}>
                          <option value="">Selecione um veiculo (opcional)</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-1">Combustivel (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white" placeholder="0,00" value={genericCostForm.vehicle_fuel_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_fuel_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-1">Pedagio (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white" placeholder="0,00" value={genericCostForm.vehicle_toll_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_toll_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-1">Manutencao/Outros (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-orange-200 rounded-lg bg-white" placeholder="0,00" value={genericCostForm.vehicle_maintenance_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_maintenance_value: e.target.value }))} />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="w-full px-3 py-2 bg-orange-100 text-orange-700 rounded-lg font-semibold hover:bg-orange-200 transition text-sm"
                          onClick={() => {
                            const total = toNumber(genericCostForm.vehicle_fuel_value) + toNumber(genericCostForm.vehicle_toll_value) + toNumber(genericCostForm.vehicle_maintenance_value);
                            if (total > 0) setGenericCostForm(prev => ({ ...prev, amount: total.toString() }));
                          }}
                        >
                          Somar ao Valor Total
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-2">Observacoes</h3>
                  <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white resize-y focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Relate detalhes adicionais sobre esse custo..." value={genericCostForm.notes} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, notes: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Tipo de lancamento</div>
                  <div className={`text-2xl font-black ${activeCostType === 'LABOR' ? 'text-blue-600' : 'text-orange-600'}`}>{costTypeLabel[activeCostType]}</div>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 italic text-sm text-gray-600">
                    "{activeCostType === 'LABOR' ? 'Use esse espaco para cadastrar diarias de montadores, ajudantes e gastos com alimentacao no local.' : 'Cadastre aqui gastos com combustivel e pedagios relativos ao transporte para essa obra.'}"
                  </div>
                </div>

                <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg space-y-2">
                  <div className="text-xs opacity-80 uppercase font-bold">Resumo Financeiro</div>
                  <div className="text-3xl font-black">{formatMoney(toNumber(genericCostForm.amount))}</div>
                  <div className="text-xs opacity-80">Lancamento para a obra: <br /><span className="font-bold underline">{selectedProject?.title}</span></div>
                </div>
              </div>
            </div>

            <div className="mt-auto border-t border-gray-200 pt-6 flex justify-end gap-3 bg-white -mx-6 -mb-6 p-6 rounded-b-xl">
              <button type="button" onClick={closeCostModal} className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-bold transition" disabled={savingCost}>Cancelar</button>
              <button type="submit" disabled={savingCost} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-70 inline-flex items-center shadow-md transition-all active:scale-95">
                {savingCost ? <Loader size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                Confirmar Lancamento
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} title={`Orcamento Detalhado - ${selectedProject?.title}`} maxWidth="max-w-4xl">
        {!selectedProject ? (
          <div className="text-sm text-gray-500">Nenhuma obra selecionada.</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-blue-900">Total do Orcamento</h4>
                <p className="text-2xl font-black text-blue-700">{formatMoney(quoteItems.reduce((acc, curr) => acc + curr.total_value, 0))}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const text = `Orcamento: ${selectedProject.title}\nCliente: ${selectedProject.client_name}\n\nServicos:\n${quoteItems.map(item => `- ${item.description}: ${formatMoney(item.total_value)}`).join('\n')}\n\nTotal: ${formatMoney(quoteItems.reduce((acc, curr) => acc + curr.total_value, 0))}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm"
              >
                <Truck size={18} />
                Compartilhar WhatsApp
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500">
                    <th className="px-4 py-3">Descricao do Servico</th>
                    <th className="px-4 py-3 w-24">Qtd</th>
                    <th className="px-4 py-3 w-32">Unit. (R$)</th>
                    <th className="px-4 py-3 w-36">Total (R$)</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 italic">
                  {quoteItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                          placeholder="Ex: Forro de Gesso liso"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].description = e.target.value;
                            setQuoteItems(newItems);
                          }}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].quantity = Number(e.target.value);
                            newItems[index].total_value = newItems[index].quantity * newItems[index].unit_value;
                            setQuoteItems(newItems);
                          }}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                          value={item.unit_value}
                          onChange={(e) => {
                            const newItems = [...quoteItems];
                            newItems[index].unit_value = Number(e.target.value);
                            newItems[index].total_value = newItems[index].quantity * newItems[index].unit_value;
                            setQuoteItems(newItems);
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 font-bold text-gray-900">
                        {formatMoney(item.total_value)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Plus size={16} className="rotate-45" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => setQuoteItems([...quoteItems, { description: '', quantity: 1, unit_value: 0, total_value: 0, order_index: quoteItems.length }])}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
            >
              <Plus size={18} />
              Adicionar Linha
            </button>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setIsQuoteModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancelar</button>
              <button
                onClick={saveQuoteItems}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-70 inline-flex items-center"
                disabled={savingQuote}
              >
                {savingQuote ? <Loader size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                Salvar Orcamento
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Projects;

