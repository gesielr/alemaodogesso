import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Loader,
  Pencil,
  ListChecks,
  FileDown,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { Project, ProjectServiceItem, ProjectStatus } from '../types';
import Modal from '../components/Modal';
import brandLogo from '../src/assets/Gemini_Generated_Image_l0vw5al0vw5al0vw23-removebg-preview.png';
import { addStyledTable, createBasePdf, downloadBlob, sanitizePdfFilename } from '../utils/pdf';

interface ProjectsProps {
  initialSearchTerm?: string;
}

type ServiceRow = {
  local_id: string;
  code: string;
  description: string;
  amount: number;
};

const createServiceRow = (index: number): ServiceRow => ({
  local_id: Math.random().toString(36).slice(2),
  code: `SRV-${String(index).padStart(3, '0')}`,
  description: '',
  amount: 0
});

const getEmptyProjectForm = (): Partial<Project> => ({
  title: '',
  client_name: '',
  total_value: 0,
  address: '',
  status: ProjectStatus.ORCAMENTO,
  service: '',
  execution_time: '',
  material_cost: 0,
  vehicle_cost: 0,
  labor_cost: 0,
  tax_cost: 0,
  invoice_sent: false
});

const toMoneyValue = (value: string | number | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildServiceSummary = (serviceCount: number) =>
  serviceCount > 0 ? `${serviceCount} servico(s)` : '';

const toServicePayload = (rows: ServiceRow[]): Omit<ProjectServiceItem, 'id' | 'project_id'>[] =>
  rows
    .map((row) => ({
      code: row.code.trim(),
      description: row.description.trim(),
      amount: toMoneyValue(row.amount)
    }))
    .filter((row) => row.code || row.description || row.amount > 0)
    .map((row, index) => ({
      ...row,
      code: row.code || `SRV-${String(index + 1).padStart(3, '0')}`,
      order_index: index
    }));

const mapApiServiceItemsToRows = (items: ProjectServiceItem[]): ServiceRow[] =>
  items.map((item, index) => ({
    local_id: item.id,
    code: item.code || `SRV-${String(index + 1).padStart(3, '0')}`,
    description: item.description || '',
    amount: Number(item.amount) || 0
  }));

const Projects: React.FC<ProjectsProps> = ({ initialSearchTerm = '' }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<Partial<Project>>(getEmptyProjectForm());

  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [serviceRows, setServiceRows] = useState<ServiceRow[]>([createServiceRow(1)]);
  const [pendingServiceRows, setPendingServiceRows] = useState<ServiceRow[]>([createServiceRow(1)]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [sendingBudgetId, setSendingBudgetId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (initialSearchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  const fetchProjects = async () => {
    setLoading(true);
    const data = await api.getProjects();
    setProjects(data);
    setLoading(false);
  };

  const normalizedSearch = searchTerm.toLowerCase().trim();
  const filteredProjects = useMemo(
    () =>
      projects.filter((p) => {
        const matchesSearch =
          p.title.toLowerCase().includes(normalizedSearch) ||
          p.client_name?.toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [projects, normalizedSearch, statusFilter]
  );

  const handleOpenAddProject = () => {
    setEditingProjectId(null);
    setNewProject(getEmptyProjectForm());
    setPendingServiceRows([createServiceRow(1)]);
    setServiceRows([createServiceRow(1)]);
    setIsModalOpen(true);
  };

  const handleOpenEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setNewProject({
      ...project,
      service: project.service ?? '',
      execution_time: project.execution_time ?? '',
      material_cost: project.material_cost ?? 0,
      vehicle_cost: project.vehicle_cost ?? 0,
      labor_cost: project.labor_cost ?? 0,
      tax_cost: project.tax_cost ?? 0,
      invoice_sent: Boolean(project.invoice_sent)
    });
    setPendingServiceRows([createServiceRow(1)]);
    setServiceRows([createServiceRow(1)]);
    setIsModalOpen(true);
  };

  const ensureClientId = async (clientNameRaw: string) => {
    const clientName = clientNameRaw.trim();
    const allClients = await api.getClients();
    const existingClient = allClients.find(
      (client) => client.name.trim().toLowerCase() === clientName.toLowerCase()
    );

    if (existingClient?.id) {
      return { clientId: existingClient.id, clientName };
    }

    const createdClient = await api.addClient({
      name: clientName,
      phone: '',
      email: '',
      address: newProject.address || '',
      document: '',
      observations: 'Cliente criado automaticamente ao cadastrar obra.'
    });

    return { clientId: createdClient.id, clientName };
  };

  const handleOpenServicesModal = async () => {
    if (editingProjectId) {
      setLoadingServices(true);
      try {
        const items = await api.getProjectServiceItems(editingProjectId);
        setServiceRows(items.length > 0 ? mapApiServiceItemsToRows(items) : [createServiceRow(1)]);
      } catch (error) {
        console.error('Erro ao carregar servicos da obra:', error);
        alert('Nao foi possivel carregar os servicos desta obra.');
        return;
      } finally {
        setLoadingServices(false);
      }
    } else {
      setServiceRows(pendingServiceRows.length > 0 ? pendingServiceRows : [createServiceRow(1)]);
    }

    setIsServicesModalOpen(true);
  };

  const handleAddServiceRow = () => {
    setServiceRows((prev) => [...prev, createServiceRow(prev.length + 1)]);
  };

  const handleRemoveServiceRow = (localId: string) => {
    setServiceRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.local_id !== localId);
    });
  };

  const handleChangeServiceRow = (localId: string, field: keyof ServiceRow, value: string | number) => {
    setServiceRows((prev) =>
      prev.map((row) => (row.local_id === localId ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveServices = async () => {
    const payload = toServicePayload(serviceRows);
    const countSummary = buildServiceSummary(payload.length);

    if (editingProjectId) {
      setSavingServices(true);
      try {
        const saved = await api.saveProjectServiceItems(editingProjectId, payload);
        setServiceRows(saved.length > 0 ? mapApiServiceItemsToRows(saved) : [createServiceRow(1)]);
        setNewProject((prev) => ({ ...prev, service: buildServiceSummary(saved.length) }));
        await fetchProjects();
      } catch (error) {
        console.error('Erro ao salvar servicos da obra:', error);
        alert('Nao foi possivel salvar os servicos.');
        return;
      } finally {
        setSavingServices(false);
      }
    } else {
      const nextRows = payload.length
        ? payload.map((item, index) => ({
            local_id: Math.random().toString(36).slice(2),
            code: item.code || `SRV-${String(index + 1).padStart(3, '0')}`,
            description: item.description,
            amount: item.amount
          }))
        : [createServiceRow(1)];

      setPendingServiceRows(nextRows);
      setServiceRows(nextRows);
      setNewProject((prev) => ({ ...prev, service: countSummary }));
    }

    setIsServicesModalOpen(false);
  };

  const handleSendBudgetPdf = async (project: Project) => {
    setSendingBudgetId(project.id);

    try {
      const serviceItems = await api.getProjectServiceItems(project.id);
      const rows = serviceItems.length
        ? serviceItems.map((item) => [
            item.code,
            item.description || '-',
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)
          ])
        : [[
            project.service || 'Servico geral',
            project.description || '-',
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.total_value)
          ]];

      const servicesTotal = serviceItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
      const finalTotal = servicesTotal > 0 ? servicesTotal : Number(project.total_value) || 0;

      const subtitle = `Cliente: ${project.client_name || '-'} | Data: ${new Date().toLocaleDateString('pt-BR')}`;
      const { doc, startY } = await createBasePdf('Orcamento de Obra', subtitle);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(project.title, 40, startY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Endereco: ${project.address || '-'}`, 40, startY + 18);
      doc.text(`Status: ${project.status}`, 40, startY + 34);

      const tableFinalY = addStyledTable(doc, ['Codigo', 'Descricao', 'Valor'], rows, startY + 50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(
        `Valor total do orcamento: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}`,
        40,
        tableFinalY + 26
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Validade da proposta: 7 dias corridos.', 40, tableFinalY + 46);

      const fileName = `${sanitizePdfFilename(`orcamento-${project.title}`)}.pdf`;
      const blob = doc.output('blob');
      downloadBlob(blob, fileName);

      const file = new File([blob], fileName, { type: 'application/pdf' });
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          title: `Orcamento - ${project.title}`,
          text: `Segue o orcamento da obra ${project.title}.`,
          files: [file]
        });
      } else {
        const message = encodeURIComponent(
          `Orcamento da obra ${project.title} gerado. O PDF foi baixado e pode ser anexado no WhatsApp.`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
      }
    } catch (error) {
      console.error('Erro ao enviar PDF de orcamento:', error);
      alert('Nao foi possivel gerar o PDF de orcamento.');
    } finally {
      setSendingBudgetId(null);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title || !newProject.client_name) return;

    setLoading(true);
    try {
      const { clientId, clientName } = await ensureClientId(newProject.client_name);
      const invoiceSent = Boolean(newProject.invoice_sent);
      const normalizedTax = invoiceSent ? toMoneyValue(newProject.tax_cost) : 0;
      const pendingServicePayload = toServicePayload(pendingServiceRows);
      const serviceSummary = editingProjectId
        ? newProject.service?.trim() ?? ''
        : buildServiceSummary(pendingServicePayload.length);

      const payload: Omit<Project, 'id'> = {
        client_id: clientId,
        client_name: clientName,
        title: newProject.title.trim(),
        description: newProject.description ?? '',
        service: serviceSummary,
        execution_time: newProject.execution_time?.trim() ?? '',
        status: (newProject.status as ProjectStatus) ?? ProjectStatus.ORCAMENTO,
        start_date: newProject.start_date ?? new Date().toISOString().split('T')[0],
        end_date: newProject.end_date,
        total_value: toMoneyValue(newProject.total_value),
        address: (newProject.address ?? '').trim(),
        material_cost: toMoneyValue(newProject.material_cost),
        vehicle_cost: toMoneyValue(newProject.vehicle_cost),
        labor_cost: toMoneyValue(newProject.labor_cost),
        tax_cost: normalizedTax,
        invoice_sent: invoiceSent
      };

      if (editingProjectId) {
        await api.updateProject({ ...payload, id: editingProjectId });
      } else {
        const createdProject = await api.addProject(payload);
        if (pendingServicePayload.length > 0) {
          await api.saveProjectServiceItems(createdProject.id, pendingServicePayload);
        }
      }

      await fetchProjects();
      setIsModalOpen(false);
      setEditingProjectId(null);
      setNewProject(getEmptyProjectForm());
      setPendingServiceRows([createServiceRow(1)]);
      setServiceRows([createServiceRow(1)]);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Obras</h1>
          <p className="text-gray-500 text-sm">Acompanhe orcamentos e execucoes em tempo real.</p>
        </div>
        <button 
          onClick={handleOpenAddProject}
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
                    className="text-gray-400 hover:text-gray-700"
                    title="Editar obra"
                    onClick={() => handleOpenEditProject(project)}
                  >
                    <Pencil size={18} />
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
                    <span className="font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.total_value)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 rounded-b-xl space-y-3">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Rentabilidade Estimada</span>
                    {project.profit_margin !== undefined && (
                      <span className={`font-bold ${project.profit_margin > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.profit_margin)}
                      </span>
                    )}
                  </div>
                  {project.total_cost !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{
                          width: `${Math.min(((project.total_cost || 0) / Math.max(project.total_value, 1)) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  )}
                </div>

                {project.status === ProjectStatus.ORCAMENTO && (
                  <button
                    type="button"
                    onClick={() => handleSendBudgetPdf(project)}
                    disabled={sendingBudgetId === project.id}
                    className="w-full flex items-center justify-center text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sendingBudgetId === project.id ? (
                      <Loader className="animate-spin mr-2" size={16} />
                    ) : (
                      <FileDown size={16} className="mr-2" />
                    )}
                    Enviar PDF
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

            {/* Add/Edit Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProjectId(null);
          setNewProject(getEmptyProjectForm());
          setPendingServiceRows([createServiceRow(1)]);
          setServiceRows([createServiceRow(1)]);
        }}
        title={editingProjectId ? 'Editar Obra' : 'Nova Obra'}
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Obra</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              value={newProject.title ?? ''}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              value={newProject.client_name ?? ''}
              onChange={(e) => setNewProject({ ...newProject, client_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                required
                min={0}
                step="0.01"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.total_value ?? 0}
                onChange={(e) => setNewProject({ ...newProject, total_value: toMoneyValue(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.status}
                onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
              >
                {Object.values(ProjectStatus).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Servicos</label>
              <button
                type="button"
                onClick={handleOpenServicesModal}
                className="w-full flex items-center justify-center px-3 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                {loadingServices ? (
                  <Loader size={16} className="animate-spin mr-2" />
                ) : (
                  <ListChecks size={16} className="mr-2" />
                )}
                Gerenciar Servicos
              </button>
              <p className="text-xs text-gray-500 mt-1">{newProject.service || 'Nenhum servico informado.'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tempo de execucao</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.execution_time ?? ''}
                onChange={(e) => setNewProject({ ...newProject, execution_time: e.target.value })}
                placeholder="Ex: 12 dias"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereco</label>
            <input
              required
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              value={newProject.address ?? ''}
              onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material (R$)</label>
              <input
                min={0}
                step="0.01"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.material_cost ?? 0}
                onChange={(e) => setNewProject({ ...newProject, material_cost: toMoneyValue(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Veiculo (R$)</label>
              <input
                min={0}
                step="0.01"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.vehicle_cost ?? 0}
                onChange={(e) => setNewProject({ ...newProject, vehicle_cost: toMoneyValue(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mao de obra (R$)</label>
              <input
                min={0}
                step="0.01"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.labor_cost ?? 0}
                onChange={(e) => setNewProject({ ...newProject, labor_cost: toMoneyValue(e.target.value) })}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(newProject.invoice_sent)}
              onChange={(e) =>
                setNewProject({
                  ...newProject,
                  invoice_sent: e.target.checked,
                  tax_cost: e.target.checked ? toMoneyValue(newProject.tax_cost) : 0
                })
              }
            />
            <span className="text-sm text-gray-700">Nota enviada</span>
          </label>

          {newProject.invoice_sent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tributos (quando envio nota) (R$)</label>
              <input
                min={0}
                step="0.01"
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                value={newProject.tax_cost ?? 0}
                onChange={(e) => setNewProject({ ...newProject, tax_cost: toMoneyValue(e.target.value) })}
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProjectId(null);
                setNewProject(getEmptyProjectForm());
                setPendingServiceRows([createServiceRow(1)]);
                setServiceRows([createServiceRow(1)]);
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              {editingProjectId ? 'Salvar Alteracoes' : 'Salvar Obra'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isServicesModalOpen}
        onClose={() => !savingServices && setIsServicesModalOpen(false)}
        title="Servicos da Obra"
        maxWidth="max-w-6xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 inline-flex items-center">
              <img src={brandLogo} alt="Alemao do Gesso" className="h-10 w-auto object-contain" />
            </div>
            <button
              type="button"
              onClick={handleAddServiceRow}
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={16} className="mr-1" />
              Adicionar linha
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left w-36">Codigo</th>
                  <th className="px-3 py-2 text-left">Descricao do Servico</th>
                  <th className="px-3 py-2 text-right w-40">Valor (R$)</th>
                  <th className="px-3 py-2 text-center w-20">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {serviceRows.map((row) => (
                  <tr key={row.local_id} className="align-top">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-900"
                        value={row.code}
                        onChange={(e) => handleChangeServiceRow(row.local_id, 'code', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        className="w-full min-h-[64px] px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-900"
                        value={row.description}
                        onChange={(e) => handleChangeServiceRow(row.local_id, 'description', e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-900 text-right"
                        value={row.amount}
                        onChange={(e) => handleChangeServiceRow(row.local_id, 'amount', toMoneyValue(e.target.value))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveServiceRow(row.local_id)}
                        className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Remover linha"
                        disabled={serviceRows.length <= 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total de linhas: {serviceRows.length}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsServicesModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={savingServices}
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveServices}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center disabled:opacity-60"
                disabled={savingServices}
              >
                {savingServices && <Loader size={16} className="animate-spin mr-2" />}
                Salvar Servicos
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Projects;

