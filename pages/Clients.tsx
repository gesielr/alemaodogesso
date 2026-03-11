import React, { useEffect, useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, Trash2, User, Loader, FileText, Eye, Save, StickyNote, HardHat, Calendar, Edit, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Client, Project, ProjectStatus } from '../types';
import Modal from '../components/Modal';

interface ClientsProps {
  onViewProjects?: (clientName: string) => void;
}

const Clients: React.FC<ClientsProps> = ({ onViewProjects }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State for Adding/Editing
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    document: ''
  });

  // Modal State for Details & Editing Observations
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [observationText, setObservationText] = useState('');
  const [isSavingObs, setIsSavingObs] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = () => {
    setLoading(true);
    api.getClients().then(data => {
        setClients(data);
        setLoading(false);
    });
  };

  const handleOpenAddModal = () => {
      setEditingId(null);
      setNewClient({ name: '', phone: '', email: '', address: '', document: '' });
      setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
      setEditingId(client.id);
      setNewClient({ 
          name: client.name, 
          phone: client.phone, 
          email: client.email, 
          address: client.address, 
          document: client.document 
      });
      setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
        const updatedClient = { ...newClient, id: editingId } as Client;
        const originalClient = clients.find(c => c.id === editingId);
        if (originalClient) {
            updatedClient.observations = originalClient.observations;
        }
        await api.updateClient(updatedClient);
        fetchClients();
        if (selectedClient && selectedClient.id === editingId) {
            setSelectedClient(prev => ({ ...prev!, ...updatedClient }));
        }
    } else {
        await api.addClient(newClient as Client);
        fetchClients();
    }

    setIsModalOpen(false);
    setNewClient({ name: '', phone: '', email: '', address: '', document: '' });
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm('Tem certeza que deseja remover este cliente?')) {
          await api.deleteClient(id);
          fetchClients();
          if (selectedClient?.id === id) setIsDetailsOpen(false);
      }
  }

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    setObservationText(client.observations || '');
    
    const allProjects = await api.getProjects();
    const associatedProjects = allProjects.filter(p => p.client_id === client.id);
    setClientProjects(associatedProjects);

    setIsDetailsOpen(true);
  };

  const handleSaveObservations = async () => {
    if (!selectedClient) return;
    setIsSavingObs(true);
    const updatedClient = { ...selectedClient, observations: observationText };
    await api.updateClient(updatedClient);
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
    setIsSavingObs(false);
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.EM_ANDAMENTO: return 'bg-blue-100 text-blue-700';
      case ProjectStatus.CONCLUIDO: return 'bg-green-100 text-green-700';
      case ProjectStatus.ORCAMENTO: return 'bg-yellow-100 text-yellow-700';
      case ProjectStatus.APROVADO: return 'bg-emerald-100 text-emerald-700';
      case ProjectStatus.CANCELADO: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Carteira de Clientes</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Gestão de parcerias e histórico de relacionamentos comerciais.</p>
        </div>
        <button 
            onClick={handleOpenAddModal}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center w-full sm:w-auto"
        >
          <Plus size={16} className="mr-2" />
          Novo Parceiro
        </button>
      </div>

      <div className="bg-white p-6 rounded-[24px] shadow-2xl shadow-slate-200/40 border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, identificação ou documento..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center bg-blue-600 text-white text-[10px] font-black px-4 py-3 rounded-2xl uppercase tracking-widest shadow-lg shadow-blue-500/20 w-fit">
           {filteredClients.length} Registros
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading ? (
             <div className="col-span-full flex justify-center py-20"><Loader className="animate-spin text-blue-500" size={48}/></div>
        ) : filteredClients.length === 0 ? (
             <div className="col-span-full text-center py-24 text-slate-400 italic font-medium bg-white rounded-[32px] border border-slate-100 shadow-sm">
                 <User size={64} className="mx-auto text-slate-200 mb-4" />
                 <p className="text-lg">Nenhum parceiro encontrado na base.</p>
             </div>
        ) : filteredClients.map((client) => (
            <div key={client.id} className="premium-card p-8 flex flex-col h-full group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <User size={120} />
                </div>
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-[20px] flex items-center justify-center font-black text-2xl shrink-0 shadow-xl shadow-slate-900/20 group-hover:scale-105 transition-transform duration-500">
                            {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                             <h3 className="text-xl font-black text-slate-800 leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate" title={client.name}>{client.name}</h3>
                             <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 w-fit">
                                {client.document || 'DOC PENDENTE'}
                             </div>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4 mt-2 pt-6 border-t border-slate-50 flex-1 relative z-10">
                    <div className="flex items-center text-xs font-bold text-slate-500">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100">
                           <Phone size={14} className="text-slate-400"/>
                        </div>
                        <span className="flex-1 truncate">{client.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-xs font-bold text-slate-500">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100">
                           <Mail size={14} className="text-slate-400"/>
                        </div>
                        <span className="flex-1 truncate lowercase">{client.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-start text-xs font-bold text-slate-500 leading-relaxed italic">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mr-3 border border-slate-100 shrink-0">
                           <MapPin size={14} className="text-slate-400"/>
                        </div>
                        <span className="flex-1 mt-1.5">{client.address || 'Localização não mapeada'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8 relative z-10">
                    <button 
                        onClick={() => onViewProjects && onViewProjects(client.name)}
                        className="py-3.5 flex items-center justify-center text-white bg-slate-900 hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                    >
                        <HardHat size={14} className="mr-2" />
                        Obras
                    </button>
                    <button 
                        onClick={() => handleViewDetails(client)}
                        className="py-3.5 flex items-center justify-center text-slate-900 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
                    >
                        <Eye size={14} className="mr-2" />
                        Perfil
                    </button>
                </div>

                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-[-10px] group-hover:translate-y-0 duration-300">
                     <button onClick={() => handleOpenEditModal(client)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 transition-colors shadow-sm"><Edit size={14}/></button>
                     <button onClick={(e) => handleDelete(client.id, e)} className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors shadow-sm"><Trash2 size={14}/></button>
                </div>
            </div>
        ))}
      </div>

      {/* Add/Edit Client Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Cliente" : "Novo Cliente"}>
        <form onSubmit={handleSaveForm} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
                    placeholder="Ex: Construtora Silva"
                    value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input required type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
                        placeholder="(00) 00000-0000"
                        value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF/CNPJ</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
                        placeholder="000.000.000-00"
                        value={newClient.document} onChange={e => setNewClient({...newClient, document: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
                    placeholder="cliente@email.com"
                    value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 bg-white text-gray-900 shadow-sm"
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition">Cancelar</button>
             <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
                 {editingId ? 'Salvar Alterações' : 'Salvar Cliente'}
             </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Detalhes do Cliente" maxWidth="max-w-3xl">
         {selectedClient && (
            <div className="flex flex-col h-full">
                <div className="space-y-6 flex-1 pr-1 overflow-y-auto">
                    <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-3xl shrink-0">
                                {selectedClient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedClient.name}</h3>
                                <p className="text-gray-500 flex items-center mt-1 text-sm">
                                    <FileText size={14} className="mr-1.5" />
                                    {selectedClient.document || 'Documento não informado'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onViewProjects && onViewProjects(selectedClient.name)}
                                className="text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center border border-orange-100"
                            >
                                <HardHat size={16} className="mr-2" />
                                Ver Obras
                            </button>
                            <button 
                                onClick={() => { setIsDetailsOpen(false); handleOpenEditModal(selectedClient); }}
                                className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold transition flex items-center border border-blue-100"
                            >
                                <Edit size={16} className="mr-2" />
                                Editar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                <Phone size={12} className="mr-1.5" /> Informações de Contato
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center text-gray-700">
                                    <Phone size={18} className="mr-3 text-blue-500"/>
                                    <span className="font-medium">{selectedClient.phone || '-'}</span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <Mail size={18} className="mr-3 text-blue-500"/>
                                    <span className="break-all text-sm">{selectedClient.email || '-'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                                <MapPin size={12} className="mr-1.5" /> Localização
                            </h4>
                            <div className="items-start text-gray-700 flex">
                                <MapPin size={18} className="mr-3 text-blue-500 mt-0.5 shrink-0"/>
                                <span className="leading-relaxed font-medium text-sm">{selectedClient.address || 'Endereço não informado'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center text-gray-700">
                                <StickyNote size={18} className="mr-2 text-yellow-500" />
                                <h4 className="font-semibold text-sm">Observações e Anotações</h4>
                            </div>
                        </div>
                        <div className="p-4">
                            <textarea 
                                className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none bg-white text-gray-900 shadow-inner"
                                placeholder="Adicione notas sobre preferências, histórico ou detalhes importantes deste cliente..."
                                value={observationText}
                                onChange={(e) => setObservationText(e.target.value)}
                            />
                            <div className="mt-3 flex justify-end">
                                <button 
                                    onClick={handleSaveObservations}
                                    disabled={isSavingObs || observationText === (selectedClient.observations || '')}
                                    className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition
                                        ${isSavingObs || observationText === (selectedClient.observations || '')
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
                                >
                                    {isSavingObs ? <Loader size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                                    {isSavingObs ? 'Salvando...' : 'Salvar Observações'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center text-gray-700">
                                <HardHat size={18} className="mr-2 text-orange-500" />
                                <h4 className="font-semibold text-sm">Histórico de Obras</h4>
                            </div>
                            <button 
                                onClick={() => onViewProjects && onViewProjects(selectedClient.name)}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center bg-blue-50 px-3 py-1.5 rounded-md transition hover:shadow-sm"
                            >
                                IR PARA OBRAS <ArrowRight size={14} className="ml-1.5" />
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {clientProjects.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-medium text-xs uppercase sticky top-0 border-b border-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-xs">Obra</th>
                                            <th className="px-4 py-3 text-xs">Início</th>
                                            <th className="px-4 py-3 text-right text-xs">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {clientProjects.map((project) => (
                                            <tr key={project.id} className="hover:bg-gray-50 transition group cursor-pointer" onClick={() => onViewProjects && onViewProjects(selectedClient.name)}>
                                                <td className="px-4 py-3 font-medium text-gray-800 group-hover:text-blue-600 flex items-center">
                                                    {project.title}
                                                    <ExternalLink size={12} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <Calendar size={12} className="mr-1.5 text-gray-400" />
                                                        {project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(project.status)} whitespace-nowrap`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-10 text-center text-gray-500 text-sm">
                                    <HardHat size={32} className="mx-auto text-gray-200 mb-2" />
                                    Nenhuma obra registrada para este cliente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t border-gray-100 shrink-0 bg-white">
                     <button
                        onClick={() => setIsDetailsOpen(false)}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-bold transition flex items-center shadow-sm"
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

export default Clients;
