import { useEffect, useState, useRef } from 'react';
import { X, Download } from 'lucide-react';
import { Loading } from './Loading';
import { ReportPaper } from './ReportPaper';
import { ReportOptionsSidebar } from './ReportOptionsSidebar';
import type { Assessment } from '../types/assessment';
import type { Athlete } from '../types/athlete';
import type { AthleteGroupViewModel } from '../types/api';
import { createDefaultReportSelections } from '../types/report';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { generatePdfFromNode } from '../utils/pdfReport';
import { calculateMetrics } from '../utils/metrics';
import type { AthleteMetrics } from '../utils/metrics';
import * as Mapper from '../utils/mapper';
import apiService from '../services/api.service';
import './ReportModal.css';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  athlete: Athlete;
  currentEval?: Assessment;
  compareEval?: Assessment;
  currentMetrics: any;
  compareMetrics: any;
  formula: 'pollock' | 'faulkner';
  athleteGroup?: AthleteGroupViewModel;
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

export function ReportModal({
  isOpen,
  onClose,
  athlete,
  currentEval,
  compareEval,
  currentMetrics,
  compareMetrics,
  formula,
  athleteGroup
}: ReportModalProps) {
  const [logos, setLogos] = useLocalStorage<string[]>('@BodyMetrics:reportLogos', []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGroupAverage, setShowGroupAverage] = useState(false);
  const [groupAverageMetrics, setGroupAverageMetrics] = useState<AthleteMetrics | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const [selections, setSelections] = useState(createDefaultReportSelections());

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    composition: true,
    symmetry: true,
    relations: true,
    skinfolds: false,
    circumferences: false
  });

  useEffect(() => {
    if (!isOpen || !athleteGroup) {
      setShowGroupAverage(false);
      setGroupAverageMetrics(null);
      return;
    }

    let cancelled = false;

    const loadGroupAverage = async () => {
      try {
        const metrics: AthleteMetrics[] = [];

        for (const member of athleteGroup.members) {
          const fullAthlete = await apiService.getAthleteById(member.id);
          const mappedAthlete = Mapper.mapNewToOldAthlete(fullAthlete);
          const assessments = fullAthlete.physicalAssessments
            .map(pa => Mapper.mapPhysicalAssessmentToAssessment(pa, fullAthlete.id))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          if (assessments.length === 0) continue;

          const athleteMetrics = calculateMetrics(assessments[0], mappedAthlete, formula);
          if (athleteMetrics) metrics.push(athleteMetrics);
        }

        if (!cancelled) {
          setGroupAverageMetrics(calculateGroupAverageMetrics(metrics));
        }
      } catch (error) {
        console.error('Erro ao calcular media do grupo no relatorio individual', error);
        if (!cancelled) {
          setGroupAverageMetrics(null);
        }
      }
    };

    loadGroupAverage();

    return () => {
      cancelled = true;
    };
  }, [isOpen, athleteGroup, formula]);

  if (!isOpen) return null;

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const pdf = await generatePdfFromNode(reportRef.current);
      pdf.save(`Relatorio_${athlete.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-container">
        <div className="report-modal-header">
          <h2>Exportar Relatório PDF</h2>
          <button className="btn-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="report-modal-content">
          {isGenerating && (
            <div className="report-loading-overlay">
              <Loading
                message="Gerando Relatório PDF. Processando imagens e tabelas... Isso pode levar alguns segundos."
              />
            </div>
          )}

          <ReportOptionsSidebar
            logos={logos}
            setLogos={setLogos}
            showGroupAverageToggle={!!athleteGroup}
            showGroupAverage={showGroupAverage}
            setShowGroupAverage={setShowGroupAverage}
            selections={selections}
            setSelections={setSelections}
            expandedSections={expandedSections}
            setExpandedSections={setExpandedSections}
            footer={
              <button className="btn btn-primary w-full" onClick={generatePDF} disabled={isGenerating}>
                {isGenerating ? 'Gerando...' : <><Download size={18} /> Baixar PDF</>}
              </button>
            }
          />

          <div className="report-preview-area">
            <ReportPaper
              ref={reportRef}
              athlete={athlete}
              currentEval={currentEval}
              compareEval={compareEval}
              currentMetrics={currentMetrics}
              compareMetrics={compareMetrics}
              formula={formula}
              logos={logos}
              selections={selections}
              showGroupAverage={showGroupAverage}
              groupAverageMetrics={showGroupAverage ? groupAverageMetrics : null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
