import React, { useState } from 'react';
import { FileText, Download, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';

const Reports: React.FC = () => {
  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);
  const [lastGeneratedReport, setLastGeneratedReport] = useState<string>('');

  const reports = [
    { id: 1, title: 'Relatório de Lucratividade', desc: 'Análise detalhada de lucro por obra.', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
    { id: 2, title: 'Fluxo de Caixa Mensal', desc: 'Entradas e saídas agrupadas por categoria.', icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
    { id: 3, title: 'Movimentação de Estoque', desc: 'Histórico de uso de material por período.', icon: Package, color: 'text-orange-600 bg-orange-50' },
    { id: 4, title: 'Custo de Frota', desc: 'Gastos com combustível e manutenção.', icon: FileText, color: 'text-gray-600 bg-gray-50' },
    { id: 5, title: 'Obras em Atraso', desc: 'Lista de projetos fora do cronograma.', icon: Calendar, color: 'text-red-600 bg-red-50' },
  ];

  const handleGenerate = async (reportId: number, title: string) => {
      setGeneratingReportId(reportId);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setGeneratingReportId(null);
      setLastGeneratedReport(title);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
            <p className="text-gray-500 text-sm">Exporte dados estratégicos para PDF ou Excel.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
            const Icon = report.icon;
            return (
                <div key={report.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${report.color}`}>
                        <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{report.title}</h3>
                    <p className="text-sm text-gray-500 mb-6 h-10">{report.desc}</p>
                    
                    <div className="flex items-center gap-3">
                         <div className="flex-1">
                             <select className="w-full text-sm border-gray-300 rounded-md border p-2 bg-gray-50">
                                 <option>Últimos 30 dias</option>
                                 <option>Este Mês</option>
                                 <option>Mês Passado</option>
                                 <option>Este Ano</option>
                             </select>
                         </div>
                    </div>
                    
                    <button 
                        onClick={() => handleGenerate(report.id, report.title)}
                        disabled={generatingReportId === report.id}
                        className="w-full mt-4 flex items-center justify-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <Download size={16} className="mr-2" />
                        {generatingReportId === report.id ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                </div>
            );
        })}
      </div>

      {lastGeneratedReport && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Relatório gerado com sucesso: <strong>{lastGeneratedReport}</strong> (simulação).
        </div>
      )}

      <div className="bg-blue-600 rounded-xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg mt-8">
          <div className="mb-4 md:mb-0">
              <h3 className="text-2xl font-bold mb-2">Precisa de um relatório personalizado?</h3>
              <p className="text-blue-100 opacity-90">Nossa IA pode gerar análises específicas para seu negócio.</p>
          </div>
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition shadow-lg">
              Solicitar Análise
          </button>
      </div>
    </div>
  );
};

export default Reports;
