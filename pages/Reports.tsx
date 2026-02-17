import React, { useState } from 'react';
import { FileText, Download, TrendingUp, DollarSign, Package, Calendar } from 'lucide-react';
import { api } from '../services/api';

type ReportPeriodPreset = 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM';

type ReportDefinition = {
  id: number;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
};

const reports: ReportDefinition[] = [
  {
    id: 1,
    title: 'Relatorio de Lucratividade',
    desc: 'Analise detalhada de lucro por obra.',
    icon: TrendingUp,
    color: 'text-green-600 bg-green-50'
  },
  {
    id: 2,
    title: 'Fluxo de Caixa Mensal',
    desc: 'Entradas e saidas agrupadas por categoria.',
    icon: DollarSign,
    color: 'text-blue-600 bg-blue-50'
  },
  {
    id: 3,
    title: 'Movimentacao de Estoque',
    desc: 'Historico de uso de material por periodo.',
    icon: Package,
    color: 'text-orange-600 bg-orange-50'
  },
  {
    id: 4,
    title: 'Custo de Frota',
    desc: 'Gastos com combustivel e manutencao.',
    icon: FileText,
    color: 'text-gray-600 bg-gray-50'
  },
  {
    id: 5,
    title: 'Obras em Atraso',
    desc: 'Lista de projetos fora do cronograma.',
    icon: Calendar,
    color: 'text-red-600 bg-red-50'
  }
];

const periodOptions: { value: ReportPeriodPreset; label: string }[] = [
  { value: 'LAST_30_DAYS', label: 'Ultimos 30 dias' },
  { value: 'THIS_MONTH', label: 'Este Mes' },
  { value: 'LAST_MONTH', label: 'Mes Passado' },
  { value: 'THIS_YEAR', label: 'Este Ano' },
  { value: 'CUSTOM', label: 'Personalizado' }
];

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateIso: string) => {
  const [yearText, monthText, dayText] = dateIso.split('-');
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
  return date.toLocaleDateString('pt-BR');
};

const getPresetPeriod = (preset: Exclude<ReportPeriodPreset, 'CUSTOM'>) => {
  const today = new Date();

  if (preset === 'LAST_30_DAYS') {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return {
      start: toIsoDate(start),
      end: toIsoDate(today),
      label: 'Ultimos 30 dias'
    };
  }

  if (preset === 'THIS_MONTH') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: toIsoDate(start),
      end: toIsoDate(today),
      label: 'Este mes'
    };
  }

  if (preset === 'LAST_MONTH') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return {
      start: toIsoDate(start),
      end: toIsoDate(end),
      label: 'Mes passado'
    };
  }

  const start = new Date(today.getFullYear(), 0, 1);
  return {
    start: toIsoDate(start),
    end: toIsoDate(today),
    label: 'Este ano'
  };
};

const Reports: React.FC = () => {
  const defaultPeriod: ReportPeriodPreset = 'LAST_30_DAYS';

  const [generatingReportId, setGeneratingReportId] = useState<number | null>(null);
  const [lastGeneratedReport, setLastGeneratedReport] = useState<string>('');
  const [periodByReportId, setPeriodByReportId] = useState<Record<number, ReportPeriodPreset>>(
    () =>
      Object.fromEntries(reports.map((report) => [report.id, defaultPeriod])) as Record<
        number,
        ReportPeriodPreset
      >
  );
  const [customRangeByReportId, setCustomRangeByReportId] = useState<
    Record<number, { start: string; end: string }>
  >({});
  const [periodErrorByReportId, setPeriodErrorByReportId] = useState<Record<number, string>>({});

  const setPeriodError = (reportId: number, message: string) => {
    setPeriodErrorByReportId((prev) => ({ ...prev, [reportId]: message }));
  };

  const clearPeriodError = (reportId: number) => {
    setPeriodErrorByReportId((prev) => ({ ...prev, [reportId]: '' }));
  };

  const resolvePeriod = (reportId: number) => {
    const selected = periodByReportId[reportId] ?? defaultPeriod;

    if (selected === 'CUSTOM') {
      const range = customRangeByReportId[reportId];
      if (!range?.start || !range?.end) {
        setPeriodError(reportId, 'Informe data inicial e final para periodo personalizado.');
        return null;
      }

      if (range.start > range.end) {
        setPeriodError(reportId, 'A data inicial nao pode ser maior que a data final.');
        return null;
      }

      return {
        start: range.start,
        end: range.end,
        label: `Personalizado (${formatDateLabel(range.start)} ate ${formatDateLabel(range.end)})`
      };
    }

    return getPresetPeriod(selected);
  };

  const handlePeriodChange = (reportId: number, period: ReportPeriodPreset) => {
    setPeriodByReportId((prev) => ({ ...prev, [reportId]: period }));
    clearPeriodError(reportId);
  };

  const handleCustomDateChange = (reportId: number, field: 'start' | 'end', value: string) => {
    setCustomRangeByReportId((prev) => ({
      ...prev,
      [reportId]: {
        ...(prev[reportId] ?? { start: '', end: '' }),
        [field]: value
      }
    }));
    clearPeriodError(reportId);
  };

  const handleGenerate = async (report: ReportDefinition) => {
    clearPeriodError(report.id);

    const resolved = resolvePeriod(report.id);
    if (!resolved) return;

    setGeneratingReportId(report.id);
    try {
      await api.addReportExport({
        report_name: report.title,
        period_start: resolved.start,
        period_end: resolved.end,
        file_format: 'pdf',
        notes: `Periodo selecionado: ${resolved.label}`
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      setLastGeneratedReport(`${report.title} - ${resolved.label}`);
    } catch (error) {
      console.error('Erro ao gerar relatorio:', error);
      alert('Nao foi possivel gerar o relatorio. Tente novamente.');
    } finally {
      setGeneratingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatorios Gerenciais</h1>
          <p className="text-gray-500 text-sm">Exporte dados estrategicos para PDF ou Excel.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const selectedPeriod = periodByReportId[report.id] ?? defaultPeriod;
          const customRange = customRangeByReportId[report.id] ?? { start: '', end: '' };
          const periodError = periodErrorByReportId[report.id] ?? '';

          return (
            <div key={report.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${report.color}`}>
                <Icon size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{report.title}</h3>
              <p className="text-sm text-gray-500 mb-6 h-10">{report.desc}</p>

              <div className="space-y-3">
                <select
                  className="w-full text-sm border-gray-300 rounded-md border p-2 bg-gray-50"
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(report.id, e.target.value as ReportPeriodPreset)}
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {selectedPeriod === 'CUSTOM' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="w-full text-sm border-gray-300 rounded-md border p-2 bg-white text-gray-900"
                      value={customRange.start}
                      onChange={(e) => handleCustomDateChange(report.id, 'start', e.target.value)}
                    />
                    <input
                      type="date"
                      className="w-full text-sm border-gray-300 rounded-md border p-2 bg-white text-gray-900"
                      value={customRange.end}
                      onChange={(e) => handleCustomDateChange(report.id, 'end', e.target.value)}
                    />
                  </div>
                )}

                {periodError && <p className="text-xs text-red-600">{periodError}</p>}
              </div>

              <button
                onClick={() => handleGenerate(report)}
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
          Relatorio gerado com sucesso: <strong>{lastGeneratedReport}</strong>.
        </div>
      )}

      <div className="bg-blue-600 rounded-xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-lg mt-8">
        <div className="mb-4 md:mb-0">
          <h3 className="text-2xl font-bold mb-2">Precisa de um relatorio personalizado?</h3>
          <p className="text-blue-100 opacity-90">Nossa IA pode gerar analises especificas para seu negocio.</p>
        </div>
        <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition shadow-lg">
          Solicitar Analise
        </button>
      </div>
    </div>
  );
};

export default Reports;
