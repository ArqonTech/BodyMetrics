import { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import JSZip from 'jszip';
import { X, Download, CheckCircle2, Users as UsersIcon, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Loading } from './Loading';
import { ReportPaper } from './ReportPaper';
import { ReportOptionsSidebar } from './ReportOptionsSidebar';
import { createDefaultReportSelections } from '../types/report';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generatePdfFromNode } from '../utils/pdfReport';
import { calculateMetrics } from '../utils/metrics';
import type { AthleteMetrics } from '../utils/metrics';
import * as Mapper from '../utils/mapper';
import apiService from '../services/api.service';
import type { AthleteGroupViewModel } from '../types/api';
import type { Athlete } from '../types/athlete';
import type { Assessment } from '../types/assessment';
import './ReportModal.css';
import './GroupReportModal.css';

interface GroupReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: AthleteGroupViewModel;
  filteredMembers?: AthleteGroupViewModel['members'];
}

interface RenderData {
  athlete: Athlete;
  currentEval?: Assessment;
  compareEval?: Assessment;
  currentMetrics: any;
  compareMetrics: any;
}

interface PreviewItem {
  memberId: string;
  memberName: string;
  data: RenderData;
}

const average = (values: number[]) => {
  const validValues = values.filter(v => Number.isFinite(v) && v > 0);
  if (validValues.length === 0) return 0;
  return validValues.reduce((acc, value) => acc + value, 0) / validValues.length;
};

const calculateGroupAverageMetrics = (metricsList: AthleteMetrics[]): AthleteMetrics | null => {
  if (metricsList.length === 0) return null;

  return {
    peso: average(metricsList.map(m => m.peso)),
    altura: average(metricsList.map(m => m.altura)),
    gordura: average(metricsList.map(m => m.gordura)),
    sumDobras: average(metricsList.map(m => m.sumDobras)),
    ossos: average(metricsList.map(m => m.ossos)),
    mlg: average(metricsList.map(m => m.mlg)),
    percentualGordura: average(metricsList.map(m => m.percentualGordura)),
    massaMuscular: average(metricsList.map(m => m.massaMuscular)),
    relacaoMusculoOsso: average(metricsList.map(m => m.relacaoMusculoOsso)),
    relacaoMusculoGordura: average(metricsList.map(m => m.relacaoMusculoGordura)),
    dpvc: average(metricsList.map(m => m.dpvc)),
    hasDpvc: metricsList.some(m => m.hasDpvc),
    statusPvc: '',
    alturaPrevista: average(metricsList.map(m => m.alturaPrevista)),
    simetria: {
      coxa: {
        d: average(metricsList.map(m => m.simetria.coxa.d)),
        e: average(metricsList.map(m => m.simetria.coxa.e)),
        diff: average(metricsList.map(m => m.simetria.coxa.diff))
      },
      pantu: {
        d: average(metricsList.map(m => m.simetria.pantu.d)),
        e: average(metricsList.map(m => m.simetria.pantu.e)),
        diff: average(metricsList.map(m => m.simetria.pantu.diff))
      },
      braco: {
        d: average(metricsList.map(m => m.simetria.braco.d)),
        e: average(metricsList.map(m => m.simetria.braco.e)),
        diff: average(metricsList.map(m => m.simetria.braco.diff))
      }
    },
    relacao: {
      coxa: average(metricsList.map(m => m.relacao.coxa)),
      pantu: average(metricsList.map(m => m.relacao.pantu)),
      braco: average(metricsList.map(m => m.relacao.braco)),
      ccCoxa: average(metricsList.map(m => m.relacao.ccCoxa)),
      ccPantu: average(metricsList.map(m => m.relacao.ccPantu)),
      ccBraco: average(metricsList.map(m => m.relacao.ccBraco)),
      diamJoelho: average(metricsList.map(m => m.relacao.diamJoelho)),
      diamTornozelo: average(metricsList.map(m => m.relacao.diamTornozelo)),
      diamPunho: average(metricsList.map(m => m.relacao.diamPunho))
    }
  };
};

const sanitizeFileName = (name: string) => name.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '');

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function GroupReportModal({ isOpen, onClose, group, filteredMembers }: GroupReportModalProps) {
  const members = filteredMembers ?? group.members;
  const memberIdsKey = members.map(m => m.id).join(',');

  const [logos, setLogos] = useLocalStorage<string[]>('@BodyMetrics:reportLogos', []);
  const [selections, setSelections] = useState(createDefaultReportSelections());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    composition: true,
    symmetry: true,
    relations: true,
    skinfolds: false,
    circumferences: false
  });
  const [formula, setFormula] = useLocalStorage<'pollock' | 'faulkner'>('@BodyMetrics:reportFormula', 'pollock');
  const [showGroupAverage, setShowGroupAverage] = useState(false);

  // Prévia paginada: carregada uma vez por combinação de membros/fórmula, reaproveitada na exportação
  const [previewReports, setPreviewReports] = useState<PreviewItem[]>([]);
  const [previewSkipped, setPreviewSkipped] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const previewRequestId = useRef(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [finished, setFinished] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [renderData, setRenderData] = useState<RenderData | null>(null);

  const hiddenReportRef = useRef<HTMLDivElement>(null);

  const groupAverageMetrics = useMemo(() => {
    if (!showGroupAverage || previewReports.length === 0) return null;
    return calculateGroupAverageMetrics(previewReports.map(item => item.data.currentMetrics as AthleteMetrics));
  }, [showGroupAverage, previewReports]);

  useEffect(() => {
    if (!isOpen) {
      setIsGenerating(false);
      setProgress(null);
      setFinished(false);
      setSuccessCount(0);
      setSkipped([]);
      setRenderData(null);
      setPreviewReports([]);
      setPreviewSkipped([]);
      setPreviewIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || members.length === 0) return;
    const requestId = ++previewRequestId.current;
    setIsLoadingPreview(true);
    setPreviewIndex(0);

    (async () => {
      const prepared: PreviewItem[] = [];
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
          const compareEval = assessments[1];
          const currentMetrics = calculateMetrics(currentEval, mappedAthlete, formula);
          const compareMetrics = calculateMetrics(compareEval, mappedAthlete, formula);

          if (!currentMetrics) {
            skippedNames.push(member.fullName);
            continue;
          }

          prepared.push({
            memberId: member.id,
            memberName: member.fullName,
            data: { athlete: mappedAthlete, currentEval, compareEval, currentMetrics, compareMetrics }
          });
        } catch (err) {
          console.error('Erro ao carregar prévia do atleta', member.fullName, err);
          skippedNames.push(member.fullName);
        }
      }

      if (previewRequestId.current !== requestId) return;
      setPreviewReports(prepared);
      setPreviewSkipped(skippedNames);
      setIsLoadingPreview(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, memberIdsKey, formula]);

  if (!isOpen) return null;

  const goToPrevPreview = () => setPreviewIndex(i => Math.max(0, i - 1));
  const goToNextPreview = () => setPreviewIndex(i => Math.min(previewReports.length - 1, i + 1));

  const handleGenerate = async () => {
    if (previewReports.length === 0) return;

    setIsGenerating(true);
    setFinished(false);

    const zip = new JSZip();
    const skippedNames: string[] = [...previewSkipped];
    const usedNames = new Set<string>();

    for (let i = 0; i < previewReports.length; i++) {
      const item = previewReports[i];
      setProgress({ current: i + 1, total: previewReports.length, name: item.memberName });

      try {
        flushSync(() => {
          setRenderData(item.data);
        });

        if (!hiddenReportRef.current) {
          skippedNames.push(item.memberName);
          continue;
        }

        const pdf = await generatePdfFromNode(hiddenReportRef.current);
        const blob = pdf.output('blob');

        let fileName = sanitizeFileName(item.memberName) || item.memberId;
        if (usedNames.has(fileName)) {
          let n = 2;
          while (usedNames.has(`${fileName}_${n}`)) n++;
          fileName = `${fileName}_${n}`;
        }
        usedNames.add(fileName);
        zip.file(`${fileName}.pdf`, blob);
      } catch (err) {
        console.error('Erro ao gerar relatório do atleta', item.memberName, err);
        skippedNames.push(item.memberName);
      }
    }

    setRenderData(null);

    if (usedNames.size > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `Relatorios_${sanitizeFileName(group.name)}_${new Date().toISOString().split('T')[0]}.zip`);
    }

    setSuccessCount(usedNames.size);
    setSkipped(skippedNames);
    setProgress(null);
    setIsGenerating(false);
    setFinished(true);
  };

  const currentPreview = previewReports[previewIndex];

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-container">
        <div className="report-modal-header">
          <h2>Exportar Relatórios do Grupo</h2>
          <button className="btn-close" onClick={onClose} disabled={isGenerating}><X size={24} /></button>
        </div>

        <div className="report-modal-content">
          <ReportOptionsSidebar
            logos={logos}
            setLogos={setLogos}
            showGroupAverage={showGroupAverage}
            setShowGroupAverage={setShowGroupAverage}
            selections={selections}
            setSelections={setSelections}
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            footer={
              <>
                <div className="group-report-formula">
                  <label htmlFor="group-report-formula-select">Fórmula %G</label>
                  <select
                    id="group-report-formula-select"
                    value={formula}
                    onChange={e => setFormula(e.target.value as 'pollock' | 'faulkner')}
                    disabled={isGenerating}
                  >
                    <option value="pollock">Pollock</option>
                    <option value="faulkner">Faulkner</option>
                  </select>
                </div>
                <button
                  className="btn btn-primary w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || isLoadingPreview || previewReports.length === 0}
                >
                  {isGenerating ? 'Gerando...' : <><Download size={18} /> Baixar ZIP ({previewReports.length})</>}
                </button>
              </>
            }
          />

          <div className="group-report-preview-area">
            {isGenerating && progress && (
              <div className="group-report-preview-centered">
                <Loading message={`Gerando relatório ${progress.current}/${progress.total}: ${progress.name}...`} />
              </div>
            )}

            {!isGenerating && finished && (
              <div className="group-report-preview-centered">
                <div className="group-report-summary">
                  <div className="group-report-summary-icon">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3>Exportação concluída!</h3>
                  <p>{successCount} de {members.length} relatório(s) gerado(s) e baixado(s) em .zip.</p>
                  {skipped.length > 0 && (
                    <div className="group-report-skipped">
                      <p className="group-report-skipped-title">Sem avaliação cadastrada (ignorados):</p>
                      <ul>
                        {skipped.map(name => <li key={name}>{name}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isGenerating && !finished && isLoadingPreview && (
              <div className="group-report-preview-centered">
                <Loading message="Carregando prévias dos atletas..." />
              </div>
            )}

            {!isGenerating && !finished && !isLoadingPreview && previewReports.length === 0 && (
              <div className="group-report-preview-centered">
                <div className="group-report-intro">
                  <div className="group-report-intro-icon">
                    <UsersIcon size={40} />
                  </div>
                  <h3>{group.name}</h3>
                  <p>Nenhum atleta selecionado possui avaliação cadastrada para gerar relatório.</p>
                </div>
              </div>
            )}

            {!isGenerating && !finished && !isLoadingPreview && currentPreview && (
              <div className="group-report-preview-carousel">
                <div className="preview-athlete-label">{currentPreview.memberName}</div>

                <div className="group-report-preview-scroll">
                  <div key={currentPreview.memberId} className="preview-fade-in">
                    <ReportPaper
                      athlete={currentPreview.data.athlete}
                      currentEval={currentPreview.data.currentEval}
                      compareEval={currentPreview.data.compareEval}
                      currentMetrics={currentPreview.data.currentMetrics}
                      compareMetrics={currentPreview.data.compareMetrics}
                      formula={formula}
                      logos={logos}
                      selections={selections}
                      showGroupAverage={showGroupAverage}
                      groupAverageMetrics={groupAverageMetrics}
                    />
                  </div>
                </div>

                {previewReports.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="preview-nav-btn preview-nav-prev"
                      onClick={goToPrevPreview}
                      disabled={previewIndex === 0}
                      aria-label="Atleta anterior"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      className="preview-nav-btn preview-nav-next"
                      onClick={goToNextPreview}
                      disabled={previewIndex === previewReports.length - 1}
                      aria-label="Próximo atleta"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}

                <div className="preview-page-indicator" key={previewIndex}>
                  {previewIndex + 1} / {previewReports.length}
                </div>

                {previewSkipped.length > 0 && (
                  <div className="preview-skipped-banner" tabIndex={0}>
                    <AlertCircle size={13} /> {previewSkipped.length} sem avaliação (não {previewSkipped.length === 1 ? 'entrará' : 'entrarão'} no ZIP)
                    <div className="preview-skipped-tooltip">
                      <span className="preview-skipped-tooltip-title">Sem avaliação cadastrada</span>
                      <ul>
                        {previewSkipped.map(name => <li key={name}>{name}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: '-99999px', pointerEvents: 'none' }} aria-hidden="true">
        {renderData && (
          <ReportPaper
            ref={hiddenReportRef}
            athlete={renderData.athlete}
            currentEval={renderData.currentEval}
            compareEval={renderData.compareEval}
            currentMetrics={renderData.currentMetrics}
            compareMetrics={renderData.compareMetrics}
            formula={formula}
            logos={logos}
            selections={selections}
            showGroupAverage={showGroupAverage}
            groupAverageMetrics={groupAverageMetrics}
          />
        )}
      </div>
    </div>
  );
}
