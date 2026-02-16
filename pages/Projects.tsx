
import React, { useEffect, useState } from 'react';
import { Plus, Search, MapPin, Calendar, DollarSign, ArrowRight, Loader } from 'lucide-react';
import { api } from '../services/api';
import { Project, ProjectStatus } from '../types';
import Modal from '../components/Modal';

interface ProjectsProps {
  initialSearchTerm?: string;
}

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
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(normalizedSearch) ||
      p.client_name?.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProject.title && newProject.client_name) {
      setLoading(true);

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
        ...newProject as Project,
        start_date: new Date().toISOString().split('T')[0],
        client_id: clientId,
        client_name: clientName
      });
      await fetchProjects();
      setIsModalOpen(false);
      setNewProject({ title: '', client_name: '', total_value: 0, address: '', status: ProjectStatus.ORCAMENTO });
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
                  <button className="text-gray-400 hover:text-gray-600">
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
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(project.total_value)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 rounded-b-xl">
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
    </div>
  );
};

export default Projects;
