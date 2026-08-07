import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Download, LayoutList, Users as UsersIcon, AlertCircle, FileSpreadsheet,
  Ruler, Scale, Activity, Percent
} from 'lucide-react';
import { Loading } from './Loading';
import {
  SIMPLIFIED_REPORT_COLUMNS,
  createDefaultSimplifiedReportSelections
} from '../types/simplifiedReport';
import type { SimplifiedReportColumnKey, SimplifiedReportColumnMeta } from '../types/simplifiedReport';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generatePdfFromNode } from '../utils/pdfReport';
import { calculateMetrics, calculateAge } from '../utils/metrics';
import * as Mapper from '../utils/mapper';
import apiService from '../services/api.service';
import type { AthleteGroupViewModel } from '../types/api';
import './ReportModal.css';
import './GroupSimplifiedReportModal.css';

interface GroupSimplifiedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: AthleteGroupViewModel;
  filteredMembers?: AthleteGroupViewModel['members'];
}

interface SimplifiedReportRow {
  memberId: string;
  nome: string;
  categoria: string;
  idade: number;
  altura: number;
  peso: number;
  sumDobras: number;
  faulkner: number;
  pollock: number;
  mediaFP: number;
  dpvc: number;
  alturaPrevista: number;
  difCoxa: number;
  difPantu: number;
  difBraco: number;
}

type FatColorKey = 'yellow' | 'green' | 'orange' | 'red';

const FAT_COLUMN_KEYS: SimplifiedReportColumnKey[] = ['faulkner', 'pollock', 'mediaFP'];

const FAT_LEGEND: { key: FatColorKey; label: string }[] = [
  { key: 'yellow', label: '< 8%' },
  { key: 'green', label: '8 – 9,99%' },
  { key: 'orange', label: '10 – 11,99%' },
  { key: 'red', label: '≥ 12%' }
];

// Faixas de %gordura definidas pelo usuário: amarelo <8, verde 8-9,99, laranja 10-11,99, vermelho >=12
function getFatColorKey(pct: number): FatColorKey | null {
  if (!Number.isFinite(pct) || pct <= 0) return null;
  if (pct < 8) return 'yellow';
  if (pct < 10) return 'green';
  if (pct < 12) return 'orange';
  return 'red';
}

const COLUMN_ICONS: Partial<Record<SimplifiedReportColumnKey, React.ReactNode>> = {
  altura: <Ruler size={16} />,
  peso: <Scale size={16} />,
  sumDobras: <Activity size={16} />,
  faulkner: <Percent size={16} />,
  pollock: <Percent size={16} />,
  mediaFP: <Percent size={16} />,
  difCoxa: <Activity size={16} />,
  difPantu: <Activity size={16} />,
  difBraco: <Activity size={16} />
};

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

function renderMetricTile(col: SimplifiedReportColumnMeta, value: number) {
  const formatted = formatNumber(value, decimalsFor(col.key));
  const isNA = formatted === '-';
  const isFat = FAT_COLUMN_KEYS.includes(col.key);
  const colorKey = isFat ? getFatColorKey(value) : null;

  return (
    <div key={col.key} className={`report-metric-box ${isNA ? 'is-na' : ''}`}>
      <div className="report-metric-header">
        <div className="report-metric-icon-wrapper">{COLUMN_ICONS[col.key]}</div>
        <span className="report-metric-label">{col.label}</span>
      </div>
      <div className="report-metric-body">
        <span className={colorKey ? `report-metric-value simplified-fat-badge simplified-fat-${colorKey}` : 'report-metric-value'}>
          {formatted}
        </span>
        <span className="report-metric-unit">{col.unit}</span>
      </div>
    </div>
  );
}

export function GroupSimplifiedReportModal({ isOpen, onClose, group, filteredMembers }: GroupSimplifiedReportModalProps) {
  const members = filteredMembers ?? group.members;
  const memberIdsKey = members.map(m => m.id).join(',');

  const [selections, setSelections] = useLocalStorage(
    '@BodyMetrics:simplifiedReportColumns',
    createDefaultSimplifiedReportSelections()
  );

  const [rows, setRows] = useState<SimplifiedReportRow[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const loadRequestId = useRef(0);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setSkipped([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || members.length === 0) {
      setRows([]);
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
          const mediaFP = validPcts.length > 0 ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length : 0;

          const base = pollockMetrics ?? faulknerMetrics!;

          prepared.push({
            memberId: member.id,
            nome: mappedAthlete.name,
            categoria: mappedAthlete.category || member.category || '-',
            idade: calculateAge(mappedAthlete.birthDate, currentEval.date),
            altura: base.altura,
            peso: base.peso,
            sumDobras: base.sumDobras,
            faulkner: faulknerPct,
            pollock: pollockPct,
            mediaFP,
            dpvc: base.dpvc,
            alturaPrevista: base.alturaPrevista,
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
      setSkipped(skippedNames);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, memberIdsKey]);

  const metricColumns = useMemo(
    () => SIMPLIFIED_REPORT_COLUMNS.filter(c => selections[c.key] && c.key !== 'categoria' && c.key !== 'idade'),
    [selections]
  );
  const avgMetricColumns = useMemo(() => metricColumns.filter(c => c.hasAverage), [metricColumns]);
  const showCategoria = selections.categoria;
  const showIdade = selections.idade;

  if (!isOpen) return null;

  const toggleColumn = (key: SimplifiedReportColumnKey) => {
    setSelections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allSelected = SIMPLIFIED_REPORT_COLUMNS.every(c => selections[c.key]);
  const toggleAll = () => {
    const next = !allSelected;
    setSelections(() => {
      const updated = { ...selections };
      SIMPLIFIED_REPORT_COLUMNS.forEach(c => { updated[c.key] = next; });
      return updated;
    });
  };

  const handleDownloadPdf = async () => {
    if (!paperRef.current || rows.length === 0) return;
    setIsGenerating(true);
    try {
      const pdf = await generatePdfFromNode(paperRef.current);
      const fileName = `Relatorio_Resumido_${sanitizeFileName(group.name)}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } finally {
      setIsGenerating(false);
    }
  };

  const generatedAt = new Date().toLocaleDateString('pt-BR');

  const legend = (
    <div className="simplified-report-legend">
      <span className="simplified-report-legend-title">%Gordura</span>
      {FAT_LEGEND.map(item => (
        <span key={item.key} className={`simplified-report-legend-chip simplified-fat-${item.key}`}>{item.label}</span>
      ))}
    </div>
  );

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-container">
        <div className="report-modal-header">
          <h2>Relatório Resumido do Grupo</h2>
          <button className="btn-close" onClick={onClose} disabled={isGenerating}><X size={24} /></button>
        </div>

        <div className="report-modal-content">
          <div className="report-sidebar simplified-report-sidebar">
            <div className="simplified-report-sidebar-intro">
              <div className="simplified-report-sidebar-icon"><LayoutList size={20} /></div>
              <div>
                <h3>Colunas do relatório</h3>
                <p>Escolha quais informações aparecem nos cards e no PDF exportado.</p>
              </div>
            </div>

            {legend}

            <div className="section-control expanded simplified-report-columns">
              <div className="section-control-header">
                <div className="section-title-with-badge">
                  <strong>Nome sempre incluído</strong>
                  <span className="selection-badge">{metricColumns.length + (showCategoria ? 1 : 0) + (showIdade ? 1 : 0)}</span>
                </div>
                <button className="btn-text" onClick={toggleAll}>{allSelected ? 'Nenhum' : 'Todos'}</button>
              </div>
              <div className="items-control">
                {SIMPLIFIED_REPORT_COLUMNS.map(col => (
                  <label key={col.key} className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={!!selections[col.key]}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                    {col.hasAverage && <span className="simplified-report-avg-tag">média</span>}
                  </label>
                ))}
              </div>
            </div>

            <div className="report-actions">
              <button
                className="btn btn-primary w-full"
                onClick={handleDownloadPdf}
                disabled={isGenerating || isLoading || rows.length === 0}
              >
                {isGenerating ? 'Gerando...' : <><Download size={18} /> Baixar PDF</>}
              </button>
            </div>
          </div>

          <div className="group-report-preview-area simplified-report-preview-area">
            {isLoading && (
              <div className="group-report-preview-centered">
                <Loading message="Carregando dados dos atletas..." />
              </div>
            )}

            {!isLoading && rows.length === 0 && (
              <div className="group-report-preview-centered">
                <div className="group-report-intro">
                  <div className="group-report-intro-icon"><UsersIcon size={40} /></div>
                  <h3>{group.name}</h3>
                  <p>Nenhum atleta selecionado possui avaliação cadastrada para gerar relatório.</p>
                </div>
              </div>
            )}

            {!isLoading && rows.length > 0 && (
              <div className="simplified-report-scroll">
                {skipped.length > 0 && (
                  <div className="preview-skipped-banner simplified-report-skipped-banner" tabIndex={0}>
                    <AlertCircle size={13} /> {skipped.length} sem avaliação (não {skipped.length === 1 ? 'entrará' : 'entrarão'} no relatório)
                    <div className="preview-skipped-tooltip">
                      <span className="preview-skipped-tooltip-title">Sem avaliação cadastrada</span>
                      <ul>{skipped.map(name => <li key={name}>{name}</li>)}</ul>
                    </div>
                  </div>
                )}

                <div ref={paperRef} className="report-paper simplified-report-paper">
                  <div className="report-header">
                    <div className="report-title-area">
                      <h1><FileSpreadsheet size={20} className="simplified-report-title-icon" /> Relatório Resumido do Grupo</h1>
                      <p>{group.name} • {rows.length} de {members.length} atleta(s) • Gerado em {generatedAt}</p>
                      {legend}
                    </div>
                  </div>

                  {avgMetricColumns.length > 0 && (
                    <div className="report-section">
                      <div className="report-section-card simplified-report-avg-card">
                        <div className="report-section-header simplified-athlete-card-header">
                          <h3 className="report-section-title">Média do Grupo</h3>
                          <span className="simplified-athlete-tag simplified-athlete-tag-count">{rows.length} atleta(s)</span>
                        </div>
                        <div className="report-section-body" style={{ padding: '20px' }}>
                          <div className="report-metrics-summary grid-3">
                            {avgMetricColumns.map(col => renderMetricTile(col, average(rows.map(r => r[col.key] as number))))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {rows.map(row => (
                    <div className="report-section" key={row.memberId}>
                      <div className="report-section-card">
                        <div className="report-section-header simplified-athlete-card-header">
                          <h3 className="report-section-title simplified-athlete-name">{row.nome}</h3>
                          <div className="simplified-athlete-tags">
                            {showCategoria && <span className="simplified-athlete-tag">{row.categoria}</span>}
                            {showIdade && row.idade > 0 && <span className="simplified-athlete-tag">{row.idade} anos</span>}
                          </div>
                        </div>
                        {metricColumns.length > 0 && (
                          <div className="report-section-body" style={{ padding: '20px' }}>
                            <div className="report-metrics-summary grid-3">
                              {metricColumns.map(col => renderMetricTile(col, row[col.key] as number))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
