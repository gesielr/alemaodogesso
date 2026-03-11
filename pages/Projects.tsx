import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Calendar, DollarSign, Download, Filter, Loader, MapPin, Package, Plus, RefreshCcw, Save, Search, Truck, Users } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { Material, Project, ProjectCost, ProjectStatus, Employee, Vehicle, ProjectQuoteItem, ProjectQuoteDocument } from '../types';
import { createBasePdf, addStyledTable, downloadBlob, sanitizePdfFilename } from '../utils/pdf';

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
  service: string;
  execution_time: string;
  material_cost: string;
  vehicle_cost: string;
  labor_cost: string;
  tax_cost: string;
  invoice_sent: boolean;
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
  extraMaterials: { name: string; unit: string; quantity: string; price_cost: string }[];
  activeTab: 'STOCK' | 'EXTRA';
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
  execution_deadline_days: '',
  service: '',
  execution_time: '',
  material_cost: '',
  vehicle_cost: '',
  labor_cost: '',
  tax_cost: '',
  invoice_sent: false
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
  selections: buildMaterialSelections(materials),
  extraMaterials: [],
  activeTab: 'STOCK'
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
  const [quoteItems, setQuoteItems] = useState<Omit<ProjectQuoteItem, 'id' | 'project_id'>[]>([{ description: '', quantity: 0, unit_value: 0, total_value: 0, order_index: 0 }]);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteDocuments, setQuoteDocuments] = useState<ProjectQuoteDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

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
              execution_deadline_days: updated.execution_deadline_days ?? prev.execution_deadline_days,
              service: updated.service ?? prev.service,
              execution_time: updated.execution_time ?? prev.execution_time,
              material_cost: updated.material_cost ?? prev.material_cost,
              vehicle_cost: updated.vehicle_cost ?? prev.vehicle_cost,
              labor_cost: updated.labor_cost ?? prev.labor_cost,
              tax_cost: updated.tax_cost ?? prev.tax_cost,
              invoice_sent: updated.invoice_sent ?? prev.invoice_sent
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
              execution_deadline_days: projectData.execution_deadline_days ?? prev.execution_deadline_days,
              service: projectData.service ?? prev.service,
              execution_time: projectData.execution_time ?? prev.execution_time,
              material_cost: projectData.material_cost ?? prev.material_cost,
              vehicle_cost: projectData.vehicle_cost ?? prev.vehicle_cost,
              labor_cost: projectData.labor_cost ?? prev.labor_cost,
              tax_cost: projectData.tax_cost ?? prev.tax_cost,
              invoice_sent: projectData.invoice_sent ?? prev.invoice_sent
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
    setLoadingDocs(true);
    try {
      const [items, docs] = await Promise.all([
        api.getProjectServiceItems(project.id),
        api.getProjectQuoteDocuments(project.id)
      ]);
      setQuoteItems(items.length > 0 ? items : [{ description: '', quantity: 1, unit_value: 0, total_value: 0, order_index: 0 }]);
      setQuoteDocuments(docs);
    } catch (error) {
      console.error(error);
      setQuoteItems([{ description: '', quantity: 1, unit_value: 0, total_value: 0, order_index: 0 }]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const saveQuoteItems = async () => {
    // Se estivermos em "Nova Obra", apenas fechamos o modal, os itens já estão no estado quoteItems
    if (!selectedProject) {
      setIsQuoteModalOpen(false);
      return;
    }
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

    // Verificar duplicidade: Cliente + Endereço
    const isDuplicate = projects.some(p =>
      p.client_name.trim().toLowerCase() === newProject.client_name.trim().toLowerCase() &&
      p.address.trim().toLowerCase() === newProject.address.trim().toLowerCase()
    );

    if (isDuplicate) {
      if (!window.confirm('Ja existe uma obra cadastrada para este cliente neste endereco. Deseja continuar mesmo assim?')) {
        return;
      }
    }

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

      const quoteItemsToSave = quoteItems.filter(item => item.description.trim());
      const totalFromQuote = quoteItemsToSave.reduce((acc, curr) => acc + curr.total_value, 0);

      const createdProject = await api.addProject({
        title: newProject.title.trim(),
        client_id: clientId,
        client_name: clientName,
        description: '',
        status: ProjectStatus.ORCAMENTO,
        start_date: todayDate(),
        end_date: undefined,
        total_value: totalFromQuote > 0 ? totalFromQuote : toNumber(newProject.total_value),
        entry_value: 0,
        address: newProject.address.trim(),
        execution_deadline_days: toNumber(newProject.execution_deadline_days),
        service: newProject.service.trim(),
        execution_time: newProject.execution_time.trim(),
        material_cost: toNumber(newProject.material_cost),
        vehicle_cost: toNumber(newProject.vehicle_cost),
        labor_cost: toNumber(newProject.labor_cost),
        tax_cost: toNumber(newProject.tax_cost),
        invoice_sent: newProject.invoice_sent
      });

      if (quoteItemsToSave.length > 0) {
        await api.updateProjectServiceItems(createdProject.id, quoteItemsToSave);
      }

      await fetchProjects(false);
      setIsModalOpen(false);
      setNewProject(emptyNewProject());
      setQuoteItems([{ description: '', quantity: 0, unit_value: 0, total_value: 0, order_index: 0 }]);
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
      // 1. Materiais do Estoque
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
            movement_type: 'Saída',
            quantity: item.deductedQuantity,
            unit_cost: Number(item.material.price_cost || 0),
            project_id: selectedProject.id,
            movement_date: materialCostForm.date,
            notes: `Referente a obra: ${selectedProject.title}`
          });
        }
      }

      // 2. Materiais Extras (Não afetam estoque)
      for (const extra of materialCostForm.extraMaterials) {
        if (!extra.name || toNumber(extra.quantity) <= 0) continue;
        const amount = toNumber(extra.quantity) * toNumber(extra.price_cost);
        
        await api.addProjectCost({
          project_id: selectedProject.id,
          type: 'MATERIAL',
          description: `[EXTRA] ${extra.name} (${extra.quantity} ${extra.unit})`,
          amount: Number(amount.toFixed(2)),
          date: materialCostForm.date,
          quantity: toNumber(extra.quantity),
          notes: `Material extra não disponível em estoque. | ${materialCostForm.notes}`
        });
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

      <div className="bg-white/70 backdrop-blur-md p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-white flex flex-col sm:flex-row gap-4 items-center ring-1 ring-slate-100">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome da obra ou cliente..." 
            className="w-full pl-12 pr-4 py-3 border-none bg-slate-50 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-700 font-medium placeholder:text-slate-400" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            className="flex-1 sm:flex-none px-6 py-3 border-none bg-slate-50 rounded-2xl text-slate-600 font-bold text-xs uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer appearance-none" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}
          >
            <option value="ALL">Todos Status</option>
            {Object.values(ProjectStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="sm:hidden flex items-center justify-center p-3 bg-slate-50 rounded-2xl">
             <Filter size={20} className="text-slate-400" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
          <Loader className="animate-spin text-blue-600" size={32} /> 
          <span className="font-bold uppercase tracking-widest text-[10px]">Consultando canteiro de obras...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-dashed border-slate-300 p-20 text-center text-slate-500 flex flex-col items-center">
          <div className="p-4 bg-slate-50 rounded-full mb-4">
             <Package size={40} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-400">Nenhuma obra encontrada para o filtro atual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredProjects.map((project) => (
            <div key={project.id} className="premium-card flex flex-col group overflow-hidden border-none shadow-xl shadow-slate-200/40 bg-white ring-1 ring-slate-200/50">
              <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-80" />
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-sm border ${getStatusColor(project.status)}`}>{project.status}</span>
                  <button type="button" onClick={() => void openTrackingModal(project)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300" title="Acompanhar obra">
                    <ArrowRight size={22} />
                  </button>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors tracking-tight">{project.title}</h3>
                  <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                     <Users size={14} className="mr-2" />
                     {project.client_name}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex items-center text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mr-3">
                       <MapPin size={15} className="text-slate-400" />
                    </div>
                    <span className="truncate">{project.address}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-600 font-medium">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center mr-3">
                       <Calendar size={15} className="text-slate-400" />
                    </div>
                    <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Planejada'}</span>
                  </div>
                  <div className="flex items-center text-sm font-bold text-slate-900 bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                    <DollarSign size={18} className="mr-2 text-blue-600" />
                    <span>{formatMoney(project.total_value)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/80 backdrop-blur-sm px-6 py-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">Margem Estimada</span>
                  {project.profit_margin !== undefined && <span className={`${project.profit_margin > 0 ? 'text-green-600' : 'text-slate-400'}`}>{formatMoney(project.profit_margin)}</span>}
                </div>
                {project.total_cost !== undefined && project.total_value > 0 && (
                  <div className="relative">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${((project.total_cost || 0) / project.total_value) > 0.9 ? 'bg-red-500' : 'bg-blue-600'}`} 
                        style={{ width: `${Math.min(((project.total_cost || 0) / project.total_value) * 100, 100)}%` }} 
                      />
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold text-white drop-shadow-sm">
                       {Math.round(((project.total_cost || 0) / project.total_value) * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Nova Obra" maxWidth="max-w-3xl">
        <form onSubmit={handleAddProject} className="space-y-6 py-2">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Informações Básicas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Título do Projeto</label>
                <input required type="text" placeholder="Ex: Reforma Apartamento 402 - Ed. Solar" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white font-medium" value={newProject.title} onChange={(e) => setNewProject((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Cliente</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="text" placeholder="Nome do cliente" className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white font-medium" value={newProject.client_name} onChange={(e) => setNewProject((prev) => ({ ...prev, client_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Status Inicial</label>
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white font-medium cursor-pointer" value={newProject.status} onChange={(e) => setNewProject((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))}>
                  {Object.values(ProjectStatus).map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Detalhes Operacionais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Serviço Prestado</label>
                <input type="text" placeholder="Ex: Forro de Gesso + Sanca" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50/50" value={newProject.service} onChange={(e) => setNewProject((prev) => ({ ...prev, service: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Previsão Execução</label>
                <input type="text" placeholder="Ex: 5 dias úteis" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50/50" value={newProject.execution_time} onChange={(e) => setNewProject((prev) => ({ ...prev, execution_time: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Prazo (dias)</label>
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50/50" value={newProject.execution_deadline_days} onChange={(e) => setNewProject((prev) => ({ ...prev, execution_deadline_days: e.target.value }))} placeholder="Ex: 30" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Local da Obra</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required type="text" placeholder="Endereço completo" className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50/50" value={newProject.address} onChange={(e) => setNewProject((prev) => ({ ...prev, address: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Planejamento Financeiro</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5 ml-1">Valor Venda (R$)</label>
                <input required type="number" step="0.01" min="0" placeholder="0.00" className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white font-bold text-blue-700" value={newProject.total_value} onChange={(e) => setNewProject((prev) => ({ ...prev, total_value: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Est. Mão de Obra</label>
                <input type="number" step="0.01" min="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white" value={newProject.labor_cost} onChange={(e) => setNewProject((prev) => ({ ...prev, labor_cost: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Est. Materiais</label>
                <input type="number" step="0.01" min="0" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white" value={newProject.material_cost} onChange={(e) => setNewProject((prev) => ({ ...prev, material_cost: e.target.value }))} />
              </div>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors group">
              <input type="checkbox" className="w-5 h-5 rounded-lg border-blue-300 text-blue-600 focus:ring-blue-500 transition-all" checked={newProject.invoice_sent} onChange={(e) => setNewProject(prev => ({ ...prev, invoice_sent: e.target.checked }))} />
              <span className="text-sm font-semibold text-slate-600 group-hover:text-blue-700">Nota Fiscal emitida para esta obra?</span>
            </label>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold uppercase text-[11px] tracking-widest transition-all">Cancelar</button>
            <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-[11px] tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all">Salvar Projeto</button>
          </div>
        </form>
      </Modal>


      <Modal isOpen={isTrackingModalOpen} onClose={closeTrackingModal} title={projectDraft ? `Gestão da Obra: ${projectDraft.title}` : 'Acompanhamento da Obra'} maxWidth="max-w-6xl">
        {!projectDraft ? (
          <div className="text-sm text-slate-500 py-20 text-center uppercase tracking-widest font-black">Nenhuma obra selecionada.</div>
        ) : (
          <div className="space-y-6 pb-4">
            {trackingLoading && (
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/50 border border-blue-100 rounded-2xl px-4 py-3 animate-pulse">
                <RefreshCcw size={14} className="animate-spin mr-3 text-blue-500" />
                Sincronizando dados do canteiro...
              </div>
            )}
            {trackingNotice && (
              <div className="flex items-start text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <AlertTriangle size={18} className="mr-3 mt-0.5 shrink-0 text-amber-500" />
                <span className="font-medium">{trackingNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <div className="premium-card p-8 bg-white/50 backdrop-blur-sm border-slate-100 shadow-xl shadow-slate-200/30">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Painel de Controle</h4>
                      <p className="text-xl font-extrabold text-slate-900 tracking-tight">Detalhes & Operação</p>
                    </div>
                    <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${financeIndicator.classes}`}>
                      {financeIndicator.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Título da Obra</label>
                      <input className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" value={projectDraft.title} onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Status da Execução</label>
                      <select className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm cursor-pointer" value={projectDraft.status} onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value as ProjectStatus })}>
                        {Object.values(ProjectStatus).map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Serviço / Escopo</label>
                      <input className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700" value={projectDraft.service || ''} placeholder="Ex: Gesso acartonado em 3 pavimentos" onChange={(e) => setProjectDraft({ ...projectDraft, service: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Previsão de Prazo</label>
                      <input className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700" value={projectDraft.execution_time || ''} placeholder="Ex: 15 dias" onChange={(e) => setProjectDraft({ ...projectDraft, execution_time: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Local da Instalação</label>
                      <div className="relative group">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" value={projectDraft.address} onChange={(e) => setProjectDraft({ ...projectDraft, address: e.target.value })} />
                      </div>
                    </div>
                  </div>                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Prazo (dias)</label>
                      <input type="number" className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" value={projectDraft.execution_deadline_days || ''} onChange={(e) => setProjectDraft({ ...projectDraft, execution_deadline_days: toNumber(e.target.value) })} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cliente Solicitante</span>
                        <span className="text-lg font-extrabold text-slate-800">{projectDraft.client_name || '-'}</span>
                      </div>
                      <div className="p-3 bg-white rounded-2xl shadow-sm"><Users className="text-blue-500" size={20} /></div>
                   </div>
                   <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nota Fiscal</span>
                        <label className="flex items-center gap-3 cursor-pointer group">
                           <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 transition-all" checked={projectDraft.invoice_sent} onChange={(e) => setProjectDraft({ ...projectDraft, invoice_sent: e.target.checked })} />
                           <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">Documentação Emitida</span>
                        </label>
                      </div>
                      <div className="p-3 bg-white rounded-2xl shadow-sm"><Package className="text-blue-500" size={20} /></div>
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="premium-card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl shadow-slate-900/40">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Resumo Financeiro</h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Valor da Venda (R$)</label>
                      <input type="number" min={0} step="0.01" className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-xl font-black text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-inner" value={projectDraft.total_value || ''} onChange={(e) => setProjectDraft({ ...projectDraft, total_value: Number(e.target.value || 0) })} />
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Entrada Recebida (R$)</label>
                      <input type="number" min={0} step="0.01" className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/10 text-xl font-black text-emerald-400 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all shadow-inner" value={projectDraft.entry_value || ''} onChange={(e) => setProjectDraft({ ...projectDraft, entry_value: Number(e.target.value || 0) })} />
                    </div>

                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Aberto</span>
                        <span className={`text-sm font-black ${balanceValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(balanceValue)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custo Real (Lançado)</span>
                        <span className="text-sm font-black text-white">{formatMoney(totalCost)}</span>
                      </div>
                    </div>

                    <div className="relative pt-2">
                       <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 mb-2">
                          <span>Consumo de Orçamento</span>
                          <span className={budgetPercent > 100 ? 'text-rose-400' : 'text-blue-400'}>{budgetPercent.toFixed(1)}%</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className={`h-full transition-all duration-1000 ${budgetPercent > 100 ? 'bg-rose-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                          />
                       </div>
                    </div>
                    
                    <button type="button" onClick={() => void saveTrackingProject()} disabled={savingProject} className="w-full mt-4 flex justify-center items-center px-6 py-4 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50">
                      {savingProject ? <RefreshCcw size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                      Salvar Alterações
                    </button>
                  </div>
                </div>

                <div className="premium-card p-6 bg-slate-50 border-slate-200">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Estimativa de Impostos</h4>
                   <div>
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Imposto Previsto (R$)</label>
                      <input type="number" min={0} step="0.01" className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white font-bold text-slate-700 shadow-sm" value={projectDraft.tax_cost || ''} placeholder="0.00" onChange={(e) => setProjectDraft({ ...projectDraft, tax_cost: Number(e.target.value || 0) })} />
                      <p className="text-[9px] text-slate-400 mt-2 italic px-1">* Use este campo para notas fiscais ou taxas governamentais.</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { type: 'MATERIAL' as ProjectCostType, value: materialTotal, color: 'text-blue-600', bg: 'bg-blue-50' }, 
                { type: 'VEHICLE' as ProjectCostType, value: vehicleTotal, color: 'text-amber-600', bg: 'bg-amber-50' }, 
                { type: 'LABOR' as ProjectCostType, value: laborTotal, color: 'text-emerald-600', bg: 'bg-emerald-50' }
              ].map(({ type, value, color, bg }) => {
                const Icon = getCostIcon(type);
                return (
                  <div key={type} className="premium-card p-6 bg-white border-slate-100 shadow-lg shadow-slate-200/20 group hover:border-blue-200 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${bg} group-hover:scale-110 transition-transform`}>
                        <Icon size={20} className={color} />
                      </div>
                      <button type="button" onClick={() => void openCostModal(type)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 bg-blue-50/50 px-3 py-1.5 rounded-xl transition-all">
                        Lançar +
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{costTypeLabel[type]} Acumulado</span>
                      <div className="text-2xl font-black text-slate-900 tracking-tighter">{formatMoney(value)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isCostModalOpen} onClose={closeCostModal} title={activeCostType ? `Adicionar lançamento - ${costTypeLabel[activeCostType]}` : 'Adicionar lançamento'} fullScreen bodyClassName="bg-slate-50">
        {activeCostType === 'MATERIAL' ? (
          <form onSubmit={saveMaterialCost} className="h-full flex flex-col gap-8">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-3 bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-50 space-y-6 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuração da Requisição</h4>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setMaterialCostForm(prev => ({ ...prev, activeTab: 'STOCK' }))}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${materialCostForm.activeTab === 'STOCK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Estoque
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setMaterialCostForm(prev => ({ ...prev, activeTab: 'EXTRA' }))}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${materialCostForm.activeTab === 'EXTRA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Material Extra
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Data da Saída</label>
                    <div className="relative">
                      <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="date" className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-900" value={materialCostForm.date} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, date: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Notas de Expedição</label>
                    <input type="text" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-700" placeholder="Ex: Motorista João - Entrega no período da tarde" value={materialCostForm.notes} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, notes: e.target.value }))} />
                  </div>
                </div>

                {materialCostForm.activeTab === 'STOCK' ? (
                  <div className="flex-1 flex flex-col min-h-0 pt-4">
                    <div className="grid grid-cols-[100px_minmax(280px,2fr)_140px_160px_140px_140px] gap-6 px-4 py-3 bg-slate-50/80 rounded-t-2xl border-x border-t border-slate-100 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                      <span>Seleção</span>
                      <span>Material & Especificações</span>
                      <span>Custo Unit.</span>
                      <span>Estoque</span>
                      <span>Quantidade</span>
                      <span className="text-right">Subtotal</span>
                    </div>
                    <div className="divide-y divide-slate-50 border-x border-b border-slate-100 rounded-b-2xl overflow-y-auto flex-1 custom-scrollbar">
                      {inventoryLoading ? (
                        <div className="py-20 text-center text-slate-400 flex flex-col items-center">
                          <RefreshCcw className="animate-spin mb-4 text-blue-500" size={24} />
                          <span className="font-black uppercase tracking-widest text-[10px]">Consultando Almoxarifado...</span>
                        </div>
                      ) : materialRows.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 font-bold italic">Nenhum material disponível.</div>
                      ) : (
                        materialRows.map((row) => (
                          <div key={row.material.id} className={`grid grid-cols-[100px_minmax(280px,2fr)_140px_160px_140px_140px] gap-6 px-4 py-4 items-center transition-all ${row.selected ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}>
                            <label className="flex items-center justify-center">
                              <input type="checkbox" className="h-5 w-5 rounded-lg border-slate-200 text-blue-600 cursor-pointer" checked={row.selected} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, selections: { ...prev.selections, [row.material.id]: { selected: e.target.checked, quantity: e.target.checked ? prev.selections[row.material.id]?.quantity || '' : '' } } }))} />
                            </label>
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-sm truncate">{row.material.name}</div>
                              <div className="text-[9px] font-bold uppercase text-slate-400">Unid: {row.material.unit}</div>
                            </div>
                            <div className="text-sm font-medium text-slate-600">{formatMoney(row.material.price_cost)}</div>
                            <div className="text-[10px] font-black uppercase">
                              {row.availableQuantity > 0 ? (
                                <span className={row.availableQuantity < 10 ? 'text-amber-600' : 'text-emerald-600'}>Saldo: {formatQuantity(row.availableQuantity)}</span>
                              ) : <span className="text-slate-400">Esgotado</span>}
                            </div>
                            <input type="number" min="0" step="0.001" className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50 text-sm font-bold" placeholder="0.00" value={row.quantityValue} disabled={!row.selected} onChange={(e) => setMaterialCostForm((prev) => ({ ...prev, selections: { ...prev.selections, [row.material.id]: { selected: true, quantity: e.target.value } } }))} />
                            <div className="font-black text-slate-900 text-right text-sm">{formatMoney(row.subtotal)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens fora de estoque</span>
                      <button 
                        type="button" 
                        onClick={() => setMaterialCostForm(prev => ({ ...prev, extraMaterials: [...prev.extraMaterials, { name: '', unit: 'Unid', quantity: '', price_cost: '' }] }))}
                        className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                      >
                        + Adicionar Item
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 overflow-y-auto flex-1 custom-scrollbar border border-slate-100 rounded-3xl">
                      {materialCostForm.extraMaterials.length === 0 ? (
                        <div className="py-20 text-center text-slate-400">
                          <Package size={40} className="mx-auto mb-4 opacity-20" />
                          <span className="font-bold italic">Nenhum material extra adicionado.</span>
                        </div>
                      ) : (
                        materialCostForm.extraMaterials.map((extra, idx) => (
                          <div key={idx} className="p-4 grid grid-cols-[1fr_100px_100px_120px_40px] gap-4 items-center">
                            <input type="text" placeholder="Nome do material" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold" value={extra.name} onChange={(e) => {
                              const newList = [...materialCostForm.extraMaterials];
                              newList[idx].name = e.target.value;
                              setMaterialCostForm(prev => ({ ...prev, extraMaterials: newList }));
                            }} />
                            <input type="text" placeholder="Unid" className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm font-bold text-center" value={extra.unit} onChange={(e) => {
                              const newList = [...materialCostForm.extraMaterials];
                              newList[idx].unit = e.target.value;
                              setMaterialCostForm(prev => ({ ...prev, extraMaterials: newList }));
                            }} />
                            <input type="number" placeholder="Qtd" className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm font-bold" value={extra.quantity} onChange={(e) => {
                              const newList = [...materialCostForm.extraMaterials];
                              newList[idx].quantity = e.target.value;
                              setMaterialCostForm(prev => ({ ...prev, extraMaterials: newList }));
                            }} />
                            <input type="number" placeholder="Custo" className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm font-bold" value={extra.price_cost} onChange={(e) => {
                              const newList = [...materialCostForm.extraMaterials];
                              newList[idx].price_cost = e.target.value;
                              setMaterialCostForm(prev => ({ ...prev, extraMaterials: newList }));
                            }} />
                            <button type="button" onClick={() => {
                              const newList = materialCostForm.extraMaterials.filter((_, i) => i !== idx);
                              setMaterialCostForm(prev => ({ ...prev, extraMaterials: newList }));
                            }} className="text-rose-400 hover:text-rose-600 transition-colors">
                              <RefreshCcw size={18} className="rotate-45" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl shadow-slate-900/30 space-y-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 -mr-4 -mt-4 rotate-12">
                   <Package size={120} />
                </div>
                <div className="relative z-10">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Sumário do Lançamento</span>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Itens Marcados</div>
                      <div className="text-3xl font-black">{selectedMaterialRows.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo Estimado</div>
                      <div className="text-3xl font-black text-blue-400 tracking-tighter">{formatMoney(selectedMaterialTotal)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {shortageRows.length > 0 && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-6 py-4 flex items-center gap-4 text-rose-700 animate-pulse">
                <AlertTriangle size={24} className="text-rose-500" />
                <span className="text-xs font-black uppercase tracking-widest">Atenção: {shortageRows.length} item(ns) estão com saldo insuficiente no estoque.</span>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/20 border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-[100px_minmax(280px,2fr)_140px_160px_140px_140px] gap-6 px-8 py-5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                <span>Seleção</span>
                <span>Material & Especificações</span>
                <span>Custo Unitário</span>
                <span>Status Estoque</span>
                <span>Quantidade</span>
                <span className="text-right">Subtotal</span>
              </div>

              <div className="divide-y divide-slate-50 overflow-y-auto flex-1 custom-scrollbar">
                {inventoryLoading ? (
                  <div className="py-32 text-center text-slate-400 flex flex-col items-center">
                    <RefreshCcw className="animate-spin mb-4 text-blue-500" size={32} />
                    <span className="font-black uppercase tracking-widest text-xs">Consultando Almoxarifado...</span>
                  </div>
                ) : materialRows.length === 0 ? (
                  <div className="py-32 text-center text-slate-400 font-bold italic">Nenhum material disponível no catálogo.</div>
                ) : (
                  materialRows.map((row) => (
                    <div key={row.material.id} className={`grid grid-cols-[100px_minmax(280px,2fr)_140px_160px_140px_140px] gap-6 px-8 py-6 items-center transition-all ${row.selected ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-100/50' : 'hover:bg-slate-50/50'}`}>
                      <label className="flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="h-6 w-6 rounded-lg border-slate-200 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" 
                          checked={row.selected} 
                          onChange={(e) => setMaterialCostForm((prev) => ({ 
                            ...prev, 
                            selections: { 
                              ...prev.selections, 
                              [row.material.id]: { 
                                selected: e.target.checked, 
                                quantity: e.target.checked ? prev.selections[row.material.id]?.quantity || '' : '' 
                              } 
                            } 
                          }))} 
                        />
                      </label>

                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 tracking-tight">{row.material.name}</div>
                        <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 italic">
                          <span>Unid: {row.material.unit}</span>
                          {row.material.supplier && (
                            <>
                              <span className="text-slate-200">|</span>
                              <span>Fornecedor: {row.material.supplier}</span>
                            </>
                          )}
                        </div>
                        {row.selected && row.missingQuantity > 0 && (
                          <div className="text-[10px] font-black text-rose-500 mt-2 flex items-center gap-1">
                            <AlertTriangle size={12} /> DÉFICIT: {formatQuantity(row.missingQuantity)} {row.material.unit}
                          </div>
                        )}
                      </div>

                      <div className="font-bold text-slate-900">{formatMoney(row.material.price_cost)}</div>

                      <div className="flex flex-col gap-1">
                        {row.availableQuantity > 0 ? (
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter w-fit border ${row.availableQuantity < 10 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            Saldo: {formatQuantity(row.availableQuantity)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter w-fit bg-slate-100 text-slate-400 border border-slate-200">Esgotado</span>
                        )}
                      </div>

                      <div className="relative">
                        <input 
                          type="number" 
                          min="0" 
                          step="0.001" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-50/50 disabled:text-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:font-normal" 
                          placeholder="0.00"
                          value={row.quantityValue} 
                          disabled={!row.selected} 
                          onChange={(e) => setMaterialCostForm((prev) => ({ 
                            ...prev, 
                            selections: { 
                              ...prev.selections, 
                              [row.material.id]: { selected: true, quantity: e.target.value } 
                            } 
                          }))} 
                        />
                      </div>

                      <div className="font-black text-slate-900 text-right tracking-tighter">{formatMoney(row.subtotal)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row justify-between items-center gap-6 px-2">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 max-w-md leading-relaxed">
                {shortageRows.length > 0 ? (
                  <span className="text-rose-400">Atenção: A confirmação irá gerar pendências de estoque para itens em falta.</span>
                ) : (
                  "Os itens selecionados serão baixados automaticamente do inventário após a confirmação."
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button type="button" onClick={closeCostModal} className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all" disabled={savingCost}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingCost || inventoryLoading} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all inline-flex items-center justify-center min-w-[220px]">
                  {savingCost ? <RefreshCcw size={16} className="animate-spin mr-3" /> : <Save size={16} className="mr-3" />}
                  Confirmar Lançamentos
                </button>
              </div>
            </div>
          </form>
        ) : activeCostType ? (
          <form onSubmit={saveGenericCost} className="h-full flex flex-col gap-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100 space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4">Detalhamento do Registro</h4>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Descrição do Lançamento</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400" 
                        placeholder={`Descreva aqui o lançamento de ${costTypeLabel[activeCostType].toLowerCase()}...`} 
                        value={genericCostForm.description} 
                        onChange={(e) => setGenericCostForm((prev) => ({ ...prev, description: e.target.value }))} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Valor do Gasto (R$)</label>
                        <div className="relative">
                           <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                           <input 
                             type="number" 
                             min="0" 
                             step="0.01" 
                             required
                             className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-900" 
                             value={genericCostForm.amount} 
                             onChange={(e) => setGenericCostForm((prev) => ({ ...prev, amount: e.target.value }))} 
                           />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Data da Ocorrência</label>
                        <div className="relative">
                           <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                           <input 
                             type="date" 
                             required
                             className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-900" 
                             value={genericCostForm.date} 
                             onChange={(e) => setGenericCostForm((prev) => ({ ...prev, date: e.target.value }))} 
                           />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {activeCostType === 'LABOR' && (
                  <div className="bg-blue-50/50 p-8 rounded-3xl border border-blue-100 space-y-6 transition-all animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-100/50 pb-4 flex items-center">
                      <Users size={16} className="mr-2" /> Registro de Mão de Obra
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 ml-1">Nome do Montador / Profissional</label>
                        <input
                          type="text"
                          required
                          className="w-full px-5 py-4 rounded-2xl border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold text-slate-800"
                          placeholder="Ex: João Gesseiro"
                          value={genericCostForm.worker_name}
                          onChange={(e) => setGenericCostForm((prev) => ({ ...prev, worker_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 ml-1">Valor do Serviço (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-5 py-4 rounded-2xl border border-blue-100 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="0.00" value={genericCostForm.labor_daily_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, labor_daily_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 ml-1">Alimentação (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-5 py-4 rounded-2xl border border-blue-100 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="0.00" value={genericCostForm.labor_snack_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, labor_snack_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 ml-1">Transporte (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-5 py-4 rounded-2xl border border-blue-100 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="0.00" value={genericCostForm.labor_transport_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, labor_transport_value: e.target.value }))} />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="w-full px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                          onClick={() => {
                            const total = toNumber(genericCostForm.labor_daily_value) + toNumber(genericCostForm.labor_snack_value) + toNumber(genericCostForm.labor_transport_value);
                            setGenericCostForm(prev => ({ ...prev, amount: total.toFixed(2) }));
                          }}
                        >
                          Calcular Total: {formatMoney(toNumber(genericCostForm.labor_daily_value) + toNumber(genericCostForm.labor_snack_value) + toNumber(genericCostForm.labor_transport_value))}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeCostType === 'VEHICLE' && (
                  <div className="bg-amber-50/50 p-8 rounded-3xl border border-amber-100 space-y-6 transition-all animate-in fade-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest border-b border-amber-100/50 pb-4 flex items-center">
                      <Truck size={16} className="mr-2" /> Logística & Veículo
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3 ml-1">Veículo Utilizado</label>
                        <select className="w-full px-5 py-4 rounded-2xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all font-bold text-slate-800 cursor-pointer" value={genericCostForm.vehicle_id} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_id: e.target.value }))}>
                          <option value="">Selecione um veículo (opcional)</option>
                          {vehicles.map(v => <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 ml-1">Combustível (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-5 py-4 rounded-2xl border border-amber-100 bg-white font-bold text-slate-800" placeholder="0.00" value={genericCostForm.vehicle_fuel_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_fuel_value: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 ml-1">Pedágio/Outros (R$)</label>
                        <input type="number" min="0" step="0.01" className="w-full px-5 py-4 rounded-2xl border border-amber-100 bg-white font-bold text-slate-800" placeholder="0.00" value={genericCostForm.vehicle_toll_value} onChange={(e) => setGenericCostForm((prev) => ({ ...prev, vehicle_toll_value: e.target.value }))} />
                      </div>
                      <div className="md:col-span-2">
                         <button
                          type="button"
                          className="w-full px-6 py-4 bg-amber-100 text-amber-700 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-200 transition-all"
                          onClick={() => {
                            const total = toNumber(genericCostForm.vehicle_fuel_value) + toNumber(genericCostForm.vehicle_toll_value);
                            if (total > 0) setGenericCostForm(prev => ({ ...prev, amount: total.toString() }));
                          }}
                        >
                          Somar ao Total Financeiro
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/30 border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Observações Adicionais</label>
                  <textarea 
                    rows={4} 
                    className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium text-slate-700 resize-none" 
                    placeholder="Informações extras (opcional)..." 
                    value={genericCostForm.notes} 
                    onChange={(e) => setGenericCostForm((prev) => ({ ...prev, notes: e.target.value }))} 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="premium-card p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none shadow-2xl shadow-blue-600/20 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 -mr-4 -mt-4">
                     {activeCostType === 'LABOR' ? <Users size={120} /> : <Truck size={120} />}
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black text-blue-100 uppercase tracking-[0.2em] block mb-4">Classificação</span>
                    <h3 className="text-3xl font-black tracking-tighter mb-4">{costTypeLabel[activeCostType]}</h3>
                    <p className="text-sm text-blue-100/80 leading-relaxed font-medium">Este lançamento será consolidado nos custos operacionais da obra {(selectedProject as Project).title}.</p>
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-slate-100/50 border border-slate-200 border-dashed">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                      Verifique os dados antes de salvar. Diferente dos materiais, lançamentos genéricos não afetam o estoque, apenas o fluxo financeiro da obra.
                   </p>
                </div>
              </div>
            </div>

            <div className="mt-auto border-t border-slate-100 pt-8 flex flex-col sm:flex-row justify-end gap-3 px-2">
              <button 
                type="button" 
                onClick={closeCostModal} 
                className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all" 
                disabled={savingCost}
              >
                Descartar
              </button>
              <button 
                type="submit" 
                disabled={savingCost} 
                className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-1 active:translate-y-0 transition-all inline-flex items-center justify-center min-w-[200px]"
              >
                {savingCost ? <RefreshCcw size={16} className="animate-spin mr-3" /> : <Save size={16} className="mr-3" />}
                Confirmar Lançamento
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} title={`Orcamento Detalhado - ${selectedProject?.title || newProject.title || 'Nova Obra'}`} maxWidth="max-w-4xl">
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-blue-900">Total do Orcamento</h4>
              <p className="text-2xl font-black text-blue-700">{formatMoney(quoteItems.reduce((acc, curr) => acc + curr.total_value, 0))}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={async () => {
                  const title = selectedProject?.title || newProject.title || 'Orcamento';
                  const subtitle = `Cliente: ${selectedProject?.client_name || newProject.client_name || '-'}`;
                  const { doc, startY } = await createBasePdf(`Orcamento: ${title}`, subtitle);

                  const headers = ['Quant.', 'Descrição do serviço', 'Valor'];
                  const rows = quoteItems.map(item => [
                    formatQuantity(item.quantity),
                    item.description,
                    formatMoney(item.total_value)
                  ]);

                  const finalY = addStyledTable(doc, headers, rows, startY);

                  doc.setFont('helvetica', 'bold');
                  doc.text('Total:', 440, finalY + 20);
                  doc.text(formatMoney(quoteItems.reduce((acc, curr) => acc + curr.total_value, 0)), 480, finalY + 20);

                  const fileName = `${sanitizePdfFilename(title)}-orcamento.pdf`;
                  const pdfBlob = doc.output('blob');

                  // Salvar no banco se a obra já existir
                  if (selectedProject?.id) {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64data = reader.result as string;
                      await api.addProjectQuoteDocument({
                        project_id: selectedProject.id,
                        file_name: fileName,
                        file_content: base64data
                      });
                      const updatedDocs = await api.getProjectQuoteDocuments(selectedProject.id);
                      setQuoteDocuments(updatedDocs);
                    };
                    reader.readAsDataURL(pdfBlob);
                  }

                  downloadBlob(pdfBlob, fileName);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm"
              >
                <Download size={18} />
                Baixar PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  const title = selectedProject?.title || newProject.title || 'Orcamento';
                  const client = selectedProject?.client_name || newProject.client_name || '-';
                  const text = `Orcamento: ${title}\nCliente: ${client}\n\nServicos:\n${quoteItems.map(item => `- ${item.description}: ${formatMoney(item.total_value)}`).join('\n')}\n\nTotal: ${formatMoney(quoteItems.reduce((acc, curr) => acc + curr.total_value, 0))}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition shadow-sm"
              >
                <Truck size={18} />
                WhatsApp
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500">
                  <th className="px-4 py-3 w-24">Quant.</th>
                  <th className="px-4 py-3">Descrição do serviço</th>
                  <th className="px-4 py-3 w-36">Valor</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 italic">
                {quoteItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900"
                        value={item.quantity === 0 ? '' : item.quantity}
                        placeholder="0"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          const newItems = [...quoteItems];
                          newItems[index].quantity = val;
                          newItems[index].total_value = val * newItems[index].unit_value;
                          setQuoteItems(newItems);
                        }}
                      />
                    </td>
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
                        step="0.01"
                        placeholder="0,00"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-gray-900 font-bold"
                        value={item.total_value === 0 ? '' : item.total_value}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          const newItems = [...quoteItems];
                          newItems[index].total_value = val;
                          if (newItems[index].quantity > 0) {
                            newItems[index].unit_value = val / newItems[index].quantity;
                          }
                          setQuoteItems(newItems);
                        }}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
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
            <button onClick={() => setIsQuoteModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Fechar</button>
            <button
              onClick={saveQuoteItems}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-70 inline-flex items-center"
              disabled={savingQuote}
            >
              {savingQuote ? <Loader size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              Salvar Itens
            </button>
          </div>

          {selectedProject && quoteDocuments.length > 0 && (
            <div className="pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Package size={16} />
                Histórico de Orçamentos Arquivados
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quoteDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <div className="truncate pr-2">
                      <div className="font-bold text-gray-800 truncate">{doc.file_name}</div>
                      <div className="text-gray-500">{new Date(doc.created_at).toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = doc.file_content;
                          link.download = doc.file_name;
                          link.click();
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Baixar"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Deseja excluir este orçamento arquivado?')) {
                            await api.deleteProjectQuoteDocument(doc.id);
                            setQuoteDocuments(quoteDocuments.filter(d => d.id !== doc.id));
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Excluir"
                      >
                        <Plus size={14} className="rotate-45" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Projects;
