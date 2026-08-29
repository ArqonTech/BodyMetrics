import { forwardRef, type ReactNode } from 'react';
import { Scale, Ruler, Percent, Activity, Shield, Dumbbell, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { Assessment } from '../types/assessment';
import type { Athlete } from '../types/athlete';
import type { ReportSelections } from '../types/report';
import type { AthleteMetrics } from '../utils/metrics';

interface ReportPaperProps {
  athlete: Athlete;
  currentEval?: Assessment;
  compareEval?: Assessment;
  currentMetrics: any;
  compareMetrics: any;
  formula: string;
  logos: string[];
  selections: ReportSelections;
  showGroupAverage?: boolean;
  groupAverageMetrics?: AthleteMetrics | null;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const [yyyy, mm, dd] = dateStr.split('T')[0].split('-');
  return `${dd}/${mm}/${yyyy}`;
};

const calculateAge = (birthDateStr: string | undefined, evalDateStr: string | undefined) => {
  if (!birthDateStr || !evalDateStr) return 0;
  const birthDate = new Date(birthDateStr);
  const evalDate = new Date(evalDateStr);
  let age = evalDate.getFullYear() - birthDate.getFullYear();
  const m = evalDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && evalDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatNumber = (val: any) => {
  if (val === null || val === undefined || isNaN(val) || typeof val !== 'number' || val <= 0) return '-';
  return val.toFixed(2).replace('.', ',');
};

const formatDeltaNumber = (val: number) => {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  return Math.abs(val).toFixed(2).replace('.', ',');
};

const getTrendState = (currentVal?: number, compareVal?: number, inverseGood = false) => {
  if (currentVal === undefined || currentVal === null || compareVal === undefined || compareVal === null) {
    return null;
  }

  const diff = currentVal - compareVal;
  if (diff === 0) {
    return { direction: 'neutral' as const, className: 'trend-neutral', value: '0,00' };
  }

  const isUp = diff > 0;
  const isGood = inverseGood ? !isUp : isUp;

  return {
    direction: isUp ? 'up' as const : 'down' as const,
    className: isGood ? 'trend-good' : 'trend-bad',
    value: formatDeltaNumber(diff),
  };
};

const getDiff = (cur?: number, cmp?: number, unit?: string) => {
  if (cur === undefined || cur === null || cmp === undefined || cmp === null) return '-';
  const diff = cur - cmp;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${formatNumber(diff)} ${unit || ''}`.trim();
};

const isAnySelected = (selections: ReportSelections, section: keyof ReportSelections) => {
  return Object.values(selections[section].items).some(v => v);
};

const getAverageText = (value?: number, unit?: string) => {
  if (value === undefined || value === null || Number.isNaN(value) || value <= 0) return null;
  return `Média: ${formatNumber(value)}${unit ? ` ${unit}` : ''}`;
};

export const ReportPaper = forwardRef<HTMLDivElement, ReportPaperProps>(function ReportPaper({
  athlete, currentEval, compareEval, currentMetrics, compareMetrics, formula, logos, selections, showGroupAverage = false, groupAverageMetrics = null
}, ref) {
  const currentAge = calculateAge(athlete.birthDate, currentEval?.date);

  const renderTableSection = (title: string, items: { label: string, cur?: number, cmp?: number, unit: string }[]) => (
    <div className="report-section">
      <div className="report-section-card">
        <div className="report-section-header">
          <h3 className="report-section-title">{title}</h3>
        </div>
        <div className="report-section-body">
          <table className="report-table">
            <thead>
              <tr>
                <th>Medida</th>
                <th>Atual ({formatDate(currentEval?.date)})</th>
                <th>Anterior ({formatDate(compareEval?.date)})</th>
                <th>Evolução</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.label}</td>
                  <td className={!item.cur || item.cur <= 0 ? 'is-na' : ''}>{formatNumber(item.cur)} {item.cur != null && item.cur > 0 ? item.unit : ''}</td>
                  <td className={!item.cmp || item.cmp <= 0 ? 'is-na' : ''}>{formatNumber(item.cmp)} {item.cmp != null && item.cmp > 0 ? item.unit : ''}</td>
                  <td>{getDiff(item.cur, item.cmp, item.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="report-paper" ref={ref}>

      {/* HEADER */}
      <div className="report-header">
        <div className="report-logos">
          {logos.map((logo, idx) => (
            <img key={idx} src={logo} alt="Logo" className="report-logo-img" />
          ))}
        </div>
        <div className="report-title-area">
          <h1>Relatório de Avaliação Antropométrica</h1>
          <p>Gerado em {formatDate(new Date().toISOString())}</p>
        </div>
      </div>

      {/* ATHLETE INFO */}
      <div className="report-athlete-info">
        <div className="info-grid">
          <div className="info-item"><strong>Atleta:</strong> {athlete.name}</div>
          <div className="info-item"><strong>Esporte:</strong> {(athlete as any).sport || 'Futebol'} {((athlete as any).sportObservation || (athlete as any).position || (athlete as any).sector) && `(${(athlete as any).sportObservation || (athlete as any).position || (athlete as any).sector})`}</div>
          <div className="info-item"><strong>Categoria:</strong> {athlete.category}</div>

          <div className="info-item"><strong>Idade Atual:</strong> {currentAge} anos</div>
          <div className="info-item"><strong>Fase / Obj.:</strong> {athlete.competitivePhase || '-'}</div>
          <div className="info-item"><strong>Sexo:</strong> {athlete.gender || '-'}</div>

          <div className="info-item"><strong>Raça / Etnia:</strong> {athlete.race || '-'}</div>
          <div className="info-item"><strong>Alt. Sentado:</strong> {currentEval?.sittingHeight ? `${currentEval.sittingHeight} cm` : '-'}</div>
          <div className="info-item"><strong>Fórmula:</strong> {formula === 'pollock' ? 'Pollock 7 Dobras' : 'Faulkner'}</div>
        </div>
      </div>

      {/* COMPOSIÇÃO CORPORAL */}
      {isAnySelected(selections, 'composition') && (
        <div className="report-section">
          <div className="report-section-card">
            <div className="report-section-header">
              <h3 className="report-section-title">Composição Corporal</h3>
            </div>
            <div className="report-section-body" style={{ padding: '20px' }}>
              {currentMetrics && (
                <div className="report-metrics-summary">
                  {([
                    { id: 'peso', label: 'Peso Corporal', key: 'peso', unit: 'kg', icon: <Scale size={18} />, inverseGood: true, showTrend: true },
                    { id: 'altura', label: 'Altura', key: 'altura', unit: 'cm', icon: <Ruler size={18} />, inverseGood: false, showTrend: false },
                    { id: 'percentualGordura', label: '% Gordura', key: 'percentualGordura', unit: '%', icon: <Percent size={18} />, inverseGood: true, showTrend: true },
                    { id: 'sumDobras', label: 'Soma das Dobras', key: 'sumDobras', unit: 'mm', icon: <Activity size={18} />, inverseGood: true, showTrend: true },
                    { id: 'gordura', label: 'Massa Gorda', key: 'gordura', unit: 'kg', icon: <Shield size={18} />, inverseGood: true, showTrend: true },
                    { id: 'mlg', label: 'Massa Livre Gord.', key: 'mlg', unit: 'kg', icon: <Dumbbell size={18} />, inverseGood: false, showTrend: true },
                    { id: 'ossos', label: 'Massa Óssea', key: 'ossos', unit: 'kg', icon: <Shield size={18} />, inverseGood: false, showTrend: false },
                    { id: 'massaMuscular', label: 'Massa Muscular', key: 'massaMuscular', unit: 'kg', icon: <Dumbbell size={18} />, inverseGood: false, showTrend: true },
                    { id: 'relacaoMusculoOsso', label: 'Rel. Músculo/Osso', key: 'relacaoMusculoOsso', unit: 'índice', icon: <Activity size={18} />, inverseGood: false, showTrend: true },
                    { id: 'relacaoMusculoGordura', label: 'Rel. Músculo/Gordura', key: 'relacaoMusculoGordura', unit: 'índice', icon: <Activity size={18} />, inverseGood: false, showTrend: true },
                    { id: 'dpvc', label: 'DPVC', key: 'dpvc', unit: '', icon: <Ruler size={18} />, inverseGood: false, showTrend: true, allowNegative: true, hasDataKey: 'hasDpvc' },
                    { id: 'alturaPrevista', label: 'Altura Prevista', key: 'alturaPrevista', unit: 'cm', icon: <Ruler size={18} />, inverseGood: false, showTrend: false, hasDataKey: 'hasDpvc' },
                  ] as Array<{
                    id: string; label: string; key: keyof AthleteMetrics; unit: string; icon: ReactNode;
                    inverseGood: boolean; showTrend: boolean; allowNegative?: boolean; hasDataKey?: keyof AthleteMetrics;
                  }>).filter(m => (selections.composition.items as Record<string, boolean>)[m.id]).map((m) => {
                    const curVal = currentMetrics[m.key] as number;
                    const cmpVal = compareMetrics ? compareMetrics[m.key] as number : undefined;
                    const hasData = m.hasDataKey ? currentMetrics[m.hasDataKey] : (!!curVal && curVal > 0);
                    const isNA = !hasData;
                    const trend = m.showTrend && (!m.hasDataKey || (hasData && compareMetrics?.[m.hasDataKey])) ? getTrendState(curVal, cmpVal, m.inverseGood) : null;
                    const avgText = showGroupAverage
                      ? getAverageText(groupAverageMetrics?.[m.key] as number | undefined, m.unit)
                      : null;
                    const displayValue = isNA ? '-' : m.allowNegative ? curVal.toFixed(2).replace('.', ',') : formatNumber(curVal);

                    return (
                      <div key={m.key} className={`report-metric-box ${isNA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper">
                            {m.icon}
                          </div>
                          <span className="report-metric-label">{m.label}</span>
                        </div>

                        <div className="report-metric-body">
                          <span className="report-metric-value">{displayValue}</span>
                          <span className="report-metric-unit">{m.unit}</span>
                        </div>

                        {m.id === 'dpvc' && !isNA && currentMetrics.statusPvc && (
                          <div className="report-metric-status">{currentMetrics.statusPvc}</div>
                        )}

                        {avgText && <div className="report-metric-average">{avgText}</div>}

                        <div className="report-metric-footer">
                          {trend ? (
                            <span className={`report-metric-trend ${trend.className}`}>
                              {trend.direction === 'neutral' ? <Minus size={12} /> : trend.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {trend.value}
                            </span>
                          ) : <span />}
                          <span style={{ fontSize: '6pt', color: '#94a3b8' }}>vs. anterior</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIMETRIA */}
      {isAnySelected(selections, 'symmetry') && (
        <div className="report-section">
          <div className="report-section-card">
            <div className="report-section-header">
              <h3 className="report-section-title">Índices de Simetria (Medidas Corrigidas)</h3>
            </div>
            <div className="report-section-body" style={{ padding: '20px' }}>
              <div className="report-symmetry-container">
                {[
                  { label: 'Coxa', metricKey: 'coxa' as const, data: currentMetrics?.simetria?.coxa },
                  { label: 'Panturrilha', metricKey: 'pantu' as const, data: currentMetrics?.simetria?.pantu },
                  { label: 'Braço', metricKey: 'braco' as const, data: currentMetrics?.simetria?.braco }
                ].filter(item => (selections.symmetry.items as any)[item.label]).map((item, idx) => {
                  const isD_NA = !item.data?.d || item.data?.d <= 0;
                  const isE_NA = !item.data?.e || item.data?.e <= 0;
                  const isDiff_NA = isD_NA || isE_NA;
                  const avgD = showGroupAverage ? getAverageText(groupAverageMetrics?.simetria?.[item.metricKey]?.d, 'cm') : null;
                  const avgE = showGroupAverage ? getAverageText(groupAverageMetrics?.simetria?.[item.metricKey]?.e, 'cm') : null;
                  const avgDiff = showGroupAverage ? getAverageText(groupAverageMetrics?.simetria?.[item.metricKey]?.diff, 'cm') : null;
                  const cmpData = compareMetrics?.simetria?.[item.metricKey];
                  const trendD = getTrendState(item.data?.d, cmpData?.d, false);
                  const trendE = getTrendState(item.data?.e, cmpData?.e, false);
                  const trendDiff = getTrendState(item.data?.diff, cmpData?.diff, true);

                  return (
                    <div key={idx} className="report-metrics-summary grid-3" style={{ marginBottom: idx === 2 ? 0 : '15px' }}>
                      <div className={`report-metric-box ${isD_NA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper"><Ruler size={14} /></div>
                          <span className="report-metric-label">C/C {item.label} D</span>
                        </div>
                        <div className="report-metric-body">
                          <span className="report-metric-value">{formatNumber(item.data?.d)}</span>
                          <span className="report-metric-unit">cm</span>
                        </div>
                        <div className="report-metric-footer">
                          {trendD ? (
                            <span className={`report-metric-trend ${trendD.className}`}>
                              {trendD.direction === 'neutral' ? <Minus size={12} /> : trendD.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {trendD.value}
                            </span>
                          ) : <span />}
                          <span style={{ fontSize: '6pt', color: '#94a3b8' }}>Lado Direito</span>
                        </div>
                        {avgD && <div className="report-metric-average">{avgD}</div>}
                      </div>

                      <div className={`report-metric-box ${isE_NA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper"><Ruler size={14} /></div>
                          <span className="report-metric-label">C/C {item.label} E</span>
                        </div>
                        <div className="report-metric-body">
                          <span className="report-metric-value">{formatNumber(item.data?.e)}</span>
                          <span className="report-metric-unit">cm</span>
                        </div>
                        <div className="report-metric-footer">
                          {trendE ? (
                            <span className={`report-metric-trend ${trendE.className}`}>
                              {trendE.direction === 'neutral' ? <Minus size={12} /> : trendE.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {trendE.value}
                            </span>
                          ) : <span />}
                          <span style={{ fontSize: '6pt', color: '#94a3b8' }}>Lado Esquerdo</span>
                        </div>
                        {avgE && <div className="report-metric-average">{avgE}</div>}
                      </div>

                      <div className={`report-metric-box ${isDiff_NA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper"><Activity size={14} /></div>
                          <span className="report-metric-label">Diferença D/E</span>
                        </div>
                        <div className="report-metric-body">
                          <span className="report-metric-value">{(item.data?.d ?? 0) > (item.data?.e ?? 0) ? '+' : ''}{formatNumber(item.data?.diff)}</span>
                          <span className="report-metric-unit">cm</span>
                        </div>
                        <div className="report-metric-footer">
                          {trendDiff ? (
                            <span className={`report-metric-trend ${trendDiff.className}`}>
                              {trendDiff.direction === 'neutral' ? <Minus size={12} /> : trendDiff.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {trendDiff.value}
                            </span>
                          ) : <span />}
                          <span style={{ fontSize: '6pt', color: '#94a3b8' }}>Assimetria</span>
                        </div>
                        {avgDiff && <div className="report-metric-average">{avgDiff}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RELAÇÕES */}
      {isAnySelected(selections, 'relations') && (
        <div className="report-section">
          <div className="report-section-card">
            <div className="report-section-header">
              <h3 className="report-section-title">Relação Cineantropométrica</h3>
            </div>
            <div className="report-section-body" style={{ padding: '20px' }}>
              <div className="report-relations-container">
                {[
                  {
                    label: 'Coxa / Fêmur',
                    titleMedia: 'Coxa',
                    titleOsso: 'Fêmur',
                    media: currentMetrics?.relacao?.ccCoxa,
                    osso: currentMetrics?.relacao?.diamJoelho,
                    relacao: currentMetrics?.relacao?.coxa,
                    relacaoKey: 'coxa' as const,
                    mediaKey: 'ccCoxa' as const,
                    ossoKey: 'diamJoelho' as const
                  },
                  {
                    label: 'Panturrilha / Tornozelo',
                    titleMedia: 'Pantu.',
                    titleOsso: 'Tornozelo',
                    media: currentMetrics?.relacao?.ccPantu,
                    osso: currentMetrics?.relacao?.diamTornozelo,
                    relacao: currentMetrics?.relacao?.pantu,
                    relacaoKey: 'pantu' as const,
                    mediaKey: 'ccPantu' as const,
                    ossoKey: 'diamTornozelo' as const
                  },
                  {
                    label: 'Braço / Úmero',
                    titleMedia: 'Braço',
                    titleOsso: 'Úmero',
                    media: currentMetrics?.relacao?.ccBraco,
                    osso: currentMetrics?.relacao?.diamPunho,
                    relacao: currentMetrics?.relacao?.braco,
                    relacaoKey: 'braco' as const,
                    mediaKey: 'ccBraco' as const,
                    ossoKey: 'diamPunho' as const
                  }
                ].filter(item => (selections.relations.items as any)[item.label]).map((item, idx) => {
                  const isMedia_NA = !item.media || item.media <= 0;
                  const isOsso_NA = !item.osso || item.osso <= 0;
                  const isRel_NA = isMedia_NA || isOsso_NA;
                  const avgMedia = showGroupAverage ? getAverageText(groupAverageMetrics?.relacao?.[item.mediaKey], 'cm') : null;
                  const avgOsso = showGroupAverage ? getAverageText(groupAverageMetrics?.relacao?.[item.ossoKey], 'cm') : null;
                  const avgRel = showGroupAverage ? getAverageText(groupAverageMetrics?.relacao?.[item.relacaoKey], 'indice') : null;
                  const trendMedia = getTrendState(item.media, compareMetrics?.relacao?.[item.mediaKey], false);
                  const trendRel = getTrendState(item.relacao, compareMetrics?.relacao?.[item.relacaoKey], false);

                  return (
                    <div key={idx} className="report-metrics-summary grid-3" style={{ marginBottom: idx === 2 ? 0 : '15px' }}>
                      <div className={`report-metric-box ${isMedia_NA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper"><Ruler size={14} /></div>
                          <span className="report-metric-label">Média {item.titleMedia}</span>
                        </div>
                        <div className="report-metric-body">
                          <span className="report-metric-value">{formatNumber(item.media)}</span>
                          <span className="report-metric-unit">cm</span>
                        </div>
                        <div className="report-metric-footer">
                          {trendMedia ? (
                            <span className={`report-metric-trend ${trendMedia.className}`}>
                              {trendMedia.direction === 'neutral' ? <Minus size={12} /> : trendMedia.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {trendMedia.value}
                            </span>
                          ) : <span />}
                          <span style={{ fontSize: '6pt', color: '#94a3b8' }}>Média Corrigida</span>
                        </div>
                        {avgMedia && <div className="report-metric-average">{avgMedia}</div>}
                      </div>

                      <div className={`report-metric-box ${isOsso_NA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper"><Shield size={14} /></div>
                          <span className="report-metric-label">Osso {item.titleOsso}</span>
                        </div>
                        <div className="report-metric-body">
                          <span className="report-metric-value">{formatNumber(item.osso)}</span>
                          <span className="report-metric-unit">cm</span>
                        </div>
                        <div className="report-metric-footer"><span style={{ fontSize: '6pt', color: '#94a3b8' }}>Diâmetro Ósseo</span></div>
                        {avgOsso && <div className="report-metric-average">{avgOsso}</div>}
                      </div>

                      <div className={`report-metric-box ${isRel_NA ? 'is-na' : ''}`}>
                        <div className="report-metric-header">
                          <div className="report-metric-icon-wrapper"><Activity size={14} /></div>
                          <span className="report-metric-label">Relação</span>
                        </div>
                        <div className="report-metric-body">
                          <span className="report-metric-value">{formatNumber(item.relacao)}</span>
                          <span className="report-metric-unit">índice</span>
                        </div>
                        <div className="report-metric-footer">
                          {trendRel ? (
                            <span className={`report-metric-trend ${trendRel.className}`}>
                              {trendRel.direction === 'neutral' ? <Minus size={12} /> : trendRel.direction === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {trendRel.value}
                            </span>
                          ) : <span />}
                          <span style={{ fontSize: '6pt', color: '#94a3b8' }}>Índice Cine.</span>
                        </div>
                        {avgRel && <div className="report-metric-average">{avgRel}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLES (END) */}
      {isAnySelected(selections, 'skinfolds') && renderTableSection('Dobras Cutâneas', [
        { id: 'tricepsRight', label: 'Tríceps Dir.', cur: currentEval?.skinfolds?.tricepsRight, cmp: compareEval?.skinfolds?.tricepsRight, unit: 'mm' },
        { id: 'tricepsLeft', label: 'Tríceps Esq.', cur: currentEval?.skinfolds?.tricepsLeft, cmp: compareEval?.skinfolds?.tricepsLeft, unit: 'mm' },
        { id: 'subscapular', label: 'Subescapular', cur: currentEval?.skinfolds?.subscapular, cmp: compareEval?.skinfolds?.subscapular, unit: 'mm' },
        { id: 'chest', label: 'Tórax', cur: currentEval?.skinfolds?.chest, cmp: compareEval?.skinfolds?.chest, unit: 'mm' },
        { id: 'midaxillary', label: 'Subaxilar', cur: currentEval?.skinfolds?.midaxillary, cmp: compareEval?.skinfolds?.midaxillary, unit: 'mm' },
        { id: 'suprailiac', label: 'Supra-ilíaca', cur: currentEval?.skinfolds?.suprailiac, cmp: compareEval?.skinfolds?.suprailiac, unit: 'mm' },
        { id: 'abdominal', label: 'Abdominal', cur: currentEval?.skinfolds?.abdominal, cmp: compareEval?.skinfolds?.abdominal, unit: 'mm' },
        { id: 'thighRight', label: 'Coxa Dir.', cur: currentEval?.skinfolds?.thighRight, cmp: compareEval?.skinfolds?.thighRight, unit: 'mm' },
        { id: 'thighLeft', label: 'Coxa Esq.', cur: currentEval?.skinfolds?.thighLeft, cmp: compareEval?.skinfolds?.thighLeft, unit: 'mm' },
        { id: 'calfRight', label: 'Panturrilha Dir.', cur: currentEval?.skinfolds?.calfRight, cmp: compareEval?.skinfolds?.calfRight, unit: 'mm' },
        { id: 'calfLeft', label: 'Panturrilha Esq.', cur: currentEval?.skinfolds?.calfLeft, cmp: compareEval?.skinfolds?.calfLeft, unit: 'mm' }
      ].filter(item => (selections.skinfolds.items as any)[item.id]))}

      {isAnySelected(selections, 'circumferences') && renderTableSection('Circunferências', [
        { id: 'shoulder', label: 'Ombro', cur: currentEval?.circumferences?.shoulder, cmp: compareEval?.circumferences?.shoulder, unit: 'cm' },
        { id: 'chest', label: 'Peitoral', cur: currentEval?.circumferences?.chest, cmp: compareEval?.circumferences?.chest, unit: 'cm' },
        { id: 'armRight', label: 'Braço Dir.', cur: currentEval?.circumferences?.armRight, cmp: compareEval?.circumferences?.armRight, unit: 'cm' },
        { id: 'armLeft', label: 'Braço Esq.', cur: currentEval?.circumferences?.armLeft, cmp: compareEval?.circumferences?.armLeft, unit: 'cm' },
        { id: 'waist', label: 'Cintura', cur: currentEval?.circumferences?.waist, cmp: compareEval?.circumferences?.waist, unit: 'cm' },
        { id: 'abdomen', label: 'Abdômen', cur: currentEval?.circumferences?.abdomen, cmp: compareEval?.circumferences?.abdomen, unit: 'cm' },
        { id: 'hip', label: 'Quadril', cur: currentEval?.circumferences?.hip, cmp: compareEval?.circumferences?.hip, unit: 'cm' },
        { id: 'thighMidRight', label: 'Medial Dir.', cur: currentEval?.circumferences?.thighMidRight, cmp: compareEval?.circumferences?.thighMidRight, unit: 'cm' },
        { id: 'thighMidLeft', label: 'Medial Esq.', cur: currentEval?.circumferences?.thighMidLeft, cmp: compareEval?.circumferences?.thighMidLeft, unit: 'cm' },
        { id: 'calfRight', label: 'Panturrilha Dir.', cur: currentEval?.circumferences?.calfRight, cmp: compareEval?.circumferences?.calfRight, unit: 'cm' },
        { id: 'calfLeft', label: 'Panturrilha Esq.', cur: currentEval?.circumferences?.calfLeft, cmp: compareEval?.circumferences?.calfLeft, unit: 'cm' },
        { id: 'wristRight', label: 'D. Punho', cur: currentEval?.circumferences?.wristRight, cmp: compareEval?.circumferences?.wristRight, unit: 'cm' },
        { id: 'kneeRight', label: 'D. Joelho', cur: currentEval?.circumferences?.kneeRight, cmp: compareEval?.circumferences?.kneeRight, unit: 'cm' },
        { id: 'ankle', label: 'D. Tornozelo', cur: (currentEval?.circumferences as any)?.ankle, cmp: (compareEval?.circumferences as any)?.ankle, unit: 'cm' },
        { id: 'envergadura', label: 'Envergadura', cur: (currentEval?.circumferences as any)?.envergadura, cmp: (compareEval?.circumferences as any)?.envergadura, unit: 'cm' }
      ].filter(item => (selections.circumferences.items as any)[item.id]))}

    </div>
  );
});
