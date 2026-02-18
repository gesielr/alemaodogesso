import React, { useState } from 'react';
import { FileText, Download, TrendingUp, DollarSign, Package, Calendar, Eye, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Project, ProjectStatus, Transaction, TransactionType } from '../types';
import { addStyledTable, createBasePdf, downloadBlob, sanitizePdfFilename } from '../utils/pdf';

type ReportPeriodPreset = 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM';
type ReportAction = 'preview' | 'pdf';

type ReportDefinition = {
  id: number;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
};

type ReportDataset = {
  columns: string[];
  rows: Array<Array<string | number>>;
  summary: string[];
};

type ReportPreview = {
  reportId: number;
  title: string;
  periodLabel: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  summary: string[];
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
    desc: 'Historico de materiais com rentabilidade.',
    icon: Package,
    color: 'text-orange-600 bg-orange-50'
  },
  {
    id: 4,
    title: 'Custo de Frota',
    desc: 'Gastos de combustivel e manutencao por periodo.',
    icon: FileText,
    color: 'text-gray-600 bg-gray-50'
  },
  {
    id: 5,
    title: 'Obras em Atraso',
    desc: 'Lista de obras fora do prazo.',
    icon: Calendar,
    color: 'text-red-600 bg-red-50'
  }
];

const periodOptions: { value: ReportPeriodPreset; label: string }[] = [
  { value: 'LAST_30_DAYS', label: 'Ultimos 30 dias' },
  { value: 'THIS_MONTH', label: 'Este mes' },
  { value: 'LAST_MONTH', label: 'Mes passado' },
  { value: 'THIS_YEAR', label: 'Este ano' },
  { value: 'CUSTOM', label: 'Personalizado' }
];

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateIso: string) => {
  if (!dateIso) return '-';
  const [yearText, monthText, dayText] = dateIso.split('-');
  const date = new Date(Number(yearText), Number(monthText) - 1, Number(dayText));
  return date.toLocaleDateString('pt-BR');
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const inRange = (dateIso: string | undefined, startIso: string, endIso: string) => {
  if (!dateIso) return false;
  return dateIso >= startIso && dateIso <= endIso;
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

const buildProfitabilityReport = (projects: Project[]): ReportDataset => {
  const rows = projects.map((project) => {
    const totalValue = Number(project.total_value) || 0;
    const totalCost = Number(project.total_cost) || 0;
    const profit = Number(project.profit_margin) || totalValue - totalCost;

    return [
      project.title,
      project.client_name || '-',
      formatMoney(totalValue),
      formatMoney(totalCost),
      formatMoney(profit)
    ];
  });

  const totalRevenue = projects.reduce((acc, project) => acc + (Number(project.total_value) || 0), 0);
  const totalCost = projects.reduce((acc, project) => acc + (Number(project.total_cost) || 0), 0);

  return {
    columns: ['Obra', 'Cliente', 'Receita', 'Custo', 'Lucro'],
    rows: rows.length > 0 ? rows : [['Sem dados no periodo selecionado', '-', '-', '-', '-']],
    summary: [
      `Total de obras no periodo: ${projects.length}`,
      `Receita total: ${formatMoney(totalRevenue)}`,
      `Custo total: ${formatMoney(totalCost)}`,
      `Lucro total: ${formatMoney(totalRevenue - totalCost)}`
    ]
  };
};

const buildCashFlowReport = (transactions: Transaction[]): ReportDataset => {
  const grouped = new Map<string, { revenue: number; expense: number }>();

  transactions.forEach((tx) => {
    const category = tx.category || 'Outros';
    const current = grouped.get(category) ?? { revenue: 0, expense: 0 };
    if (tx.type === TransactionType.RECEITA) {
      current.revenue += Number(tx.paid_amount ?? tx.amount) || 0;
    } else {
      current.expense += Number(tx.paid_amount ?? tx.amount) || 0;
    }
    grouped.set(category, current);
  });

  const rows = Array.from(grouped.entries()).map(([category, values]) => [
    category,
    formatMoney(values.revenue),
    formatMoney(values.expense),
    formatMoney(values.revenue - values.expense)
  ]);

  const totalRevenue = Array.from(grouped.values()).reduce((acc, values) => acc + values.revenue, 0);
  const totalExpense = Array.from(grouped.values()).reduce((acc, values) => acc + values.expense, 0);

  return {
    columns: ['Categoria', 'Receitas', 'Despesas', 'Saldo'],
    rows: rows.length > 0 ? rows : [['Sem dados no periodo selecionado', '-', '-', '-']],
    summary: [
      `Lancamentos no periodo: ${transactions.length}`,
      `Receitas: ${formatMoney(totalRevenue)}`,
      `Despesas: ${formatMoney(totalExpense)}`,
      `Saldo: ${formatMoney(totalRevenue - totalExpense)}`
    ]
  };
};

const Reports: React.FC = () => {
  const defaultPeriod: ReportPeriodPreset = 'LAST_30_DAYS';

  const [runningReport, setRunningReport] = useState<{ reportId: number; action: ReportAction } | null>(null);
  const [lastGeneratedReport, setLastGeneratedReport] = useState<string>('');
  const [preview, setPreview] = useState<ReportPreview | null>(null);
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

  const setPreviewData = (
    report: ReportDefinition,
    periodLabel: string,
    dataset: ReportDataset
  ) => {
    setPreview({
      reportId: report.id,
      title: report.title,
      periodLabel,
      columns: dataset.columns,
      rows: dataset.rows,
      summary: dataset.summary
    });
  };

  const buildDataset = async (
    report: ReportDefinition,
    period: { start: string; end: string; label: string }
  ): Promise<ReportDataset> => {
    if (report.id === 1) {
      const projects = await api.getProjects();
      const filtered = projects.filter((project) => inRange(project.start_date, period.start, period.end));
      return buildProfitabilityReport(filtered);
    }

    if (report.id === 2) {
      const transactions = await api.getTransactions();
      const filtered = transactions.filter((tx) => inRange(tx.date, period.start, period.end));
      return buildCashFlowReport(filtered);
    }

    if (report.id === 3) {
      const materials = await api.getInventory();
      const rows = materials.map((item) => [
        item.name,
        item.unit,
        formatMoney(item.price_cost),
        formatMoney(item.price_sale || 0),
        `${(item.profitability_pct || 0).toFixed(2)}%`,
        Number(item.quantity || 0).toFixed(2)
      ]);

      return {
        columns: ['Item', 'Unid.', 'Custo', 'Venda', 'Rentab.', 'Estoque'],
        rows: rows.length > 0 ? rows : [['Sem materiais cadastrados', '-', '-', '-', '-', '-']],
        summary: [
          `Itens em estoque: ${materials.length}`,
          `Itens abaixo do minimo: ${materials.filter((item) => item.quantity <= item.min_quantity).length}`
        ]
      };
    }

    if (report.id === 4) {
      const transactions = await api.getTransactions();
      const filtered = transactions.filter((tx) => {
        if (!inRange(tx.date, period.start, period.end)) return false;
        const normalizedCategory = (tx.category || '').toLowerCase();
        return (
          normalizedCategory.includes('combust') ||
          normalizedCategory.includes('manut') ||
          Boolean(tx.vehicle_id)
        );
      });

      const rows = filtered.map((tx) => [
        formatDateLabel(tx.date),
        tx.description,
        tx.category,
        formatMoney(Number(tx.paid_amount ?? tx.amount) || 0)
      ]);

      const total = filtered.reduce(
        (acc, tx) => acc + (Number(tx.paid_amount ?? tx.amount) || 0),
        0
      );

      return {
        columns: ['Data', 'Descricao', 'Categoria', 'Valor'],
        rows: rows.length > 0 ? rows : [['Sem gastos de frota no periodo', '-', '-', '-']],
        summary: [`Lancamentos de frota: ${filtered.length}`, `Total: ${formatMoney(total)}`]
      };
    }

    const projects = await api.getProjects();
    const todayIso = toIsoDate(new Date());
    const delayed = projects.filter((project) => {
      const ended = project.end_date;
      const isDelayed = Boolean(ended && ended < todayIso);
      const isClosed =
        project.status === ProjectStatus.CONCLUIDO || project.status === ProjectStatus.CANCELADO;
      const withinSelectedPeriod = inRange(project.end_date, period.start, period.end);
      return isDelayed && !isClosed && withinSelectedPeriod;
    });

    const rows = delayed.map((project) => {
      const delayDays = project.end_date
        ? Math.floor((new Date(todayIso).getTime() - new Date(project.end_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return [
        project.title,
        project.client_name || '-',
        formatDateLabel(project.end_date || ''),
        project.status,
        `${Math.max(0, delayDays)} dias`
      ];
    });

    return {
      columns: ['Obra', 'Cliente', 'Prazo Final', 'Status', 'Atraso'],
      rows: rows.length > 0 ? rows : [['Sem obras em atraso no periodo', '-', '-', '-', '-']],
      summary: [`Obras em atraso: ${delayed.length}`]
    };
  };

  const generatePdf = async (
    report: ReportDefinition,
    periodLabel: string,
    periodRange: { start: string; end: string },
    dataset: ReportDataset
  ) => {
    const subtitle = `${periodLabel} | ${formatDateLabel(periodRange.start)} a ${formatDateLabel(periodRange.end)}`;
    const { doc, startY } = await createBasePdf(report.title, subtitle);

    const tableRows = dataset.rows.slice(0, 200);
    const finalY = addStyledTable(doc, dataset.columns, tableRows, startY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Resumo', 40, finalY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    dataset.summary.forEach((line, index) => {
      doc.text(`- ${line}`, 40, finalY + 42 + index * 14);
    });

    const fileName = `${sanitizePdfFilename(report.title)}-${periodRange.start}-${periodRange.end}.pdf`;
    const blob = doc.output('blob');
    downloadBlob(blob, fileName);
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

  const handleRun = async (report: ReportDefinition, action: ReportAction) => {
    clearPeriodError(report.id);

    const resolved = resolvePeriod(report.id);
    if (!resolved) return;

    setRunningReport({ reportId: report.id, action });
    try {
      const dataset = await buildDataset(report, resolved);
      setPreviewData(report, resolved.label, dataset);

      if (action === 'pdf') {
        await generatePdf(report, resolved.label, { start: resolved.start, end: resolved.end }, dataset);

        await api.addReportExport({
          report_name: report.title,
          period_start: resolved.start,
          period_end: resolved.end,
          file_format: 'pdf',
          notes: `Periodo: ${resolved.label}`
        });

        setLastGeneratedReport(`${report.title} - ${resolved.label}`);
      }
    } catch (error) {
      console.error('Erro ao processar relatorio:', error);
      alert('Nao foi possivel processar o relatorio. Tente novamente.');
    } finally {
      setRunningReport(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatorios Gerenciais</h1>
          <p className="text-gray-500 text-sm">Visualize na tela e baixe em PDF com layout profissional.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => {
          const Icon = report.icon;
          const selectedPeriod = periodByReportId[report.id] ?? defaultPeriod;
          const customRange = customRangeByReportId[report.id] ?? { start: '', end: '' };
          const periodError = periodErrorByReportId[report.id] ?? '';
          const isPreviewLoading =
            runningReport?.reportId === report.id && runningReport.action === 'preview';
          const isPdfLoading = runningReport?.reportId === report.id && runningReport.action === 'pdf';

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

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRun(report, 'preview')}
                  disabled={Boolean(runningReport)}
                  className="flex items-center justify-center border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPreviewLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Eye size={16} className="mr-2" />}
                  Visualizar
                </button>
                <button
                  onClick={() => handleRun(report, 'pdf')}
                  disabled={Boolean(runningReport)}
                  className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPdfLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  Baixar PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{preview.title}</h3>
              <p className="text-sm text-gray-500">Periodo: {preview.periodLabel}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
              Visualizacao em tela
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="bg-white border-b border-gray-200 text-xs uppercase text-gray-500">
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column} className="px-4 py-3">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.slice(0, 25).map((row, rowIndex) => (
                  <tr key={`preview-row-${rowIndex}`} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td key={`preview-cell-${rowIndex}-${cellIndex}`} className="px-4 py-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-1">
            {preview.summary.map((line, index) => (
              <p key={`summary-${index}`} className="text-sm text-gray-700">{line}</p>
            ))}
          </div>
        </div>
      )}

      {lastGeneratedReport && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          Relatorio gerado com sucesso: <strong>{lastGeneratedReport}</strong>.
        </div>
      )}
    </div>
  );
};

export default Reports;
