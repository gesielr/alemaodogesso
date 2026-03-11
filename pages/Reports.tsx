import React, { useState } from 'react';
import { FileText, Download, TrendingUp, DollarSign, Package, Calendar, Eye, Loader2, Users } from 'lucide-react';
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
  },
  {
    id: 6,
    title: 'Mao de Obra e Montadores',
    desc: 'Pagamentos e despesas detalhadas por montador.',
    icon: Users,
    color: 'text-purple-600 bg-purple-50'
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

    if (report.id === 6) {
      const projects = await api.getProjects();
      let allLaborCosts: any[] = [];

      // Busca custos de todos os projetos (isso pode ser otimizado no futuro)
      for (const p of projects) {
        const costs = await api.getProjectCosts(p.id);
        const labor = costs.filter(c => c.type === 'LABOR' && inRange(c.date, period.start, period.end));
        allLaborCosts = [...allLaborCosts, ...labor];
      }

      return buildLaborReport(allLaborCosts);
    }

    const projects = await api.getProjects();
    const today = new Date();

    const delayed = projects.filter((project) => {
      if (!project.approved_at || !project.execution_deadline_days) return false;

      const approvedDate = new Date(project.approved_at);
      const deadlineDate = new Date(approvedDate);
      deadlineDate.setDate(approvedDate.getDate() + Number(project.execution_deadline_days));

      const isDelayed = deadlineDate < today;
      const isClosed =
        project.status === ProjectStatus.CONCLUIDO || project.status === ProjectStatus.CANCELADO;

      // Filtro por período (opcional, aqui estamos vendo todas as atrasadas não encerradas)
      return isDelayed && !isClosed;
    });

    const rows = delayed.map((project) => {
      const approvedDate = new Date(project.approved_at!);
      const deadlineDate = new Date(approvedDate);
      deadlineDate.setDate(approvedDate.getDate() + Number(project.execution_deadline_days));

      const delayDays = Math.floor((today.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));

      return [
        project.title,
        project.client_name || '-',
        formatDateLabel(toIsoDate(deadlineDate)),
        project.status,
        `${Math.max(0, delayDays)} dias`
      ];
    });

    return {
      columns: ['Obra', 'Cliente', 'Prazo Final', 'Status', 'Atraso'],
      rows: rows.length > 0 ? rows : [['Sem obras em atraso no momento', '-', '-', '-', '-']],
      summary: [`Obras em atraso: ${delayed.length}`]
    };
  };

  const buildLaborReport = (costs: any[]): ReportDataset => {
    const rows = costs.map((cost) => [
      formatDateLabel(cost.date),
      cost.worker_name || '-',
      cost.description,
      formatMoney(cost.amount),
      formatMoney(cost.labor_daily_value || 0),
      formatMoney((cost.labor_snack_value || 0) + (cost.labor_transport_value || 0))
    ]);

    const total = costs.reduce((acc, cost) => acc + (Number(cost.amount) || 0), 0);
    const totalDaily = costs.reduce((acc, cost) => acc + (Number(cost.labor_daily_value) || 0), 0);
    const totalExtras = costs.reduce((acc, cost) => acc + (Number(cost.labor_snack_value || 0) + Number(cost.labor_transport_value || 0)), 0);

    return {
      columns: ['Data', 'Montador', 'Servico', 'Total', 'Diaria', 'Extras'],
      rows: rows.length > 0 ? rows : [['Sem dados no periodo', '-', '-', '-', '-', '-']],
      summary: [
        `Lancamentos de mao de obra: ${costs.length}`,
        `Total Pago: ${formatMoney(total)}`,
        `Total Diarias: ${formatMoney(totalDaily)}`,
        `Total Extras (Lanche/Transporte): ${formatMoney(totalExtras)}`
      ]
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inteligência de Dados</h1>
          <p className="text-slate-500 mt-1 font-medium italic">
            Geração de relatórios gerenciais e análise de performance operacional.
          </p>
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
            <div key={report.id} className="premium-card p-6 flex flex-col group">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300 ${report.color} shadow-sm`}>
                <Icon size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{report.title}</h3>
              <p className="text-xs text-slate-400 font-medium mb-6 flex-1 leading-relaxed italic">{report.desc}</p>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Período de Análise</label>
                  <select
                    className="w-full text-xs font-bold border-slate-200 rounded-xl border p-2.5 bg-white text-slate-800 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
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
                    <div className="grid grid-cols-2 gap-2 mt-3 animate-in slide-in-from-top-2 duration-300">
                      <input
                        type="date"
                        className="w-full text-[11px] font-bold border-slate-200 rounded-xl border p-2 bg-white text-slate-700 outline-none"
                        value={customRange.start}
                        onChange={(e) => handleCustomDateChange(report.id, 'start', e.target.value)}
                      />
                      <input
                        type="date"
                        className="w-full text-[11px] font-bold border-slate-200 rounded-xl border p-2 bg-white text-slate-700 outline-none"
                        value={customRange.end}
                        onChange={(e) => handleCustomDateChange(report.id, 'end', e.target.value)}
                      />
                    </div>
                  )}
                  {periodError && <p className="text-[10px] font-bold text-rose-500 mt-2 px-1">{periodError}</p>}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => handleRun(report, 'preview')}
                  disabled={Boolean(runningReport)}
                  className="w-full flex items-center justify-center bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 font-black text-[10px] uppercase tracking-widest py-3.5 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isPreviewLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Eye size={16} className="mr-2" />}
                  Visualizar Dados
                </button>
                <button
                  onClick={() => handleRun(report, 'pdf')}
                  disabled={Boolean(runningReport)}
                  className="w-full flex items-center justify-center bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest py-3.5 rounded-2xl shadow-xl shadow-slate-900/10 transition-all active:scale-95 hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isPdfLoading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  Exportar PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-in slide-up duration-700">
          <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/30 backdrop-blur-sm">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{preview.title}</h3>
                <span className="text-[10px] px-3 py-1 rounded-full bg-blue-600 text-white font-black uppercase tracking-widest">
                  Preview Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-tighter italic">Competência: {preview.periodLabel}</p>
            </div>
            {lastGeneratedReport && (
                <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 scale-90 md:scale-100 rounded-full border border-emerald-100 shadow-sm animate-in fade-in">
                  ✓ Documento Consolidado
                </div>
            )}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100">
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column} className="px-8 py-5">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {preview.rows.slice(0, 25).map((row, rowIndex) => (
                  <tr key={`preview-row-${rowIndex}`} className="hover:bg-slate-50/50 transition-all group">
                    {row.map((cell, cellIndex) => (
                      <td key={`preview-cell-${rowIndex}-${cellIndex}`} className="px-8 py-5 text-sm font-bold text-slate-700 group-hover:text-blue-600">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-10 bg-slate-900 text-white flex flex-wrap gap-x-12 gap-y-6">
            {preview.summary.map((line, index) => (
               <div key={`summary-${index}`} className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{line.split(':')[0]}</span>
                  <span className="text-lg font-black tracking-tight">{line.split(':')[1] || line}</span>
               </div>
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
