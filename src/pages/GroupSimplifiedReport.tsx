import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Download, FileSpreadsheet, Users as UsersIcon,
  AlertCircle, LayoutList, Ruler, Scale, Activity, Percent, X
} from 'lucide-react';
import { Loading } from '../components/Loading';
import {
  SIMPLIFIED_REPORT_COLUMNS,
  createDefaultSimplifiedReportSelections
} from '../types/simplifiedReport';
import type { SimplifiedReportColumnKey, SimplifiedReportColumnMeta } from '../types/simplifiedReport';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generateTableReportPdf } from '../utils/pdfReport';
import { calculateMetrics, calculateAge } from '../utils/metrics';
import * as Mapper from '../utils/mapper';
import apiService from '../services/api.service';
import type { AthleteGroupViewModel } from '../types/api';
import { useGroups } from '../hooks/useGroups';
import './GroupSimplifiedReport.css';

/* ─── Types ────────────────────────────────────────────────────────────── */

interface SimplifiedReportRow {
  memberId: string;
  nome: string;
  posicao: string;
  categoria: string;
  idade: number;
  altura: number;
  peso: number;
  sumDobras: number;
  faulkner: number;
  pollock: number;
  mediaFP: number;
  difCoxa: number;
  difPantu: number;
  difBraco: number;
}

type FatColorKey = 'yellow' | 'green' | 'orange' | 'red';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const FAT_COLUMN_KEYS: SimplifiedReportColumnKey[] = ['faulkner', 'pollock', 'mediaFP'];

const FAT_LEGEND: { key: FatColorKey; label: string }[] = [
  { key: 'yellow', label: '< 8%' },
  { key: 'green', label: '8 – 9,99%' },
  { key: 'orange', label: '10 – 11,99%' },
  { key: 'red', label: '>= 12%' }
];

const COLUMN_ICONS: Partial<Record<SimplifiedReportColumnKey, React.ReactNode>> = {
  altura: <Ruler size={14} />,
  peso: <Scale size={14} />,
  sumDobras: <Activity size={14} />,
  faulkner: <Percent size={14} />,
  pollock: <Percent size={14} />,
  mediaFP: <Percent size={14} />,
  difCoxa: <Activity size={14} />,
  difPantu: <Activity size={14} />,
  difBraco: <Activity size={14} />
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function getFatColorKey(pct: number): FatColorKey | null {
  if (!Number.isFinite(pct) || pct <= 0) return null;
  if (pct < 8) return 'yellow';
  if (pct < 10) return 'green';
  if (pct < 12) return 'orange';
  return 'red';
}

const average = (values: number[]) => {
  const valid = values.filter(v => Number.isFinite(v) && v > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((acc, v) => acc + v, 0) / valid.length;
};

const formatNumber = (val: number | undefined, decimals = 1) => {
  if (val === undefined || val === null || !Number.isFinite(val) || val <= 0) return '-';
  return val.toFixed(decimals).replace('.', ',');
};

function decimalsFor(key: SimplifiedReportColumnKey) {
  return key === 'sumDobras' || key === 'altura' || key === 'peso' ? 1 : 2;
}

function sanitizeFileName(name: string) {
  return name.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '');
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function GroupSimplifiedReport() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { groups, loading: groupsLoading, refreshGroups } = useGroups();

  const stateMembers: AthleteGroupViewModel['members'] | undefined =
    (location.state as any)?.filteredMembers;

  const group = groups.find(g => g.id === groupId);
  const members: AthleteGroupViewModel['members'] = stateMembers ?? group?.members ?? [];
  const memberIdsKey = members.map(m => m.id).join(',');

  const [selections, setSelections] = useLocalStorage(
    '@BodyMetrics:simplifiedReportColumns',
    createDefaultSimplifiedReportSelections()
  );

  const [rows, setRows] = useState<SimplifiedReportRow[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const loadRequestId = useRef(0);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!group && !groupsLoading) refreshGroups();
  }, [groupId]);

  useEffect(() => {
    if (members.length === 0) {
      setRows([]);
      setRemovedIds(new Set());
      setSkipped([]);
      return;
    }

    const requestId = ++loadRequestId.current;
    setIsLoading(true);

    (async () => {
      const prepared: SimplifiedReportRow[] = [];
      const skippedNames: string[] = [];

      for (const member of members) {
        try {
          const fullAthlete = await apiService.getAthleteById(member.id);
          const mappedAthlete = Mapper.mapNewToOldAthlete(fullAthlete);
          const assessments = fullAthlete.physicalAssessments
            .map(pa => Mapper.mapPhysicalAssessmentToAssessment(pa, fullAthlete.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (assessments.length === 0) {
            skippedNames.push(member.fullName);
            continue;
          }

          const currentEval = assessments[0];
          const pollockMetrics = calculateMetrics(currentEval, mappedAthlete, 'pollock');
          const faulknerMetrics = calculateMetrics(currentEval, mappedAthlete, 'faulkner');

          if (!pollockMetrics && !faulknerMetrics) {
            skippedNames.push(member.fullName);
            continue;
          }

          const faulknerPct = faulknerMetrics?.percentualGordura ?? 0;
          const pollockPct = pollockMetrics?.percentualGordura ?? 0;
          const validPcts = [faulknerPct, pollockPct].filter(v => v > 0);
          const mediaFP =
            validPcts.length > 0 ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length : 0;

          const base = pollockMetrics ?? faulknerMetrics!;

          prepared.push({
            memberId: member.id,
            nome: mappedAthlete.name,
            posicao: member.sector || (mappedAthlete as any).sector || '-',
            categoria: mappedAthlete.category || member.category || '-',
            idade: calculateAge(mappedAthlete.birthDate, currentEval.date),
            altura: base.altura,
            peso: base.peso,
            sumDobras: base.sumDobras,
            faulkner: faulknerPct,
            pollock: pollockPct,
            mediaFP,
            difCoxa: base.simetria.coxa.diff,
            difPantu: base.simetria.pantu.diff,
            difBraco: base.simetria.braco.diff
          });
        } catch (err) {
          console.error('Erro ao carregar dados do atleta', member.fullName, err);
          skippedNames.push(member.fullName);
        }
      }

      if (loadRequestId.current !== requestId) return;
      setRows(prepared);
      setRemovedIds(new Set());
      setSkipped(skippedNames);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIdsKey]);

  const visibleMetricColumns = useMemo(
    () =>
      SIMPLIFIED_REPORT_COLUMNS.filter(
        c => selections[c.key] && c.key !== 'categoria' && c.key !== 'idade'
      ),
    [selections]
  );
  const avgMetricColumns = useMemo(() => visibleMetricColumns.filter(c => c.hasAverage), [visibleMetricColumns]);
  const showCategoria = selections.categoria;
  const showIdade = selections.idade;

  const visibleRows = useMemo(() => rows.filter(r => !removedIds.has(r.memberId)), [rows, removedIds]);

  const avgValues = useMemo(() => {
    const map: Partial<Record<SimplifiedReportColumnKey, number>> = {};
    avgMetricColumns.forEach(col => {
      map[col.key] = average(visibleRows.map(r => r[col.key] as number));
    });
    return map;
  }, [avgMetricColumns, visibleRows]);

  const allSelected = SIMPLIFIED_REPORT_COLUMNS.every(c => selections[c.key]);
  const toggleAll = () => {
    const next = !allSelected;
    const updated = { ...selections };
    SIMPLIFIED_REPORT_COLUMNS.forEach(c => { updated[c.key] = next; });
    setSelections(updated);
  };

  const handleDownloadPdf = async () => {
    if (!paperRef.current || visibleRows.length === 0) return;
    setIsGenerating(true);
    try {
      const pdf = await generateTableReportPdf(paperRef.current, {
        headerSelector: '.sr-pdf-header',
        tableSelector: '.sr-table'
      });
      const fileName = `Relatorio_Resumido_${sanitizeFileName(group?.name ?? 'Grupo')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFatCell = (val: number, col: SimplifiedReportColumnMeta) => {
    const formatted = formatNumber(val, decimalsFor(col.key));
    const isFat = FAT_COLUMN_KEYS.includes(col.key);
    const colorKey = isFat ? getFatColorKey(val) : null;
    const unitSuffix = col.unit && formatted !== '-' ? ` ${col.unit}` : '';
    const avgVal = col.hasAverage ? avgValues[col.key] : undefined;
    const avgFormatted = avgVal !== undefined ? formatNumber(avgVal, decimalsFor(col.key)) : null;
    return (
      <span className="sr-cell-numeric-inner">
        <span className={colorKey ? `sr-fat-badge sr-fat-${colorKey}` : ''}>
          {formatted}{unitSuffix}
        </span>
        {avgFormatted && (
          <span className="sr-avg-inline">({avgFormatted}{unitSuffix})</span>
        )}
      </span>
    );
  };

  const groupName = group?.name ?? (location.state as any)?.groupName ?? 'Grupo';
  const generatedAt = new Date().toLocaleDateString('pt-BR');

  if (groupsLoading && !group && members.length === 0) {
    return <Loading fullScreen message="Carregando grupo..." />;
  }

  return (
    <div className="sr-page">
      {/* ── Page header ── */}
      <div className="sr-page-header container">
        <div className="sr-page-header-left">
          <button className="back-link" onClick={() => navigate(`/groups/${groupId}`)}>
            <ArrowLeft size={18} /> Voltar para o Grupo
          </button>
          <div className="sr-title-row">
            <div className="sr-title-icon">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h1 className="sr-page-title">Relatório Resumido</h1>
              <p className="sr-page-subtitle">{groupName}</p>
            </div>
          </div>
        </div>
        <button
          className="btn btn-primary sr-export-btn"
          onClick={handleDownloadPdf}
          disabled={isGenerating || isLoading || visibleRows.length === 0}
        >
          {isGenerating ? 'Gerando...' : <><Download size={18} /> Exportar PDF</>}
        </button>
      </div>

      {/* ── Main layout ── */}
      <div className="sr-layout container">
        {/* Sidebar */}
        <aside className="sr-sidebar">
          <div className="sr-sidebar-intro">
            <div className="sr-sidebar-icon"><LayoutList size={18} /></div>
            <div>
              <h3>Colunas</h3>
              <p>Escolha quais métricas aparecem na lista e no PDF.</p>
            </div>
          </div>

          <div className="sr-legend">
            <span className="sr-legend-title">%Gordura</span>
            {FAT_LEGEND.map(item => (
              <span key={item.key} className={`sr-legend-chip sr-fat-${item.key}`}>{item.label}</span>
            ))}
          </div>

          <div className="sr-columns-list">
            <div className="sr-columns-header">
              <strong>Nome sempre incluído</strong>
              <button className="btn-text" onClick={toggleAll}>{allSelected ? 'Nenhum' : 'Todos'}</button>
            </div>
            {SIMPLIFIED_REPORT_COLUMNS.map(col => (
              <label key={col.key} className="sr-column-item">
                <input
                  type="checkbox"
                  checked={!!selections[col.key]}
                  onChange={() => setSelections(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                />
                <span className="sr-column-label">{col.label}</span>
                {col.hasAverage && <span className="sr-avg-tag">média</span>}
              </label>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="sr-main">
          {!isLoading && skipped.length > 0 && (
            <div className="sr-skipped-banner" tabIndex={0}>
              <AlertCircle size={14} />
              <span>
                {skipped.length} sem avaliação (não{' '}
                {skipped.length === 1 ? 'entrará' : 'entrarão'} no relatório)
              </span>
              <div className="sr-skipped-tooltip">
                <span className="sr-skipped-tooltip-title">Sem avaliação cadastrada</span>
                <ul>{skipped.map(name => <li key={name}>{name}</li>)}</ul>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="sr-centered">
              <Loading message="Carregando dados dos atletas..." />
            </div>
          )}

          {!isLoading && visibleRows.length === 0 && (
            <div className="sr-centered">
              <UsersIcon size={48} color="var(--color-text-light)" />
              <p className="sr-empty-text">
                {rows.length > 0
                  ? 'Todos os atletas foram removidos do relatório.'
                  : 'Nenhum atleta selecionado possui avaliação cadastrada.'}
              </p>
            </div>
          )}

          {!isLoading && visibleRows.length > 0 && (
            <div className="sr-table-card" ref={paperRef}>
              {/* PDF-only header */}
              <div className="sr-pdf-header">
                <div className="sr-pdf-header-info">
                  <FileSpreadsheet size={18} />
                  <div>
                    <strong>Relatório Resumido do Grupo</strong>
                    <span>{groupName} · {visibleRows.length} de {members.length} atleta(s) · Gerado em {generatedAt}</span>
                  </div>
                </div>
                <div className="sr-legend">
                  <span className="sr-legend-title">%Gordura</span>
                  {FAT_LEGEND.map(item => (
                    <span key={item.key} className={`sr-legend-chip sr-fat-${item.key}`}>{item.label}</span>
                  ))}
                </div>
              </div>

              <div className="sr-table-scroll">
                <table className="sr-table">
                  <thead>
                    <tr>
                      <th className="sr-th sr-th-remove pdf-hide" />
                      <th className="sr-th sr-th-name">ATLETAS</th>
                      <th className="sr-th">Posição</th>
                      {showCategoria && <th className="sr-th">Categoria</th>}
                      {showIdade && <th className="sr-th sr-th-numeric">Idade</th>}
                      {visibleMetricColumns.map(col => (
                        <th key={col.key} className="sr-th sr-th-numeric">
                          <span className="sr-th-icon">{COLUMN_ICONS[col.key]}</span>
                          {col.label}
                          {col.unit && <span className="sr-th-unit"> ({col.unit})</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row, idx) => (
                      <tr
                        key={row.memberId}
                        className="sr-table-row"
                        style={{ animationDelay: `${idx * 25}ms` }}
                      >
                        <td className="sr-cell-remove pdf-hide">
                          <button
                            type="button"
                            className="sr-remove-btn"
                            title="Remover atleta do relatório"
                            onClick={() => setRemovedIds(prev => new Set(prev).add(row.memberId))}
                          >
                            <X size={14} />
                          </button>
                        </td>
                        <td className="sr-cell-name">{row.nome}</td>
                        <td className="sr-cell-posicao">{row.posicao}</td>
                        {showCategoria && <td className="sr-cell-categoria">{row.categoria}</td>}
                        {showIdade && (
                          <td className="sr-cell-numeric">
                            {row.idade > 0 ? `${row.idade} anos` : '-'}
                          </td>
                        )}
                        {visibleMetricColumns.map(col => (
                          <td key={col.key} className="sr-cell-numeric">
                            {renderFatCell(row[col.key] as number, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
