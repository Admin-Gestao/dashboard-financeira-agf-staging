"use client";

import { ReactElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";

type TimelineMetric = "resultado" | "receita" | "despesa" | "margem";
type BenchmarkMetric = "margem" | "folha" | "aluguel" | "despesa" | "parcelas";
type SimulationView = "margem" | "resultado";

type SimulationTargets = Partial<Record<string, string>>;

const ALL_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const ALERT_LIMITS = {
  quedaReceitaPct: -30,
  margemCriticaPct: 10,
  folhaPct: 20,
  aluguelPct: 20,
  despesaPct: 90,
  extrasPct: 15,
  parcelasPct: 10,
};

const RISK_COLORS = {
  low: "#27B08B",
  medium: "#C49B52",
  high: "#D95F6E",
};

const CHART_COLORS = {
  receita: "#5E7FC4",
  despesa: "#D95F6E",
  resultado: "#27B08B",
  margem: "#9A7FF0",
  objetos: "#C49B52",
  folha: "#7A93D6",
  parcela: "#C49B52",
  extras: "#C49B52",
  warning: "#C49B52",
  accent: "#A67C3A",
};

const CATEGORY_LABELS: Record<string, string> = {
  aluguel: "Aluguel",
  comissoes: "Comissoes",
  extras: "Extras",
  honorarios: "Honorarios",
  impostos: "Impostos",
  parcela_debitos: "Parcela Debitos",
  pitney: "Pitney",
  telefone: "Telefone",
  veiculos: "Veiculos",
  folha_pagamento: "Folha",
  outras_despesas: "Outras despesas",
};

const TIMELINE_METRICS: Array<{ key: TimelineMetric; label: string }> = [
  { key: "resultado", label: "Resultado" },
  { key: "receita", label: "Receita" },
  { key: "despesa", label: "Despesa" },
  { key: "margem", label: "Margem" },
];

const BENCHMARK_METRICS: Array<{ key: BenchmarkMetric; label: string }> = [
  { key: "margem", label: "Margem" },
  { key: "folha", label: "Folha/Rec" },
  { key: "aluguel", label: "Aluguel/Rec" },
  { key: "despesa", label: "Despesa/Rec" },
  { key: "parcelas", label: "Parcelas/Rec" },
];

const SIMULATION_VIEWS: Array<{ key: SimulationView; label: string }> = [
  { key: "margem", label: "Margem" },
  { key: "resultado", label: "Resultado" },
];

const DEFAULT_TARGETS: SimulationTargets = {};

type ApiMonthData = {
  receita?: number;
  objetos?: number;
  despesa_total?: number;
  despesas?: Record<string, number>;
  despesa_subcontas_total?: number;
  folha_sem_descricao?: number;
};

type ApiData = {
  agfs: Array<{ id: string; nome: string }>;
  categoriasDespesa: string[];
  dados: Record<string, Record<string, Record<string, ApiMonthData>>>;
};

const generateMockData = (agfs: string[], anos: number[], meses: number[]) => {
  const data: ApiData["dados"] = {};

  for (const ano of anos) {
    data[ano] = {};
    for (const mes of meses) {
      data[ano][mes] = {};

      for (const agf of agfs) {
        const receita = 60000 + Math.random() * 40000;
        const aluguel = receita * (0.05 + Math.random() * 0.08);
        const comissoes = receita * (0.03 + Math.random() * 0.08);
        const extras = receita * (0.01 + Math.random() * 0.1);
        const impostos = receita * (0.05 + Math.random() * 0.08);
        const telefone = receita * 0.01;
        const honorarios = receita * 0.02;
        const pitney = receita * 0.015;
        const veiculos = receita * 0.025;
        const folha = receita * (0.11 + Math.random() * 0.12);
        const parcelaDebitos = Math.random() > 0.85 ? receita * 0.14 : 0;
        const despesaTotal =
          aluguel +
          comissoes +
          extras +
          impostos +
          telefone +
          honorarios +
          pitney +
          veiculos +
          folha +
          parcelaDebitos;

        data[ano][mes][agf] = {
          receita,
          objetos: Math.floor(receita / 3.8),
          despesa_total: despesaTotal,
          despesas: {
            aluguel,
            comissoes,
            extras,
            honorarios,
            impostos,
            parcela_debitos: parcelaDebitos,
            pitney,
            telefone,
            veiculos,
            folha_pagamento: folha,
          },
          despesa_subcontas_total: despesaTotal,
          folha_sem_descricao: parcelaDebitos > 0 ? receita * 0.02 : 0,
        };
      }
    }
  }

  return data;
};

const mockAgfs = [
  { id: "sj", nome: "Sao Jorge" },
  { id: "mr", nome: "Marajoara" },
  { id: "pl", nome: "Parque do Lago" },
  { id: "rp", nome: "Republica" },
];

const mockApiData: ApiData = {
  agfs: mockAgfs,
  categoriasDespesa: [
    "aluguel",
    "comissoes",
    "extras",
    "honorarios",
    "impostos",
    "parcela_debitos",
    "pitney",
    "telefone",
    "veiculos",
    "folha_pagamento",
  ],
  dados: generateMockData(
    mockAgfs.map((item) => item.nome),
    [2025, 2026],
    ALL_MONTHS
  ),
};

const formatCurrency = (value: number) =>
  Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatPercent = (value: number) => `${Number(value ?? 0).toFixed(1)}%`;
const formatNumber = (value: number) => Number(value ?? 0).toLocaleString("pt-BR");
const formatCompact = (value: number) => Number(value ?? 0).toLocaleString("pt-BR", { notation: "compact" });
const ratio = (value: number, base: number) => (base > 0 ? (value / base) * 100 : 0);

function pctChange(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / previous) * 100;
}

function safeNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function normalizeForCompare(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const Card = ({
  title,
  value,
  borderColor,
  valueColor,
  subtitle,
  compact = false,
}: {
  title: string;
  value: string;
  borderColor: string;
  valueColor?: string;
  subtitle?: string;
  compact?: boolean;
}) => (
  <div
    className={`dashboard-surface dashboard-surface-hover border-t-[2px] ${compact ? "p-[11px] md:p-[12px]" : "p-[14px] md:p-4"}`}
    style={{ borderTopColor: borderColor }}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="kpi-label text-text/80">{title}</h3>
        <p
          className={`tabular mt-1.5 leading-none font-semibold ${valueColor || "text-text"} ${
            compact ? "text-[16px] md:text-[18px]" : "kpi-value"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
    {subtitle ? <p className="text-[11px] text-text/48 mt-2">{subtitle}</p> : null}
  </div>
);

const ChartContainer = ({
  title,
  children,
  className = "",
  chartMinWidth,
  actions,
}: {
  title: string;
  children: ReactElement;
  className?: string;
  chartMinWidth?: number;
  actions?: ReactElement;
}) => (
  <div className={`dashboard-surface dashboard-surface-hover p-4 flex flex-col ${className}`}>
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
      {title ? <h3 className="chart-title font-display italic font-normal text-[14px] tracking-[-0.01em] text-text">{title}</h3> : <span />}
      {actions ?? null}
    </div>
    <div className="flex-grow h-full w-full overflow-x-auto overflow-y-hidden pb-2">
      <div className="h-full" style={chartMinWidth ? { minWidth: `${chartMinWidth}px` } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

function GlowActiveDot(props: any) {
  const { cx, cy } = props;

  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null;

  return (
    <g pointerEvents="none">
      {/* Premium spotlight around the active point without changing chart logic. */}
      <ellipse cx={cx} cy={cy} rx={48} ry={18} fill="url(#timelineSpotGlow)" opacity={0.72} />
      <circle cx={cx} cy={cy} r={22} fill="rgba(244, 214, 140, 0.08)" filter="url(#timelineDotGlow)" />
      <circle cx={cx} cy={cy} r={11} fill="rgba(244, 214, 140, 0.16)" />
      <circle cx={cx} cy={cy} r={5.5} fill="#F6D982" stroke="#FFF4C2" strokeWidth={1.8} />
      <circle cx={cx} cy={cy} r={2.4} fill="#FFF4C2" />
    </g>
  );
}

const SegmentedControl = <T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) => (
  <div className="inline-flex flex-wrap gap-[2px] bg-[var(--bg-input)] border border-[color:var(--border-subtle)] rounded-md p-[3px]">
    {items.map((item) => (
      <button
        key={item.key}
        onClick={() => onChange(item.key)}
        className={`rounded-[4px] px-[10px] py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
          value === item.key
            ? "bg-primary text-[color:var(--text-on-accent)]"
            : "bg-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-elevated)]"
        }`}
      >
        {item.label}
      </button>
    ))}
  </div>
);

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="dashboard-muted-surface px-[14px] py-[10px] text-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      style={{ borderColor: "var(--border-medium)", backgroundColor: "rgba(6,6,11,0.52)" }}
    >
      <p className="font-bold mb-1">{label}</p>
      {payload.map((item: any, index: number) => (
        <p key={index} style={{ color: item.color || item.fill || item.stroke }}>
          {item.name}: {formatter ? formatter(Number(item.value ?? 0)) : item.value}
        </p>
      ))}
    </div>
  );
};

const MetricComparisonTooltip = ({
  active,
  payload,
  label,
  valueLabel,
  valueFormatter,
  percentLabel,
  percentKey,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueLabel: string;
  valueFormatter: (value: number) => string;
  percentLabel: string;
  percentKey: string;
}) => {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  const entry = point?.payload || {};
  const mainValue = Number(point?.value ?? 0);
  const percentValue = Number(entry?.[percentKey] ?? 0);

  return (
    <div
      className="dashboard-muted-surface px-[14px] py-[10px] text-[12px] shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      style={{ borderColor: "var(--border-medium)", backgroundColor: "rgba(6,6,11,0.52)" }}
    >
      <p className="font-bold mb-1">{label}</p>
      <p style={{ color: point?.color || point?.fill || point?.stroke }}>
        {valueLabel}: {valueFormatter(mainValue)}
      </p>
      <p className="text-[#9FB0D9]">
        {percentLabel}: {formatPercent(percentValue)}
      </p>
    </div>
  );
};

const PremiumTimelineTooltip = ({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
  formatter: (value: number) => string;
}) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];

  return (
    <div
      className="rounded-[12px] px-[16px] py-[14px] text-[12px] shadow-[0_20px_40px_-22px_rgba(0,0,0,0.85)]"
      style={{
        background: "rgba(18, 18, 45, 0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.14em] text-text/55 mb-2">{label}</p>
      <p className="text-[15px] font-semibold text-text mb-1">{item.name}</p>
      <p className="text-[13px] text-[#DAB670] tabular">{formatter(Number(item.value ?? 0))}</p>
    </div>
  );
};

const MultiSelectFilter = ({
  name,
  options,
  selected,
  onSelect,
}: {
  name: string;
  options: { id: any; nome: string }[];
  selected: any[];
  onSelect: (id: any) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-[90]" ref={ref}>
      <button
        onClick={() => setIsOpen((previous) => !previous)}
        className="dashboard-muted-surface filter-control-surface text-white px-[14px] py-[7px] focus:ring-2 focus:ring-primary w-full flex justify-between items-center text-[12px] hover:border-[color:var(--border-medium)] h-8"
      >
        <span>
          {name} ({selected.length === 0 ? "Todos" : selected.length})
        </span>
        <ChevronDown size={16} />
      </button>
      {isOpen ? (
        <div className="absolute z-[140] top-full mt-2 w-full dashboard-surface filter-popover-surface max-h-60 overflow-y-auto">
          {options.map((option) => (
            <label key={option.id} className="flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-[color:var(--accent-muted)] cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                onChange={() => onSelect(option.id)}
                className="form-checkbox h-4 w-4 text-primary bg-background-end border-primary/50 rounded focus:ring-primary"
              />
              <span>{option.nome}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const AlertBadge = ({ level }: { level: "high" | "medium" | "low" }) => {
  const classes =
    level === "high"
      ? "bg-[rgba(224,92,106,0.10)] text-[#E05C6A] border-[rgba(224,92,106,0.25)]"
      : level === "medium"
        ? "bg-[rgba(212,168,83,0.10)] text-[#D4A853] border-[rgba(212,168,83,0.20)]"
        : "bg-[rgba(45,212,160,0.10)] text-[#2DD4A0] border-[rgba(45,212,160,0.20)]";

  const label = level === "high" ? "Critico" : level === "medium" ? "Atencao" : "Monitorar";

  return <span className={`text-[9px] font-semibold uppercase tracking-[0.1em] px-[7px] py-[2px] rounded-[3px] border ${classes}`}>{label}</span>;
};

export default function DashboardPage() {
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agfsSelecionadas, setAgfsSelecionadas] = useState<string[]>([]);
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([]);
  const [anosSelecionados, setAnosSelecionados] = useState<number[]>([]);
  const [timelineMetric, setTimelineMetric] = useState<TimelineMetric>("resultado");
  const [timelineExpenseCategory, setTimelineExpenseCategory] = useState<string>("__total__");
  const [benchmarkMetric, setBenchmarkMetric] = useState<BenchmarkMetric>("margem");
  const [simulationView, setSimulationView] = useState<SimulationView>("margem");
  const [simulationTargets, setSimulationTargets] = useState<SimulationTargets>(DEFAULT_TARGETS);
  const [targetDraft, setTargetDraft] = useState<{ categoria: string; valor: string }>({ categoria: "", valor: "" });
  const [heatmapAgfsSelecionadas, setHeatmapAgfsSelecionadas] = useState<string[]>([]);
  const [simulationAgfsSelecionadas, setSimulationAgfsSelecionadas] = useState<string[]>([]);
  const [waterfallMode, setWaterfallMode] = useState<"consolidado" | "agf">("consolidado");
  const [waterfallAgfId, setWaterfallAgfId] = useState<string>("");
  const categoriasExcluidas: string[] = [];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const userId = params.get("user_id");
    const empresa = params.get("empresa_id");
    const id = userId ?? empresa;

    if (id) setEmpresaId(id);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (!empresaId) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const hasUserId =
          typeof window !== "undefined" && new URLSearchParams(window.location.search).has("user_id");
        const queryParam = hasUserId ? "user_id" : "empresa_id";

        const response = await fetch(`/api/dash-data?${queryParam}=${encodeURIComponent(empresaId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`A API retornou o status ${response.status}`);
        }

        const json = await response.json();
        if (json.error) throw new Error(json.error);
        setApiData(json);
      } catch (fetchError: any) {
        setError(`Falha ao carregar dados: ${fetchError.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [empresaId]);

  const sourceData = apiData || mockApiData;
  const sourceAgfs = sourceData.agfs || [];
  const sourceCategorias = sourceData.categoriasDespesa || [];
  const sourceDados = sourceData.dados || {};
  const categoriasComOutras = useMemo(
    () => Array.from(new Set([...sourceCategorias, "outras_despesas"])),
    [sourceCategorias]
  );

  const anosDisponiveis = useMemo(() => {
    return Object.keys(sourceDados)
      .map(Number)
      .sort((a, b) => a - b);
  }, [sourceDados]);

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<number>();
    for (const ano of Object.keys(sourceDados)) {
      for (const mes of Object.keys(sourceDados[ano] || {})) {
        meses.add(Number(mes));
      }
    }
    return Array.from(meses).sort((a, b) => a - b);
  }, [sourceDados]);

  const dadosProcessados = useMemo(() => {
    const agfIdsSelecionadas = agfsSelecionadas.length > 0 ? agfsSelecionadas : sourceAgfs.map((agf) => agf.id);
    const anosSelecionadosOrdenados =
      anosSelecionados.length > 0 ? [...anosSelecionados].sort((a, b) => a - b) : anosDisponiveis;
    const mesesOrdenados =
      mesesSelecionados.length > 0 ? [...mesesSelecionados].sort((a, b) => a - b) : mesesDisponiveis.length > 0 ? mesesDisponiveis : ALL_MONTHS;
    const agfsFiltradas = sourceAgfs.filter((agf) => agfIdsSelecionadas.includes(agf.id));
    const categoriasAnaliticas = categoriasComOutras;

    const periodos = anosSelecionadosOrdenados.flatMap((ano) =>
      mesesOrdenados.map((mes) => ({
        ano,
        mes,
        key: `${ano}-${String(mes).padStart(2, "0")}`,
        label:
          anosSelecionadosOrdenados.length > 1
            ? `${MONTH_LABELS[mes - 1]}/${String(ano).slice(-2)}`
            : MONTH_LABELS[mes - 1],
      }))
    );

    const periodosConsolidados = periodos.map((periodo) => {
      const despesas = Object.fromEntries(sourceCategorias.map((categoria) => [categoria, 0])) as Record<string, number>;
      let receita = 0;
      let despesa = 0;
      let objetos = 0;
      let folhaSemDescricao = 0;

      for (const agf of agfsFiltradas) {
        const item = sourceDados?.[periodo.ano]?.[periodo.mes]?.[agf.nome];
        if (!item) continue;

        receita += Number(item.receita || 0);
        despesa += Number(item.despesa_total || 0);
        objetos += Number(item.objetos || 0);
        folhaSemDescricao += Number(item.folha_sem_descricao || 0);

        for (const categoria of sourceCategorias) {
          despesas[categoria] += Number(item.despesas?.[categoria] || 0);
        }
      }

      return {
        ...periodo,
        receita,
        despesa,
        resultado: receita - despesa,
        margem: ratio(receita - despesa, receita),
        objetos,
        despesas: {
          ...despesas,
          outras_despesas: Math.max(0, despesa - sourceCategorias.reduce((sum, categoria) => sum + Number(despesas[categoria] || 0), 0)),
        },
        folhaSemDescricao,
      };
    });

    const totaisPorAgf = agfsFiltradas.map((agf) => {
      const despesasDetalhadas = Object.fromEntries(sourceCategorias.map((categoria) => [categoria, 0])) as Record<string, number>;
      const series = periodos.map((periodo) => {
        const item = sourceDados?.[periodo.ano]?.[periodo.mes]?.[agf.nome];
        const receita = Number(item?.receita || 0);
        const despesaTotal = Number(item?.despesa_total || 0);
        const objetos = Number(item?.objetos || 0);
        const folhaSemDescricao = Number(item?.folha_sem_descricao || 0);
        const despesas = Object.fromEntries(sourceCategorias.map((categoria) => [categoria, Number(item?.despesas?.[categoria] || 0)])) as Record<string, number>;
        const resultado = receita - despesaTotal;

        for (const categoria of sourceCategorias) {
          despesasDetalhadas[categoria] += despesas[categoria];
        }

        return {
          ...periodo,
          receita,
          despesaTotal,
          resultado,
          margem: ratio(resultado, receita),
          objetos,
          despesas,
          folhaSemDescricao,
        };
      });

      const receita = series.reduce((sum, item) => sum + item.receita, 0);
      const despesaTotal = series.reduce((sum, item) => sum + item.despesaTotal, 0);
      const objetos = series.reduce((sum, item) => sum + item.objetos, 0);
      const folhaSemDescricao = series.reduce((sum, item) => sum + item.folhaSemDescricao, 0);
      const resultado = receita - despesaTotal;
      const margemLucro = ratio(resultado, receita);
      const totalSubcontas = sourceCategorias.reduce((sum, categoria) => sum + Number(despesasDetalhadas[categoria] || 0), 0);
      const ajusteSubcontas = despesaTotal - totalSubcontas;
      const outrasDespesas = Math.max(0, ajusteSubcontas);
      const folhaValor = Number(despesasDetalhadas.folha_pagamento || 0);
      const aluguelValor = Number(despesasDetalhadas.aluguel || 0);
      const extrasValor = Number(despesasDetalhadas.extras || 0);
      const parcelasValor = Number(despesasDetalhadas.parcela_debitos || 0);
      const despesasDetalhadasComOutras: Record<string, number> = {
        ...despesasDetalhadas,
        outras_despesas: outrasDespesas,
      };
      const latestWithData = [...series].reverse().find((item) => item.receita || item.despesaTotal || item.objetos);
      const previousWithData = [...series]
        .reverse()
        .filter((item) => item.receita || item.despesaTotal || item.objetos)[1];

      const variacaoReceita = latestWithData && previousWithData ? pctChange(latestWithData.receita, previousWithData.receita) : 0;
      const variacaoDespesa =
        latestWithData && previousWithData ? pctChange(latestWithData.despesaTotal, previousWithData.despesaTotal) : 0;
      const variacaoMargemPp =
        latestWithData && previousWithData ? latestWithData.margem - previousWithData.margem : 0;
      const doisUltimosNegativos = !!(
        latestWithData &&
        previousWithData &&
        latestWithData.resultado < 0 &&
        previousWithData.resultado < 0
      );

      const status =
        margemLucro >= 40 && ratio(parcelasValor, receita) < 5 && ratio(aluguelValor, receita) < 15
          ? "Benchmark"
          : margemLucro < 10 || ratio(aluguelValor, receita) > 20 || doisUltimosNegativos
            ? "Critico"
            : "Atencao";

      const categoriasExcluidasSet = new Set(categoriasExcluidas);

      const economiaCategorias = Array.from(categoriasExcluidasSet).reduce(
        (sum, categoria) => sum + Number(despesasDetalhadas[categoria] || 0),
        0
      );

      const economiaPorMetas = Object.entries(simulationTargets).reduce((sum, [categoria, targetValue]) => {
        if (categoriasExcluidasSet.has(categoria)) return sum;

        const targetPercent = safeNumber(String(targetValue).replace(",", "."));
        if (!Number.isFinite(targetPercent) || targetPercent < 0) return sum;

        const categoriaAtual = safeNumber(despesasDetalhadasComOutras[categoria] || 0);
        const metaFinanceira = receita * (targetPercent / 100);
        return sum + Math.max(0, categoriaAtual - metaFinanceira);
      }, 0);

      const economiaTotal = economiaCategorias + economiaPorMetas;
      const resultadoSimulado = resultado + economiaTotal;
      const margemSimulada = ratio(resultadoSimulado, receita);

      return {
        id: agf.id,
        nome: agf.nome,
        receita,
        despesaTotal,
        resultado,
        margemLucro,
        objetos,
        folhaSemDescricao,
        despesasDetalhadas: despesasDetalhadasComOutras,
        despesasPercentuais: Object.fromEntries(
          categoriasAnaliticas.map((categoria) => [categoria, ratio(Number(despesasDetalhadasComOutras[categoria] || 0), receita)])
        ) as Record<string, number>,
        receitaPorPeriodo: series,
        variacaoReceita,
        variacaoDespesa,
        variacaoMargemPp,
        doisUltimosNegativos,
        status,
        ajusteSubcontas,
        riscoExtraordinario: extrasValor + parcelasValor,
        despesaReceitaPct: ratio(despesaTotal, receita),
        folhaReceitaPct: ratio(folhaValor, receita),
        aluguelReceitaPct: ratio(aluguelValor, receita),
        extrasReceitaPct: ratio(extrasValor, receita),
        parcelasReceitaPct: ratio(parcelasValor, receita),
        resultadoReceitaPct: ratio(resultado, receita),
        margemLucroReal: margemLucro,
        margemLucroSimulada: margemSimulada,
        ganhoMargem: categoriasExcluidas.length > 0 || Object.values(simulationTargets).some((value) => String(value || "").trim() !== "")
          ? Math.max(0, margemSimulada - margemLucro)
          : 0,
        impactoFinanceiroSimulado: economiaTotal,
        resultadoSimulado,
      };
    });

    const totaisGerais = {
      receita: totaisPorAgf.reduce((sum, item) => sum + item.receita, 0),
      despesa: totaisPorAgf.reduce((sum, item) => sum + item.despesaTotal, 0),
      resultado: totaisPorAgf.reduce((sum, item) => sum + item.resultado, 0),
      objetos: totaisPorAgf.reduce((sum, item) => sum + item.objetos, 0),
      resultadoSimulado: totaisPorAgf.reduce((sum, item) => sum + item.resultadoSimulado, 0),
      impactoSimulado: totaisPorAgf.reduce((sum, item) => sum + item.impactoFinanceiroSimulado, 0),
    };

    const evolucaoTemporal = periodosConsolidados.map((periodo) => ({
      ...periodo,
      valor:
        timelineMetric === "despesa" && timelineExpenseCategory !== "__total__"
          ? Number(periodo.despesas?.[timelineExpenseCategory] || 0)
          : timelineMetric === "receita"
          ? periodo.receita
          : timelineMetric === "despesa"
            ? periodo.despesa
            : timelineMetric === "margem"
              ? periodo.margem
              : periodo.resultado,
    }));

    const ultimosDoisPeriodos = [...periodosConsolidados].filter((item) => item.receita || item.despesa).slice(-2);
    const resumoPeriodoAtual = ultimosDoisPeriodos[ultimosDoisPeriodos.length - 1] || null;
    const resumoPeriodoAnterior = ultimosDoisPeriodos.length > 1 ? ultimosDoisPeriodos[ultimosDoisPeriodos.length - 2] : null;

    const alertas = totaisPorAgf
      .flatMap((agf) => {
        const itens: Array<{ titulo: string; detalhe: string; level: "high" | "medium" | "low"; agf: string }> = [];

        if (agf.variacaoReceita <= ALERT_LIMITS.quedaReceitaPct) {
          itens.push({
            agf: agf.nome,
            level: "high",
            titulo: "Queda abrupta de receita",
            detalhe: `${agf.nome} caiu ${formatPercent(agf.variacaoReceita)} entre os dois ultimos periodos.`,
          });
        }
        if (agf.margemLucro < ALERT_LIMITS.margemCriticaPct) {
          itens.push({
            agf: agf.nome,
            level: agf.margemLucro < 0 ? "high" : "medium",
            titulo: "Margem critica",
            detalhe: `${agf.nome} opera com margem de ${formatPercent(agf.margemLucro)} no filtro atual.`,
          });
        }
        if (agf.doisUltimosNegativos) {
          itens.push({
            agf: agf.nome,
            level: "high",
            titulo: "Resultado negativo recorrente",
            detalhe: `${agf.nome} ficou negativa nos dois ultimos periodos com dados.`,
          });
        }
        if (agf.folhaReceitaPct > ALERT_LIMITS.folhaPct) {
          itens.push({
            agf: agf.nome,
            level: "medium",
            titulo: "Folha acima do limite",
            detalhe: `${agf.nome} esta com Folha/Receita em ${formatPercent(agf.folhaReceitaPct)}.`,
          });
        }
        if (agf.aluguelReceitaPct > ALERT_LIMITS.aluguelPct) {
          itens.push({
            agf: agf.nome,
            level: agf.aluguelReceitaPct > 35 ? "high" : "medium",
            titulo: "Aluguel pressiona a operacao",
            detalhe: `${agf.nome} esta com Aluguel/Receita em ${formatPercent(agf.aluguelReceitaPct)}.`,
          });
        }
        if (agf.despesaReceitaPct > ALERT_LIMITS.despesaPct) {
          itens.push({
            agf: agf.nome,
            level: agf.despesaReceitaPct > 100 ? "high" : "medium",
            titulo: "Despesa quase consome a receita",
            detalhe: `${agf.nome} esta com Despesa/Receita em ${formatPercent(agf.despesaReceitaPct)}.`,
          });
        }
        if (agf.extrasReceitaPct > ALERT_LIMITS.extrasPct) {
          itens.push({
            agf: agf.nome,
            level: "medium",
            titulo: "Extras elevados",
            detalhe: `${agf.nome} esta com Extras/Receita em ${formatPercent(agf.extrasReceitaPct)}.`,
          });
        }
        if (agf.parcelasReceitaPct > ALERT_LIMITS.parcelasPct) {
          itens.push({
            agf: agf.nome,
            level: "high",
            titulo: "Parcelas de debito relevantes",
            detalhe: `${agf.nome} esta com Parcelas/Receita em ${formatPercent(agf.parcelasReceitaPct)}.`,
          });
        }
        if (agf.folhaSemDescricao > 0) {
          itens.push({
            agf: agf.nome,
            level: "medium",
            titulo: "Folha com SEM DESCRICAO",
            detalhe: `${agf.nome} tem ${formatCurrency(agf.folhaSemDescricao)} sem descricao na folha.`,
          });
        }

        return itens;
      })
      .sort((a, b) => {
        const weight = { high: 0, medium: 1, low: 2 };
        return weight[a.level] - weight[b.level];
      });

    const benchmark = {
      margem: median(totaisPorAgf.map((item) => item.margemLucro)),
      folha: median(totaisPorAgf.map((item) => item.folhaReceitaPct)),
      aluguel: median(totaisPorAgf.map((item) => item.aluguelReceitaPct)),
      despesa: median(totaisPorAgf.map((item) => item.despesaReceitaPct)),
      parcelas: median(totaisPorAgf.map((item) => item.parcelasReceitaPct)),
    };

    const benchmarkRows = totaisPorAgf
      .map((item) => {
        let gap = 0;
        let valorAtual = 0;
        let referencia = 0;

        if (benchmarkMetric === "margem") {
          valorAtual = item.margemLucro;
          referencia = benchmark.margem;
          gap = valorAtual - referencia;
        } else if (benchmarkMetric === "folha") {
          valorAtual = item.folhaReceitaPct;
          referencia = benchmark.folha;
          gap = referencia - valorAtual;
        } else if (benchmarkMetric === "aluguel") {
          valorAtual = item.aluguelReceitaPct;
          referencia = benchmark.aluguel;
          gap = referencia - valorAtual;
        } else if (benchmarkMetric === "despesa") {
          valorAtual = item.despesaReceitaPct;
          referencia = benchmark.despesa;
          gap = referencia - valorAtual;
        } else {
          valorAtual = item.parcelasReceitaPct;
          referencia = benchmark.parcelas;
          gap = referencia - valorAtual;
        }

        return {
          nome: item.nome,
          gap,
          valorAtual,
          referencia,
          fill: gap >= 0 ? CHART_COLORS.resultado : CHART_COLORS.despesa,
        };
      })
      .sort((a, b) => b.valorAtual - a.valorAtual);

    const rankingConsultivo = {
      margem: [...totaisPorAgf].sort((a, b) => b.margemLucro - a.margemLucro).slice(0, 5),
      folha: [...totaisPorAgf].sort((a, b) => a.folhaReceitaPct - b.folhaReceitaPct).slice(0, 5),
      aluguel: [...totaisPorAgf].sort((a, b) => b.aluguelReceitaPct - a.aluguelReceitaPct).slice(0, 5),
      risco: [...totaisPorAgf].sort((a, b) => b.riscoExtraordinario - a.riscoExtraordinario).slice(0, 5),
    };

    const waterfallOptions = totaisPorAgf.map((item) => ({ id: item.id, nome: item.nome }));
    const waterfallSelected =
      waterfallMode === "agf"
        ? totaisPorAgf.find((item) => item.id === (agfsSelecionadas.length === 1 ? agfsSelecionadas[0] : waterfallAgfId)) || totaisPorAgf[0]
        : null;

    const waterfallBase =
      waterfallMode === "agf" && waterfallSelected
        ? {
            nome: waterfallSelected.nome,
            receita: safeNumber(waterfallSelected.receita),
            despesaTotal: safeNumber(waterfallSelected.despesaTotal),
            resultado: safeNumber(waterfallSelected.resultado),
            despesasDetalhadas: waterfallSelected.despesasDetalhadas,
            ajusteSubcontas: safeNumber(waterfallSelected.ajusteSubcontas),
          }
        : {
            nome: "Consolidado",
            receita: safeNumber(totaisGerais.receita),
            despesaTotal: safeNumber(totaisGerais.despesa),
            resultado: safeNumber(totaisGerais.resultado),
            despesasDetalhadas: sourceCategorias.reduce((acc, categoria) => {
              acc[categoria] = safeNumber(
                totaisPorAgf.reduce((sum, item) => sum + Number(item.despesasDetalhadas[categoria] || 0), 0)
              );
              return acc;
            }, {} as Record<string, number>),
            ajusteSubcontas: safeNumber(
              totaisGerais.despesa -
                sourceCategorias.reduce(
                  (sum, categoria) =>
                    sum +
                    totaisPorAgf.reduce((acc, item) => acc + Number(item.despesasDetalhadas[categoria] || 0), 0),
                  0
                )
            ),
          };

    const waterfallOrder = [
      "folha_pagamento",
      "aluguel",
      "comissoes",
      "impostos",
      "extras",
      "parcela_debitos",
      "veiculos",
      "telefone",
      "honorarios",
      "pitney",
    ];

    const waterfallSteps: Array<{ name: string; amount: number; fill: string }> = [
      { name: "Receita", amount: waterfallBase.receita, fill: CHART_COLORS.resultado },
      ...waterfallOrder
        .map((categoria) => ({
          name: CATEGORY_LABELS[categoria] || categoria,
          amount: -safeNumber(waterfallBase.despesasDetalhadas[categoria] || 0),
          fill:
            categoria === "parcela_debitos"
              ? CHART_COLORS.parcela
              : categoria === "extras"
                ? CHART_COLORS.extras
                : CHART_COLORS.despesa,
        }))
        .filter((item) => Math.abs(item.amount) > 0),
    ];

    if (Math.abs(waterfallBase.ajusteSubcontas) > 1) {
      waterfallSteps.push({
        name: waterfallBase.ajusteSubcontas > 0 ? "Outras despesas" : "Ajuste favoravel",
        amount: -safeNumber(waterfallBase.ajusteSubcontas),
        fill: CHART_COLORS.warning,
      });
    }

    const waterfallData = [];
    let running = 0;

    for (const step of waterfallSteps) {
      const next = safeNumber(running + step.amount);
      waterfallData.push({
        name: step.name,
        base: safeNumber(Math.min(running, next)),
        value: safeNumber(Math.abs(step.amount)),
        realValue: safeNumber(step.amount),
        fill: step.fill,
      });
      running = next;
    }

    waterfallData.push({
      name: "Resultado",
      base: safeNumber(Math.min(0, waterfallBase.resultado)),
      value: safeNumber(Math.abs(waterfallBase.resultado)),
      realValue: safeNumber(waterfallBase.resultado),
      fill: waterfallBase.resultado >= 0 ? CHART_COLORS.resultado : CHART_COLORS.despesa,
    });

    const matrixRows = totaisPorAgf.map((item) => {
      const riskLevel =
        item.margemLucro < 0 || item.aluguelReceitaPct > 25 || item.parcelasReceitaPct > 15
          ? "high"
          : item.margemLucro < 20 || item.extrasReceitaPct > 10 || item.despesaReceitaPct > 80
            ? "medium"
            : "low";

      return {
        nome: item.nome,
        receita: item.receita,
        margem: item.margemLucro,
        z: safeNumber(Math.max(3000, item.riscoExtraordinario)),
        riscoExtraordinario: safeNumber(item.riscoExtraordinario),
        fill: RISK_COLORS[riskLevel],
      };
    });

    const heatmapRows = totaisPorAgf.filter(
      (item) => heatmapAgfsSelecionadas.length === 0 || heatmapAgfsSelecionadas.includes(item.id)
    );

    const simulationRowsBase = [...totaisPorAgf].sort(
      (a, b) => (b.margemLucro + b.ganhoMargem) - (a.margemLucro + a.ganhoMargem)
    );
    const simulationRows = simulationRowsBase.filter(
      (item) => simulationAgfsSelecionadas.length === 0 || simulationAgfsSelecionadas.includes(item.id)
    );
    const simulationRowsForAverage = simulationRows.length > 0 ? simulationRows : simulationRowsBase;
    const simulationCategoryAveragePct =
      targetDraft.categoria && simulationRowsForAverage.length > 0
        ? average(
            simulationRowsForAverage.map((item) =>
              Number(item.despesasPercentuais[targetDraft.categoria] || 0)
            )
          )
        : 0;

    const simulationTargetInput = String(targetDraft.valor || "").trim().replace(",", ".");
    const simulationTargetPercent = safeNumber(simulationTargetInput);
    const simulationNeededSavings =
      targetDraft.categoria && simulationTargetInput !== "" && Number.isFinite(simulationTargetPercent) && simulationTargetPercent >= 0
        ? simulationRowsForAverage.reduce((sum, item) => {
            const categoriaAtual = safeNumber(item.despesasDetalhadas[targetDraft.categoria] || 0);
            const metaFinanceira = item.receita * (simulationTargetPercent / 100);
            return sum + Math.max(0, categoriaAtual - metaFinanceira);
          }, 0)
        : 0;

    const simulationScopedTotals = {
      receita: simulationRows.reduce((sum, item) => sum + item.receita, 0),
      despesa: simulationRows.reduce((sum, item) => sum + item.despesaTotal, 0),
      resultado: simulationRows.reduce((sum, item) => sum + item.resultado, 0),
      resultadoSimulado: simulationRows.reduce((sum, item) => sum + item.resultadoSimulado, 0),
      impactoSimulado: simulationRows.reduce((sum, item) => sum + item.impactoFinanceiroSimulado, 0),
    };

    return {
      periodosConsolidados,
      totaisPorAgf,
      totaisGerais,
      evolucaoTemporal,
      resumoPeriodoAtual,
      resumoPeriodoAnterior,
      alertas,
      benchmark,
      benchmarkRows,
      rankingConsultivo,
      waterfallData,
      waterfallBase,
      waterfallOptions,
      matrixRows,
      heatmapRows,
      heatmapCategorias: categoriasAnaliticas,
      simulationRows,
      simulationScopedTotals,
      simulationCategoryAveragePct,
      simulationNeededSavings,
      receitaRows: [...totaisPorAgf].sort((a, b) => b.receita - a.receita),
      despesaRows: [...totaisPorAgf].sort((a, b) => b.despesaTotal - a.despesaTotal),
      resultadoRows: [...totaisPorAgf].sort((a, b) => b.resultado - a.resultado),
      margemRows: [...totaisPorAgf].sort((a, b) => b.margemLucro - a.margemLucro),
      folhaRows: [...totaisPorAgf].sort(
        (a, b) => Number(b.despesasDetalhadas.folha_pagamento || 0) - Number(a.despesasDetalhadas.folha_pagamento || 0)
      ),
      agfChartMinWidth: Math.max(500, totaisPorAgf.length * 82),
    };
  }, [
    agfsSelecionadas,
    mesesSelecionados,
    anosSelecionados,
    sourceAgfs,
    sourceCategorias,
    sourceDados,
    anosDisponiveis,
    mesesDisponiveis,
    timelineMetric,
    timelineExpenseCategory,
    benchmarkMetric,
    simulationTargets,
    heatmapAgfsSelecionadas,
    simulationAgfsSelecionadas,
    targetDraft.categoria,
    targetDraft.valor,
    waterfallMode,
    waterfallAgfId,
    categoriasComOutras,
  ]);

  useEffect(() => {
    if (dadosProcessados.waterfallOptions.length === 0) return;
    if (agfsSelecionadas.length === 1) {
      setWaterfallAgfId(agfsSelecionadas[0]);
      return;
    }
    if (!waterfallAgfId) {
      setWaterfallAgfId(dadosProcessados.waterfallOptions[0].id);
    }
  }, [agfsSelecionadas, dadosProcessados.waterfallOptions, waterfallAgfId]);

  useEffect(() => {
    if (categoriasComOutras.length === 0) return;
    if (!targetDraft.categoria || !categoriasComOutras.includes(targetDraft.categoria)) {
      const nextCategoria = categoriasComOutras[0];
      setTargetDraft({ categoria: nextCategoria, valor: simulationTargets[nextCategoria] ?? "" });
    }
  }, [categoriasComOutras, targetDraft.categoria, simulationTargets]);

  const handleMultiSelect = (setter: Function, value: any) =>
    setter((previous: any[]) => (previous.includes(value) ? previous.filter((item) => item !== value) : [...previous, value]));

  const applySimulationTarget = () => {
    const categoria = targetDraft.categoria;
    const valor = String(targetDraft.valor || "").trim().replace(",", ".");

    if (!categoria || !valor) return;

    const parsed = safeNumber(valor);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    setSimulationTargets((previous) => ({ ...previous, [categoria]: parsed.toString() }));
    setTargetDraft((previous) => ({ ...previous, valor: parsed.toString() }));
  };

  const removeSimulationTarget = (categoria: string) => {
    setSimulationTargets((previous) => {
      const next = { ...previous };
      delete next[categoria];
      return next;
    });

    if (targetDraft.categoria === categoria) {
      setTargetDraft((previous) => ({ ...previous, valor: "" }));
    }
  };

  const clearSimulationTargets = () => {
    setSimulationTargets(DEFAULT_TARGETS);
    setTargetDraft((previous) => ({ ...previous, valor: "" }));
  };

  const tickStyle = { fontFamily: "Inter, sans-serif", fill: "#4A5878", opacity: 1, fontSize: 10 };
  const renderDualMetricLabel =
    (rows: any[], percentKey: string, percentColor = "#9FB0D9") =>
    ({ x, y, width, height, value, payload, index }: any) => {
      if (![x, y, width, height].every((item) => Number.isFinite(item))) return null;

      const numericValue = Number(value ?? 0);
      const entry = rows[index] || payload || {};
      const percentValue = Number(entry?.[percentKey] ?? 0);
      const centerX = x + width / 2;
      const currencyY = numericValue >= 0 ? y - 6 : y + height + 12;
      const percentY = numericValue >= 0 ? currencyY - 11 : currencyY + 11;

      return (
        <text x={centerX} y={currencyY} textAnchor="middle" fontFamily="Inter, sans-serif">
          <tspan x={centerX} y={percentY} fill={percentColor} fontSize="9" fontWeight={600}>
            {formatPercent(percentValue)}
          </tspan>
          <tspan x={centerX} y={currencyY} fill="#EAE6DF" fontSize="10" fontWeight={600}>
            {formatCompact(numericValue)}
          </tspan>
        </text>
      );
    };

  const timelineFormatter = timelineMetric === "margem" ? formatPercent : formatCurrency;
  const timelineDisplayLabel =
    timelineMetric === "despesa" && timelineExpenseCategory !== "__total__"
      ? CATEGORY_LABELS[timelineExpenseCategory] || timelineExpenseCategory
      : TIMELINE_METRICS.find((item) => item.key === timelineMetric)?.label || "Resultado";
  const timelineTitle = `${timelineDisplayLabel} ao longo do tempo`;
  const simulationChartRows =
    simulationView === "resultado"
      ? [...dadosProcessados.simulationRows].sort((a, b) => b.resultadoSimulado - a.resultadoSimulado)
      : dadosProcessados.simulationRows;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-start text-text">
        <div className="p-6 text-lg">Carregando dados...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-start text-red-400">
        <div className="dashboard-surface p-6">{error}</div>
      </div>
    );
  }

  if (!empresaId && !apiData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-start text-text">
        <div className="p-6 text-lg">
          ID nao fornecido. Adicione <code>?user_id=...</code> ou <code>?empresa_id=...</code> a URL.
        </div>
      </div>
    );
  }

  return (
    <div className="p-[14px] md:p-[18px] bg-background-start text-text min-h-screen">
      <main className="max-w-[1540px] mx-auto flex flex-col gap-3">
        <header className="dashboard-surface relative z-[80] overflow-visible grid grid-cols-1 md:grid-cols-3 gap-[10px] p-3">
          <MultiSelectFilter
            name="AGF"
            options={sourceAgfs}
            selected={agfsSelecionadas}
            onSelect={(id) => handleMultiSelect(setAgfsSelecionadas, id)}
          />
          <MultiSelectFilter
            name="Mes"
            options={ALL_MONTHS.map((mes) => ({
              id: mes,
              nome: new Date(2000, mes - 1).toLocaleString("pt-BR", { month: "long" }),
            }))}
            selected={mesesSelecionados}
            onSelect={(id) => handleMultiSelect(setMesesSelecionados, id)}
          />
          <MultiSelectFilter
            name="Ano"
            options={anosDisponiveis.map((ano) => ({ id: ano, nome: ano.toString() }))}
            selected={anosSelecionados}
            onSelect={(id) => handleMultiSelect(setAnosSelecionados, id)}
          />
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[10px]">
          <Card
            title="Resultado"
            value={formatCurrency(dadosProcessados.totaisGerais.resultado)}
            borderColor={CHART_COLORS.resultado}
            valueColor="text-success"
          />
          <Card
            title="Receita Total"
            value={formatCurrency(dadosProcessados.totaisGerais.receita)}
            borderColor={CHART_COLORS.receita}
            valueColor="text-info"
          />
          <Card
            title="Despesa Total"
            value={formatCurrency(dadosProcessados.totaisGerais.despesa)}
            borderColor={CHART_COLORS.despesa}
            valueColor="text-destructive"
          />
          <Card
            title="Objetos Tratados"
            value={formatNumber(dadosProcessados.totaisGerais.objetos)}
            borderColor={CHART_COLORS.objetos}
            valueColor="text-warning"
          />
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-2">
          {dadosProcessados.alertas.length === 0 ? (
            <div className="dashboard-surface p-[10px] text-sm text-text/70 md:col-span-2 xl:col-span-2">
              Nenhum alerta critico ou de atencao foi encontrado no filtro atual.
            </div>
          ) : (
            dadosProcessados.alertas.slice(0, 8).map((alerta, index) => (
              <div key={`${alerta.agf}-${index}`} className="dashboard-surface alert-surface p-[11px] transition-all duration-150">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="alert-title font-semibold text-[13px] tracking-[0.025em] leading-[1.25] text-text">{alerta.titulo}</h3>
                  <AlertBadge level={alerta.level} />
                </div>
                <p className="text-[11px] leading-[1.4] text-text/70 mb-1">{alerta.detalhe}</p>
                <p className="text-[10px] text-text/50 uppercase tracking-[0.1em]">{alerta.agf}</p>
              </div>
            ))
          )}
        </section>

        <section>
          <ChartContainer
            title={timelineTitle}
            className="h-[265px]"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl<TimelineMetric>
                  items={TIMELINE_METRICS}
                  value={timelineMetric}
                  onChange={(value) => setTimelineMetric(value)}
                />
                {timelineMetric === "despesa" ? (
                  <select
                    value={timelineExpenseCategory}
                    onChange={(event) => setTimelineExpenseCategory(event.target.value)}
                    className="px-[10px] py-[7px] text-[12px] h-8 min-w-[180px]"
                  >
                    <option value="__total__">Despesa total</option>
                    {categoriasComOutras.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {CATEGORY_LABELS[categoria] || categoria}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            }
          >
            <AreaChart data={dadosProcessados.evolucaoTemporal} margin={{ top: 10, right: 20, left: 12, bottom: 5 }}>
              <defs>
                <linearGradient id="timelineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E3C47A" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#A67C3A" stopOpacity={0} />
                </linearGradient>
                <radialGradient id="timelineSpotGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,244,194,0.55)" />
                  <stop offset="32%" stopColor="rgba(212,170,106,0.2)" />
                  <stop offset="100%" stopColor="rgba(212,170,106,0)" />
                </radialGradient>
                <filter id="timelineLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0.73  0 1 0 0 0.57  0 0 1 0 0.24  0 0 0 0.8 0"
                    result="warmGlow"
                  />
                  <feMerge>
                    <feMergeNode in="warmGlow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="timelineDotGlow" x="-150%" y="-150%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={tickStyle} tickMargin={12} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis
                tick={tickStyle}
                tickMargin={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={timelineMetric === "margem" ? (value) => formatPercent(Number(value)) : formatCompact}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Tooltip
                content={<PremiumTimelineTooltip formatter={timelineFormatter} />}
                cursor={{ stroke: "rgba(166,124,58,0.18)", strokeWidth: 1.25 }}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#D6AE57"
                strokeWidth={10}
                strokeOpacity={0.12}
                fillOpacity={0}
                isAnimationActive={false}
                filter="url(#timelineLineGlow)"
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke="#D6AE57"
                strokeWidth={4.5}
                strokeOpacity={0.2}
                fillOpacity={0}
                isAnimationActive={false}
                dot={false}
                activeDot={false}
              />
              <Area
                type="monotone"
                dataKey="valor"
                name={timelineDisplayLabel}
                stroke="#A67C3A"
                strokeWidth={2.4}
                fill="url(#timelineGradient)"
                dot={false}
                activeDot={<GlowActiveDot />}
              />
            </AreaChart>
          </ChartContainer>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="dashboard-surface p-3.5 md:p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display italic font-normal text-[1.03rem] text-text">Variacao mes contra mes</h3>
              {dadosProcessados.resumoPeriodoAtual && dadosProcessados.resumoPeriodoAnterior ? (
                <span className="text-xs text-text/60">
                  {dadosProcessados.resumoPeriodoAnterior.label} → {dadosProcessados.resumoPeriodoAtual.label}
                </span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[680px]">
                <thead>
                  <tr className="text-left text-text/70 border-b border-white/10">
                    <th className="py-[6px] px-[10px] text-[10px] uppercase tracking-[0.1em] text-text/55">AGF</th>
                    <th className="py-[6px] px-[10px] text-right text-[10px] uppercase tracking-[0.1em] text-text/55">Var. Receita</th>
                    <th className="py-[6px] px-[10px] text-right text-[10px] uppercase tracking-[0.1em] text-text/55">Var. Despesa</th>
                    <th className="py-[6px] px-[10px] text-right text-[10px] uppercase tracking-[0.1em] text-text/55">Var. Margem</th>
                    <th className="py-[6px] px-[10px] text-right text-[10px] uppercase tracking-[0.1em] text-text/55">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosProcessados.totaisPorAgf.map((item) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-[rgba(200,134,26,0.08)] transition-colors">
                      <td className="py-[7px] px-[10px]">{item.nome}</td>
                      <td className={`tabular py-[7px] px-[10px] text-right ${item.variacaoReceita >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatPercent(item.variacaoReceita)}
                      </td>
                      <td className={`tabular py-[7px] px-[10px] text-right ${item.variacaoDespesa <= 0 ? "text-success" : "text-warning"}`}>
                        {formatPercent(item.variacaoDespesa)}
                      </td>
                      <td className={`tabular py-[7px] px-[10px] text-right ${item.variacaoMargemPp >= 0 ? "text-success" : "text-destructive"}`}>
                        {item.variacaoMargemPp >= 0 ? "+" : ""}
                        {item.variacaoMargemPp.toFixed(1)} pp
                      </td>
                      <td className="py-[7px] px-[10px] text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${
                            item.status === "Benchmark"
                            ? "bg-[rgba(45,212,160,0.10)] text-[#2DD4A0]"
                            : item.status === "Critico"
                              ? "bg-[rgba(224,92,106,0.10)] text-[#E05C6A]"
                              : "bg-[rgba(212,168,83,0.10)] text-[#D4A853]"
                        }`}
                      >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ChartContainer
            title="Benchmark vs Grupo"
            className="h-[270px]"
            chartMinWidth={Math.max(420, dadosProcessados.benchmarkRows.length * 66)}
            actions={
              <SegmentedControl<BenchmarkMetric>
                items={BENCHMARK_METRICS}
                value={benchmarkMetric}
                onChange={(value) => setBenchmarkMetric(value)}
              />
            }
          >
            <BarChart data={dadosProcessados.benchmarkRows} layout="vertical" margin={{ top: 10, right: 22, left: 20, bottom: 4 }} barCategoryGap="11%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                type="number"
                tick={tickStyle}
                tickFormatter={(value) => `${Number(value).toFixed(1)} pp`}
                tickLine={false}
                axisLine={{ stroke: "rgba(180,160,100,0.12)" }}
                domain={[
                  (dataMin: number) => Math.min(dataMin - 4, 0),
                  (dataMax: number) => Math.max(dataMax + 4, 0),
                ]}
              />
              <YAxis type="category" dataKey="nome" width={188} tickMargin={36} tick={tickStyle} tickLine={false} axisLine={false} />
              <ReferenceLine x={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ fill: "rgba(166,124,58,0.05)" }}
                content={
                  <CustomTooltip
                    formatter={(value: number) => `${Number(value ?? 0).toFixed(1)} pp`}
                  />
                }
              />
              <Bar dataKey="gap" name="Gap vs mediana" barSize={16} radius={[8, 8, 8, 8]}>
                {dadosProcessados.benchmarkRows.map((item) => (
                  <Cell key={item.nome} fill={item.fill} />
                ))}
                <LabelList
                  dataKey="valorAtual"
                  position="right"
                  offset={18}
                  formatter={(value: number) => formatPercent(Number(value ?? 0))}
                  style={{ fill: "#EAE6DF", fontSize: 11, fontFamily: "Inter, sans-serif" }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartContainer title="Comparativo de Receita" className="h-[255px]" chartMinWidth={dadosProcessados.agfChartMinWidth}>
            <BarChart data={dadosProcessados.receitaRows} margin={{ top: 20, right: 12, left: -18, bottom: 5 }} barCategoryGap="8%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="nome" interval={0} angle={-22} textAnchor="end" height={76} tickMargin={18} tick={tickStyle} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip formatter={formatCurrency} />} cursor={{ fill: "rgba(166,124,58,0.05)" }} />
              <Bar dataKey="receita" fill={CHART_COLORS.receita} name="Receita" barSize={30} radius={[6, 6, 0, 0]} activeBar={{ fill: "#7390d5" }}>
                <LabelList dataKey="receita" position="top" offset={10} formatter={(value: number) => formatCompact(value)} style={{ fill: "#EAE6DF", fontSize: 10, fontFamily: "Inter, sans-serif" }} />
              </Bar>
            </BarChart>
          </ChartContainer>
          <ChartContainer title="Comparativo de Despesa" className="h-[255px]" chartMinWidth={dadosProcessados.agfChartMinWidth}>
            <BarChart data={dadosProcessados.despesaRows} margin={{ top: 20, right: 12, left: -18, bottom: 5 }} barCategoryGap="8%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="nome" interval={0} angle={-22} textAnchor="end" height={76} tickMargin={18} tick={tickStyle} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip formatter={formatCurrency} />} cursor={{ fill: "rgba(166,124,58,0.05)" }} />
              <Bar dataKey="despesaTotal" fill={CHART_COLORS.despesa} name="Despesa" barSize={30} radius={[6, 6, 0, 0]} activeBar={{ fill: "#e3717e" }}>
                <LabelList dataKey="despesaTotal" position="top" offset={10} formatter={(value: number) => formatCompact(value)} style={{ fill: "#EAE6DF", fontSize: 10, fontFamily: "Inter, sans-serif" }} />
              </Bar>
            </BarChart>
          </ChartContainer>
          <ChartContainer title="Comparativo de Resultado" className="h-[255px]" chartMinWidth={dadosProcessados.agfChartMinWidth}>
            <BarChart data={dadosProcessados.resultadoRows} margin={{ top: 16, right: 12, left: -18, bottom: 0 }} barCategoryGap="8%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="nome" interval={0} angle={-18} textAnchor="end" height={60} tickMargin={10} tick={tickStyle} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis hide />
              <Tooltip
                content={
                  <MetricComparisonTooltip
                    valueLabel="Resultado"
                    valueFormatter={formatCurrency}
                    percentLabel="Resultado/Receita"
                    percentKey="resultadoReceitaPct"
                  />
                }
                cursor={{ fill: "rgba(166,124,58,0.05)" }}
              />
              <Bar dataKey="resultado" name="Resultado" barSize={30} radius={[6, 6, 0, 0]} activeBar>
                {dadosProcessados.resultadoRows.map((item) => (
                  <Cell key={item.id} fill={item.resultado >= 0 ? CHART_COLORS.resultado : CHART_COLORS.despesa} />
                ))}
                <LabelList dataKey="resultado" content={renderDualMetricLabel(dadosProcessados.resultadoRows, "resultadoReceitaPct", "#74D7C0")} />
              </Bar>
            </BarChart>
          </ChartContainer>
          <ChartContainer title="Comparativo de Margem de Lucro (%)" className="h-[255px]" chartMinWidth={dadosProcessados.agfChartMinWidth}>
            <BarChart data={dadosProcessados.margemRows} margin={{ top: 16, right: 12, left: -18, bottom: 0 }} barCategoryGap="8%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="nome" interval={0} angle={-18} textAnchor="end" height={60} tickMargin={10} tick={tickStyle} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip formatter={formatPercent} />} cursor={{ fill: "rgba(166,124,58,0.05)" }} />
              <Bar dataKey="margemLucro" fill={CHART_COLORS.margem} name="Margem" barSize={30} radius={[6, 6, 0, 0]} activeBar={{ fill: "#a78bf2" }}>
                <LabelList dataKey="margemLucro" position="top" offset={10} formatter={(value: number) => formatPercent(value)} style={{ fill: "#EAE6DF", fontSize: 10, fontFamily: "Inter, sans-serif" }} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartContainer title="Folha de Pagamento" className="h-[285px]" chartMinWidth={dadosProcessados.agfChartMinWidth}>
            <BarChart data={dadosProcessados.folhaRows} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="nome" interval={0} angle={-24} textAnchor="end" height={78} tickMargin={18} tick={tickStyle} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis tickFormatter={formatCompact} tick={tickStyle} tickLine={false} axisLine={false} />
              <Tooltip
                content={
                  <MetricComparisonTooltip
                    valueLabel="Folha"
                    valueFormatter={formatCurrency}
                    percentLabel="Folha/Receita"
                    percentKey="folhaReceitaPct"
                  />
                }
                cursor={{ fill: "rgba(166,124,58,0.05)" }}
              />
              <Bar dataKey="despesasDetalhadas.folha_pagamento" fill={CHART_COLORS.folha} name="Folha de Pagamento" barSize={22} radius={[6, 6, 0, 0]} activeBar={{ fill: "#8aa0de" }}>
                <LabelList dataKey="despesasDetalhadas.folha_pagamento" content={renderDualMetricLabel(dadosProcessados.folhaRows, "folhaReceitaPct", "#AFC1F6")} />
              </Bar>
            </BarChart>
          </ChartContainer>

          <ChartContainer title="Matriz de Risco" className="h-[285px]">
            <ScatterChart margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis type="number" dataKey="receita" tickFormatter={formatCompact} tick={tickStyle} name="Receita" tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis type="number" dataKey="margem" tickFormatter={formatPercent} tick={tickStyle} name="Margem" tickLine={false} axisLine={false} />
              <ZAxis type="number" dataKey="z" range={[70, 320]} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Tooltip
                cursor={{ strokeDasharray: "4 4" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="dashboard-muted-surface px-3 py-2.5 text-[12px] shadow-[0_10px_30px_-22px_rgba(0,0,0,0.95)]">
                      <p className="font-bold mb-1">{item.nome}</p>
                      <p>Receita: {formatCurrency(item.receita)}</p>
                      <p>Margem: {formatPercent(item.margem)}</p>
                      <p>Risco extraordinario: {formatCurrency(item.riscoExtraordinario)}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={dadosProcessados.matrixRows} name="AGFs" isAnimationActive={false}>
                {dadosProcessados.matrixRows.map((item) => (
                  <Cell key={item.nome} fill={item.fill} />
                ))}
              </Scatter>
            </ScatterChart>
          </ChartContainer>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <ChartContainer
            title={`Waterfall de Resultado - ${dadosProcessados.waterfallBase.nome}`}
            className="h-[330px]"
            chartMinWidth={Math.max(660, dadosProcessados.waterfallData.length * 90)}
            actions={
              <div className="flex flex-wrap gap-2 items-center">
                <SegmentedControl<"consolidado" | "agf">
                  items={[
                    { key: "consolidado", label: "Consolidado" },
                    { key: "agf", label: "Por AGF" },
                  ]}
                  value={waterfallMode}
                  onChange={(value) => setWaterfallMode(value)}
                />
                {waterfallMode === "agf" ? (
                  <select
                    value={agfsSelecionadas.length === 1 ? agfsSelecionadas[0] : waterfallAgfId}
                    onChange={(event) => setWaterfallAgfId(event.target.value)}
                    className="px-[10px] py-[7px] text-[12px] h-8"
                  >
                    {dadosProcessados.waterfallOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nome}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            }
          >
            <BarChart data={dadosProcessados.waterfallData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" interval={0} angle={-22} textAnchor="end" height={82} tickMargin={18} tick={tickStyle} tickLine={false} axisLine={{ stroke: "rgba(180,160,100,0.12)" }} />
              <YAxis tickFormatter={formatCompact} tick={tickStyle} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(166,124,58,0.05)" }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;

                  return (
                    <div className="rounded-xl border border-white/[0.08] bg-[#0E1430]/95 px-3 py-2.5 text-[12px] shadow-[0_24px_50px_-35px_rgba(0,0,0,0.95)]">
                      <p className="font-bold mb-1">{item.name}</p>
                      <p>Impacto: {formatCurrency(safeNumber(item.realValue))}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="waterfall" name="Impacto" isAnimationActive={false} barSize={24} radius={[6, 6, 0, 0]}>
                {dadosProcessados.waterfallData.map((item) => (
                  <Cell key={item.name} fill={item.fill} />
                ))}
                <LabelList
                  dataKey="realValue"
                  position="top"
                  offset={10}
                  formatter={(value: number) => (Math.abs(value) > 0 ? formatCompact(value) : "")}
                  style={{ fill: "#EAE6DF", fontSize: 11, fontFamily: "Inter, sans-serif" }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="dashboard-surface p-3.5">
              <h3 className="font-display italic font-normal mb-3 text-[1.03rem]">Ranking de Margem</h3>
              <div className="space-y-3">
                {dadosProcessados.rankingConsultivo.margem.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-[12px]">
                    <span>
                      {index + 1}. {item.nome}
                    </span>
                    <span className="tabular text-success font-semibold">{formatPercent(item.margemLucro)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dashboard-surface p-3.5">
              <h3 className="font-display italic font-normal mb-3 text-[1.03rem]">Ranking de Folha Eficiente</h3>
              <div className="space-y-3">
                {dadosProcessados.rankingConsultivo.folha.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-[12px]">
                    <span>
                      {index + 1}. {item.nome}
                    </span>
                    <span className="tabular text-info font-semibold">{formatPercent(item.folhaReceitaPct)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dashboard-surface p-3.5">
              <h3 className="font-display italic font-normal mb-3 text-[1.03rem]">Ranking de Aluguel Critico</h3>
              <div className="space-y-3">
                {dadosProcessados.rankingConsultivo.aluguel.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-[12px]">
                    <span>
                      {index + 1}. {item.nome}
                    </span>
                    <span className="tabular text-warning font-semibold">{formatPercent(item.aluguelReceitaPct)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dashboard-surface p-3.5">
              <h3 className="font-display italic font-normal mb-3 text-[1.03rem]">Ranking de Passivo Oculto</h3>
              <div className="space-y-3">
                {dadosProcessados.rankingConsultivo.risco.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-[12px]">
                    <span>
                      {index + 1}. {item.nome}
                    </span>
                    <span className="tabular text-destructive font-semibold">{formatCurrency(item.riscoExtraordinario)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="dashboard-surface p-3.5 md:p-4 lg:col-span-1">
            <h3 className="font-display italic font-normal mb-3 text-[1.03rem] text-text">Objetos tratados</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-text/70 border-b border-white/10">
                    <th className="py-[6px] px-[10px] text-[10px] uppercase tracking-[0.1em] text-text/55">AGF</th>
                    <th className="py-[6px] px-[10px] text-right text-[10px] uppercase tracking-[0.1em] text-text/55">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosProcessados.totaisPorAgf.length === 0 ? (
                    <tr>
                      <td className="py-3 px-2" colSpan={2}>
                        Sem dados.
                      </td>
                    </tr>
                  ) : (
                    dadosProcessados.totaisPorAgf.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-[rgba(200,134,26,0.08)] transition-colors">
                        <td className="py-[7px] px-[10px]">{item.nome}</td>
                        <td className="tabular py-[7px] px-[10px] text-right">{formatNumber(item.objetos)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-surface p-3.5 md:p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-display italic font-normal text-[1.03rem] text-text">Despesas por categoria</h3>
                <span className="text-xs text-text/60">Heatmap por peso da despesa sobre a receita</span>
              </div>
              <div className="w-full max-w-[250px]">
                <MultiSelectFilter
                  name="AGFs do heatmap"
                  options={sourceAgfs}
                  selected={heatmapAgfsSelecionadas}
                  onSelect={(id) => handleMultiSelect(setHeatmapAgfsSelecionadas, id)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1420px] w-full text-[12px]">
                <thead>
                  <tr className="text-left text-text/70 border-b border-white/10">
                    <th className="py-[6px] px-[10px] whitespace-nowrap text-[10px] uppercase tracking-[0.1em] text-text/55">AGF</th>
                    {dadosProcessados.heatmapCategorias.map((categoria) => (
                      <th key={categoria} className="py-[6px] px-[10px] text-center whitespace-nowrap text-[10px] uppercase tracking-[0.1em] text-text/55">
                        {CATEGORY_LABELS[categoria] || categoria}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosProcessados.heatmapRows.map((item) => (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="py-[7px] px-[10px] whitespace-nowrap">{item.nome}</td>
                      {dadosProcessados.heatmapCategorias.map((categoria) => {
                        const percentual = item.despesasPercentuais[categoria] || 0;
                        const intensidade = Math.min(percentual / 35, 1);
                        const backgroundColor = percentual > 0 ? `rgba(217,95,110,${(0.12 + intensidade * 0.56).toFixed(3)})` : "rgba(15,17,34,0.92)";

                        return (
                          <td
                            key={`${item.id}-${categoria}`}
                            className="py-[3px] px-[3px] text-center whitespace-nowrap"
                          >
                            <div
                              className="rounded-[4px] px-2 py-1.5"
                              style={{ backgroundColor }}
                            >
                              <div className="tabular font-semibold text-[11px] text-text">{formatCompact(item.despesasDetalhadas[categoria] || 0)}</div>
                              <div className="text-[10px] text-text/70">{formatPercent(percentual)}</div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="dashboard-surface p-4">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start mb-3">
            <div className="space-y-3">
              <h3 className="font-display italic font-normal text-[1.03rem] text-text">Simulacao de Margem de Lucro</h3>
              <p className="text-[12px] text-text/70">Teste metas por categoria e veja o impacto direto na margem.</p>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[12px] text-text/80">Meta por categoria (% da receita):</p>
                  <button
                    onClick={clearSimulationTargets}
                    className="text-[11px] font-semibold text-text/60 hover:text-text transition-colors"
                  >
                    Limpar metas
                  </button>
                </div>
                <div className="mb-3 max-w-[250px]">
                  <MultiSelectFilter
                    name="AGFs da simulacao"
                    options={sourceAgfs}
                    selected={simulationAgfsSelecionadas}
                    onSelect={(id) => handleMultiSelect(setSimulationAgfsSelecionadas, id)}
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,240px)_minmax(130px,150px)_minmax(140px,180px)_auto] gap-3 items-end">
                  <label className="text-[12px]">
                    <span className="block text-text/70 mb-2">Categoria</span>
                    <select
                      value={targetDraft.categoria}
                      onChange={(event) =>
                        setTargetDraft({
                          categoria: event.target.value,
                          valor: simulationTargets[event.target.value] ?? "",
                        })
                      }
                      className="w-full px-[10px] py-[7px] text-[12px] h-[34px]"
                    >
                      {categoriasComOutras.map((categoria) => (
                        <option key={categoria} value={categoria}>
                          {CATEGORY_LABELS[categoria] || categoria}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[12px]">
                    <span className="block text-text/70 mb-2">Media (%)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={dadosProcessados.simulationCategoryAveragePct ? dadosProcessados.simulationCategoryAveragePct.toFixed(1) : "0.0"}
                        className="w-full px-[10px] py-[7px] text-[12px] h-[34px] opacity-85"
                      />
                      <span className="text-text/60">%</span>
                    </div>
                  </label>
                  <label className="text-[12px]">
                    <span className="block text-text/70 mb-2">Meta (%)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        value={targetDraft.valor}
                        onChange={(event) => setTargetDraft((previous) => ({ ...previous, valor: event.target.value }))}
                        placeholder="Ex: 14"
                        className="w-full px-[10px] py-[7px] text-[12px] h-[34px]"
                      />
                      <span className="text-text/60">%</span>
                    </div>
                  </label>
                  <button
                    onClick={applySimulationTarget}
                    className="h-[34px] min-w-[148px] justify-self-start px-4 rounded-md bg-primary text-[color:var(--text-on-accent)] text-[12px] font-bold hover:opacity-90 transition-opacity"
                  >
                    Aplicar meta
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(simulationTargets)
                    .filter(([, value]) => String(value || "").trim() !== "")
                    .map(([categoria, value]) => (
                      <button
                        key={categoria}
                        onClick={() => removeSimulationTarget(categoria)}
                        className="inline-flex items-center gap-2 rounded-[16px] bg-[var(--bg-elevated)] border border-[color:var(--border-subtle)] px-3 py-[4px] text-[11px] text-text/85 hover:border-[color:var(--border-medium)] transition-colors"
                      >
                        <span>{CATEGORY_LABELS[categoria] || categoria}</span>
                        <span className="font-semibold">{safeNumber(value).toFixed(1)}%</span>
                        <span className="text-text/55">x</span>
                      </button>
                    ))}
                </div>
                <p className="text-xs text-text/55 mt-3">
                  A meta e sempre lida como percentual da receita. Exemplo: Folha em 14% significa projetar cada AGF com
                  folha total equivalente a 14% da receita filtrada.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-[240px] max-w-[790px]">
              <Card
                title="Resultado Simulado"
                value={formatCurrency(dadosProcessados.simulationScopedTotals.resultadoSimulado)}
                borderColor={CHART_COLORS.margem}
                valueColor="text-text"
                compact
              />
              <Card
                title="Impacto Potencial"
                value={formatCurrency(dadosProcessados.simulationScopedTotals.impactoSimulado)}
                borderColor={CHART_COLORS.warning}
                valueColor="text-warning"
                compact
              />
              <Card
                title="Reducao Necessaria"
                value={formatCurrency(dadosProcessados.simulationNeededSavings)}
                borderColor={CHART_COLORS.receita}
                valueColor="text-info"
                compact
              />
            </div>
          </div>

          <ChartContainer
            title=""
            className="h-[290px]"
            chartMinWidth={Math.max(620, simulationChartRows.length * 84)}
            actions={
              <SegmentedControl<SimulationView>
                items={SIMULATION_VIEWS}
                value={simulationView}
                onChange={(value) => setSimulationView(value)}
              />
            }
          >
            <BarChart data={simulationChartRows} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                type="number"
                domain={
                  simulationView === "resultado"
                    ? [
                        (dataMin: number) => Math.min(dataMin * 1.15, 0),
                        (dataMax: number) => Math.max(dataMax * 1.15, 0),
                      ]
                    : [-100, 100]
                }
                tickFormatter={simulationView === "resultado" ? formatCompact : formatPercent}
                tick={tickStyle}
                tickLine={false}
                axisLine={{ stroke: "rgba(180,160,100,0.12)" }}
              />
              <YAxis type="category" dataKey="nome" tick={tickStyle} width={156} tickMargin={28} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip formatter={simulationView === "resultado" ? formatCurrency : formatPercent} />} cursor={{ fill: "rgba(166,124,58,0.05)" }} />
              <Legend wrapperStyle={{ fontFamily: "Inter, sans-serif", fontSize: "11px", color: "#8B9ABF" }} />
              {simulationView === "resultado" ? (
                <>
                  <Bar dataKey="resultado" stackId="resultado" fill={CHART_COLORS.receita} name="Resultado Real" barSize={22} radius={[8, 8, 8, 8]}>
                    <LabelList
                      dataKey="resultado"
                      position="center"
                      formatter={(value: number) => formatCompact(value)}
                      style={{ fill: "#EAE6DF", fontSize: 10, fontFamily: "Inter, sans-serif" }}
                    />
                  </Bar>
                  <Bar dataKey="impactoFinanceiroSimulado" stackId="resultado" fill={CHART_COLORS.resultado} name="Ganho no Resultado" barSize={22} radius={[8, 8, 8, 8]}>
                    <LabelList
                      dataKey="impactoFinanceiroSimulado"
                      position="center"
                      formatter={(value: number) => (Number(value ?? 0) > 0 ? `+${formatCompact(Number(value ?? 0))}` : "")}
                      style={{ fill: "#9BE5CF", fontSize: 10, fontFamily: "Inter, sans-serif" }}
                    />
                  </Bar>
                </>
              ) : (
                <>
                  <Bar dataKey="margemLucroReal" stackId="a" fill={CHART_COLORS.margem} name="Margem Real" barSize={22} radius={[8, 8, 8, 8]}>
                    <LabelList dataKey="margemLucroReal" position="center" formatter={(value: number) => formatPercent(value)} style={{ fill: "#EAE6DF", fontSize: 11, fontFamily: "Inter, sans-serif" }} />
                  </Bar>
                  <Bar dataKey="ganhoMargem" stackId="a" fill={CHART_COLORS.accent} name="Ganho de Margem" barSize={22} radius={[8, 8, 8, 8]}>
                    <LabelList
                      dataKey="ganhoMargem"
                      position="center"
                      formatter={(value: number) => (value > 0 ? `+${Number(value).toFixed(1)}%` : "")}
                      style={{ fill: "#010326", fontSize: 11, fontWeight: "bold", fontFamily: "Inter, sans-serif" }}
                    />
                  </Bar>
                </>
              )}
            </BarChart>
          </ChartContainer>
        </section>
      </main>
    </div>
  );
}
