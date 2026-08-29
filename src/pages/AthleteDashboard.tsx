import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { useGroups } from '../hooks/useGroups';
import { AthletePhoto } from '../components/AthletePhoto';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { MetricCard } from '../components/MetricCard';
import { SearchableSelect, NEW_OPTION_PREFIX } from '../components/SearchableSelect';
import { ReportModal } from '../components/ReportModal';
import { ImportExcelModal } from '../components/ImportExcelModal';
import { Loading } from '../components/Loading';
import { AssessmentListModal } from '../components/AssessmentListModal';
import { 
  User2, Calendar, Target, Shield, Scale, Percent,
  Dumbbell, Activity, Plus, Ruler, ArrowUpRight,
  ArrowDownRight, Minus, Pencil, Trash2, Download,
  FileSpreadsheet, ClipboardList, Users, X, Check
} from 'lucide-react';
import * as Mapper from '../utils/mapper';
import { calculateMetrics } from '../utils/metrics';
import { useLocalStorage } from '../hooks/useLocalStorage';
import './AthleteDashboard.css';

export default function AthleteDashboard() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId?: string }>();
  const { athletes, getAthleteById, deleteAthlete, updateAthlete, searchAthletes, loadMoreAthletes, refreshAthletes, loading: athletesLoading } = useAthletes();
  const { groups, getGroupForAthlete, createGroup, addAthleteToGroup, removeAthleteFromGroup } = useGroups();

  // Don't auto-select athlete, require explicit selection
  const currentAthleteId = athleteId || null;
  const athlete = currentAthleteId ? getAthleteById(currentAthleteId) : null;

  // Mapeia os dados da API para o formato local usado nas fórmulas
  const mappedAthlete = useMemo(() => athlete ? Mapper.mapNewToOldAthlete(athlete) : null, [athlete]);
  const assessments = useMemo(() => {
    if (!athlete) return [];
    return athlete.physicalAssessments
      .map(pa => Mapper.mapPhysicalAssessmentToAssessment(pa, athlete.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [athlete]);

  const [selectedFormula, setSelectedFormula] = useLocalStorage<'pollock' | 'faulkner'>(
    '@BodyMetrics:selectedFormula',
    'pollock'
  );
  const [currentEvalId, setCurrentEvalId] = useState<string>('');
  const [compareEvalId, setCompareEvalId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dobras' | 'circunferencias'>('dobras');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssessmentListOpen, setIsAssessmentListOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [metricsPage, setMetricsPage] = useState<1 | 2 | 3>(1);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalValue, setGroupModalValue] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const currentGroup = athlete ? getGroupForAthlete(athlete.id) : undefined;

  const openGroupModal = () => {
    setGroupModalValue(currentGroup?.id || '');
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!athlete) return;
    setIsSavingGroup(true);
    try {
      if (groupModalValue.startsWith(NEW_OPTION_PREFIX)) {
        const newGroup = await createGroup(groupModalValue.slice(NEW_OPTION_PREFIX.length));
        await addAthleteToGroup(newGroup.id, athlete.id);
      } else if (groupModalValue && groupModalValue !== currentGroup?.id) {
        await addAthleteToGroup(groupModalValue, athlete.id);
      } else if (!groupModalValue && currentGroup) {
        await removeAthleteFromGroup(currentGroup.id, athlete.id);
      }
      setIsGroupModalOpen(false);
    } catch {
      alert('Não foi possível atualizar o grupo do atleta.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // Extracts YYYY-MM-DD and converts to DD/MM/YYYY without Date parsing to avoid timezone shifts
    const [yyyy, mm, dd] = dateStr.split('T')[0].split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleDeleteAthlete = async () => {
    if (!athlete) return;
    try {
      await deleteAthlete(athlete.id);
      setIsDeleteModalOpen(false);
      navigate('/dashboard');
    } catch (error) {
      alert('Erro ao deletar atleta.');
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (!athlete) return;
    try {
      const dateToDelete = id.replace('pa-', '');
      const updatedAssessments = athlete.physicalAssessments.filter(pa => pa.assessmentDate !== dateToDelete);
      
      const updateCommand = Mapper.mapAthleteToUpdateCommand(athlete);
      updateCommand.physicalAssessments = updatedAssessments;

      await updateAthlete(athlete.id, updateCommand);
    } catch (error) {
      alert('Erro ao deletar avaliação.');
    }
  };

  useEffect(() => {
    if (assessments.length > 0) {
      setCurrentEvalId(assessments[0].id);
      setCompareEvalId(assessments.length > 1 ? assessments[1].id : '');
    } else {
      setCurrentEvalId('');
      setCompareEvalId('');
    }
  }, [assessments.length, currentAthleteId]);

  const currentEval = assessments.find(a => a.id === currentEvalId);
  const compareEval = assessments.find(a => a.id === compareEvalId);

  const currentMetrics = calculateMetrics(currentEval, mappedAthlete, selectedFormula);
  const compareMetrics = calculateMetrics(compareEval, mappedAthlete, selectedFormula);

  const formatNumber = (val: any) => {
    if (val === null || val === undefined || isNaN(val) || typeof val !== 'number' || val <= 0) return '-';
    return val.toFixed(2).replace('.', ',');
  };

  const formatDpvc = (val: number, hasData: boolean) => {
    if (!hasData || val === null || val === undefined || isNaN(val)) return '-';
    return val.toFixed(2).replace('.', ',');
  };

  const getTrendUi = (currentVal: number | null | undefined, compareVal: number | null | undefined, inverseGood = false) => {
    if (compareVal === undefined || compareVal === null || currentVal === undefined || currentVal === null) return <span className="trend-neutral">-</span>;
    const diff = currentVal - compareVal;
    if (diff === 0) return <span className="trend-neutral"><Minus size={16} /> 0</span>;

    const isUp = diff > 0;
    const isGood = inverseGood ? !isUp : isUp;
    const className = isGood ? 'trend-good' : 'trend-bad';
    const Icon = isUp ? ArrowUpRight : ArrowDownRight;
    const sign = isUp ? '+' : '';

    return (
      <span className={className}>
        <Icon size={16} />
        {sign}{formatNumber(diff)}
      </span>
    );
  };

  const renderSymmetryCards = () => {
    if (!currentMetrics) return null;
    const { coxa, pantu, braco } = currentMetrics.simetria;
    const compareSimetria = compareMetrics?.simetria;
    const formatTrendValue = (value: number) => {
      const formatted = formatNumber(value);
      return formatted === '-' ? '-' : `${formatted} cm`;
    };

    const renderRow = (
      title: string,
      data: { d: number, e: number, diff: number },
      compareData?: { d: number, e: number, diff: number }
    ) => {
      const diffSign = data.d > data.e ? '+' : data.d < data.e ? '-' : '';
      const diffValue = formatNumber(data.diff);
      const diffDisplay = diffValue === '-' ? '-' : `${diffSign}${diffValue}`;
      return (
        <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <MetricCard
            icon={<Ruler size={24} />}
            title={`C/C ${title} D`}
            value={formatNumber(data.d)}
            unit="cm"
            trend={compareEval ? {
              direction: data.d > (compareData?.d ?? data.d) ? 'up' : data.d < (compareData?.d ?? data.d) ? 'down' : 'neutral',
              value: formatTrendValue(Math.abs(data.d - (compareData?.d ?? data.d))),
              text: 'vs. comparação',
              isGood: data.d > (compareData?.d ?? data.d)
            } : undefined}
          />
          <MetricCard
            icon={<Ruler size={24} />}
            title={`C/C ${title} E`}
            value={formatNumber(data.e)}
            unit="cm"
            trend={compareEval ? {
              direction: data.e > (compareData?.e ?? data.e) ? 'up' : data.e < (compareData?.e ?? data.e) ? 'down' : 'neutral',
              value: formatTrendValue(Math.abs(data.e - (compareData?.e ?? data.e))),
              text: 'vs. comparação',
              isGood: data.e > (compareData?.e ?? data.e)
            } : undefined}
          />
          <MetricCard
            icon={<Activity size={24} />}
            title="DIF D/E"
            value={diffDisplay}
            unit="cm"
            trend={compareEval ? {
              direction: data.diff > (compareData?.diff ?? data.diff) ? 'up' : data.diff < (compareData?.diff ?? data.diff) ? 'down' : 'neutral',
              value: formatTrendValue(Math.abs(data.diff - (compareData?.diff ?? data.diff))),
              text: 'vs. comparação',
              isGood: data.diff < (compareData?.diff ?? data.diff)
            } : undefined}
          />
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {renderRow('Coxa', coxa, compareSimetria?.coxa)}
        {renderRow('Panturrilha', pantu, compareSimetria?.pantu)}
        {renderRow('Braço', braco, compareSimetria?.braco)}
      </div>
    );
  };

  const renderRelationCards = () => {
    if (!currentMetrics) return null;
    const r = currentMetrics.relacao;

    const renderRow = (titleObj: string, titleOsso: string, media: number, osso: number, relacao: number) => (
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <MetricCard
          icon={<Ruler size={24} />}
          title={`Média ${titleObj}`}
          value={formatNumber(media)}
          unit="cm"
        />
        <MetricCard
          icon={<Shield size={24} />}
          title={`Osso ${titleOsso}`}
          value={formatNumber(osso)}
          unit="cm"
        />
        <MetricCard
          icon={<Activity size={24} />}
          title="Relação"
          value={formatNumber(relacao)}
          unit="índice"
        />
      </div>
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {renderRow('Coxa', 'Fêmur', r.ccCoxa, r.diamJoelho, r.coxa)}
        {renderRow('Panturrilha', 'Tornozelo', r.ccPantu, r.diamTornozelo, r.pantu)}
        {renderRow('Braço', 'Úmero', r.ccBraco, r.diamPunho, r.braco)}
      </div>
    );
  };

  const renderTableContent = (items: { label: string, cur: number | undefined, cmp: number | undefined, unit: string, inverseGood?: boolean }[]) => (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Medida</th>
            <th>Atual</th>
            {compareEval && <th>Comparação</th>}
            {compareEval && <th>Evolução</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.label}</td>
              <td style={{ color: item.cur && item.cur > 0 ? 'inherit' : 'var(--color-text-muted)' }}>
                {formatNumber(item.cur)} {item.cur != null && item.cur > 0 ? item.unit : ''}
              </td>
              {compareEval && (
                <td style={{ color: item.cmp && item.cmp > 0 ? 'inherit' : 'var(--color-text-muted)' }}>
                  {formatNumber(item.cmp)} {item.cmp != null && item.cmp > 0 ? item.unit : ''}
                </td>
              )}
              {compareEval && (
                <td>{getTrendUi(item.cur, item.cmp, item.inverseGood)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const currentAthleteOptions = useMemo(() => 
    athletes.map(a => ({ id: a.id, name: a.fullName })), 
  [athletes]);

  if (athletesLoading && athletes.length === 0 && !isImportModalOpen) {
    return <Loading fullScreen message="Carregando atletas..." />;
  }

  return (
    <div className="container dashboard-container">
      {athletes.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-bg-page)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', marginBottom: '0.5rem' }}>
            <User2 size={48} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)', margin: 0 }}>Nenhum Atleta Cadastrado</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 1rem', lineHeight: 1.5 }}>
            Para visualizar o dashboard e acompanhar as avaliações antropométricas, você precisa primeiro cadastrar um atleta no sistema.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/add" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} />
              Cadastrar Primeiro Atleta
            </Link>
            <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--color-bg-page)', border: 'none', color: 'var(--color-primary)' }}>
              <FileSpreadsheet size={20} />
              Importar Planilha
            </button>
          </div>
        </Card>
      ) : (
        <>
          <div className="athlete-selector-container">
            <SearchableSelect 
              options={currentAthleteOptions}
              value={currentAthleteId || ''}
              onChange={(id) => navigate(id ? `/dashboard/${id}` : '/dashboard')}
              placeholder="Selecione um Atleta..."
              onSearch={searchAthletes}
              onLoadMore={loadMoreAthletes}
            />
          </div>

          {!athlete ? (
            <Card style={{ textAlign: 'center', padding: '4rem 2rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ backgroundColor: 'var(--color-bg-page)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', marginBottom: '0.5rem' }}>
                <User2 size={48} color="var(--color-primary)" />
              </div>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)', margin: 0 }}>Selecione um Atleta</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 1rem', lineHeight: 1.5 }}>
                Utilize o menu acima para selecionar um atleta e visualizar seu dashboard de evolução antropométrica.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/add" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={20} />
                  Cadastrar Novo Atleta
                </Link>
                <button onClick={() => setIsImportModalOpen(true)} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: 'var(--color-bg-page)', border: 'none', color: 'var(--color-primary)' }}>
                  <FileSpreadsheet size={20} />
                  Importar Planilha
                </button>
              </div>
            </Card>
          ) : (
            <>
              <Card className="athlete-header-card">
                <div className="athlete-profile-section">
                  <div className="athlete-photo-container">
                    <AthletePhoto athlete={athlete} size={140} />
                    <div className="athlete-number-badge">
                      <span className="label">ATLETA</span>
                    </div>
                  </div>

                  <div className="athlete-info-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h1 className="athlete-name" style={{ margin: 0 }}>{athlete.fullName}</h1>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => setIsReportModalOpen(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem 0.8rem', border: 'none', backgroundColor: 'var(--color-bg-page)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500, fontSize: '0.875rem' }}
                          title="Exportar Relatório"
                        >
                          <Download size={18} /> Exportar Relatório
                        </button>
                        <button
                          onClick={() => navigate(`/edit/${athlete.id}`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', border: 'none', backgroundColor: 'var(--color-bg-page)', color: 'var(--color-primary)' }}
                          title="Editar Atleta"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', border: 'none', backgroundColor: '#fef2f2', color: '#dc2626' }}
                          title="Excluir Atleta"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button
                          onClick={openGroupModal}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', border: 'none', backgroundColor: 'var(--color-bg-page)', color: 'var(--color-primary)' }}
                          title="Gerenciar Grupo"
                        >
                          <Users size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="athlete-subtitle">Avaliação Antropométrica</p>

                    <div className="athlete-badges">
                      <Badge icon={Target} label="ESPORTE" value={athlete.sportName || '-'} />
                      {athlete.sector && (
                        <>
                          <div className="badge-divider"></div>
                          <Badge icon={User2} label="OBS." value={athlete.sector} />
                        </>
                      )}
                      <div className="badge-divider"></div>
                      <Badge icon={Shield} label="CATEGORIA" value={athlete.category} />
                      <div className="badge-divider"></div>
                      <Badge icon={User2} label="SEXO" value={Mapper.mapSexToLabel(athlete.sex) || '-'} />
                      <div className="badge-divider"></div>
                      <Badge icon={Calendar} label="DATA NASC." value={formatDate(athlete.birthDate)} />
                      <div className="badge-divider"></div>
                      <button className="group-badge-btn" onClick={openGroupModal} title="Gerenciar grupo">
                        <Badge icon={Users} label="GRUPO" value={currentGroup?.name || 'Avulso'} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="athlete-eval-summary">
                  {assessments.length > 0 ? (
                    <>
                      <div className="eval-item">
                        <Calendar className="eval-icon" size={24} />
                        <div className="eval-data">
                          <span className="eval-label">AVALIAÇÃO ATUAL</span>
                          <select
                            value={currentEvalId}
                            onChange={e => setCurrentEvalId(e.target.value)}
                            className="eval-select"
                          >
                            {assessments.map(a => (
                              <option key={a.id} value={a.id}>{formatDate(a.date)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="eval-divider"></div>
                      <div className="eval-item">
                        <Activity className="eval-icon" size={24} />
                        <div className="eval-data">
                          <span className="eval-label">COMPARAR COM</span>
                          <select
                            value={compareEvalId}
                            onChange={e => setCompareEvalId(e.target.value)}
                            className="eval-select"
                          >
                            <option value="">Selecione...</option>
                            {assessments.map(a => (
                              <option key={a.id} value={a.id}>{formatDate(a.date)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="eval-divider"></div>
                      <div className="eval-item">
                        <Percent className="eval-icon" size={24} />
                        <div className="eval-data">
                          <span className="eval-label">FÓRMULA %G</span>
                          <select
                            value={selectedFormula}
                            onChange={e => setSelectedFormula(e.target.value as 'pollock' | 'faulkner')}
                            className="eval-select"
                          >
                            <option value="pollock">Pollock</option>
                            <option value="faulkner">Faulkner</option>
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-evals-message">
                      <p>Nenhuma avaliação cadastrada.</p>
                    </div>
                  )}
                  <div className="eval-actions" style={{ marginTop: '0.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', border: 'none', backgroundColor: 'var(--color-bg-page)', color: 'var(--color-text-main)', fontWeight: 600 }}
                      onClick={() => setIsAssessmentListOpen(true)}
                    >
                      <ClipboardList size={18} /> Ver Avaliações
                    </button>
                    <Link to={`/add-assessment/${athlete.id}`} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', width: '100%' }}>
                      <Plus size={18} /> Nova Avaliação
                    </Link>
                  </div>
                </div>
              </Card>

              {currentMetrics && (
                <div className="dashboard-content-layout">
                  <div className="dashboard-metrics-column">
                    <div className="tabs-header">
                      <button className={`tab-btn ${metricsPage === 1 ? 'active' : ''}`} onClick={() => setMetricsPage(1)}>Composição Corporal</button>
                      <button className={`tab-btn ${metricsPage === 2 ? 'active' : ''}`} onClick={() => setMetricsPage(2)}>Índices de Simetria</button>
                      <button className={`tab-btn ${metricsPage === 3 ? 'active' : ''}`} onClick={() => setMetricsPage(3)}>Rel. Cineantropométrica</button>
                    </div>

                    {metricsPage === 1 && (
                      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                        <MetricCard
                          icon={<Scale size={24} />}
                          title="PESO CORPORAL"
                          value={formatNumber(currentMetrics.peso)}
                          unit="kg"
                          trend={compareEval ? {
                            direction: currentMetrics.peso > (compareMetrics || currentMetrics).peso ? 'up' : currentMetrics.peso < (compareMetrics || currentMetrics).peso ? 'down' : 'neutral',
                            value: `${formatNumber(Math.abs(currentMetrics.peso - (compareMetrics || currentMetrics).peso))} kg`,
                            text: 'vs. comparação',
                            isGood: currentMetrics.peso < (compareMetrics || currentMetrics).peso
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Ruler size={24} />}
                          title="ALTURA"
                          value={formatNumber(currentMetrics.altura)}
                          unit="cm"
                        />
                        <MetricCard
                          icon={<Percent size={24} />}
                          title="% GORDURA"
                          value={formatNumber(currentMetrics.percentualGordura)}
                          unit="%"
                          trend={compareEval ? {
                            direction: currentMetrics.percentualGordura > (compareMetrics || currentMetrics).percentualGordura ? 'up' : currentMetrics.percentualGordura < (compareMetrics || currentMetrics).percentualGordura ? 'down' : 'neutral',
                            value: `${formatNumber(Math.abs(currentMetrics.percentualGordura - (compareMetrics || currentMetrics).percentualGordura))} %`,
                            text: 'vs. comparação',
                            isGood: currentMetrics.percentualGordura < (compareMetrics || currentMetrics).percentualGordura
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Activity size={24} />}
                          title="SOMA DAS DOBRAS"
                          value={formatNumber(currentMetrics.sumDobras)}
                          unit="mm"
                          trend={compareEval ? {
                            direction: currentMetrics.sumDobras > (compareMetrics || currentMetrics).sumDobras ? 'up' : currentMetrics.sumDobras < (compareMetrics || currentMetrics).sumDobras ? 'down' : 'neutral',
                            value: `${formatNumber(Math.abs(currentMetrics.sumDobras - (compareMetrics || currentMetrics).sumDobras))} mm`,
                            text: 'vs. comparação',
                            isGood: currentMetrics.sumDobras < (compareMetrics || currentMetrics).sumDobras
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Shield size={24} />}
                          title="MASSA GORDA"
                          value={formatNumber(currentMetrics.gordura)}
                          unit="kg"
                          trend={compareEval ? {
                            direction: currentMetrics.gordura > (compareMetrics || currentMetrics).gordura ? 'up' : currentMetrics.gordura < (compareMetrics || currentMetrics).gordura ? 'down' : 'neutral',
                            value: `${formatNumber(Math.abs(currentMetrics.gordura - (compareMetrics || currentMetrics).gordura))} kg`,
                            text: 'vs. comparação',
                            isGood: currentMetrics.gordura < (compareMetrics || currentMetrics).gordura
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Dumbbell size={24} />}
                          title="MASSA LIVRE DE GORDURA"
                          value={formatNumber(currentMetrics.mlg)}
                          unit="kg"
                          trend={compareEval ? {
                            direction: currentMetrics.mlg > (compareMetrics || currentMetrics).mlg ? 'up' : currentMetrics.mlg < (compareMetrics || currentMetrics).mlg ? 'down' : 'neutral',
                            value: `${formatNumber(Math.abs(currentMetrics.mlg - (compareMetrics || currentMetrics).mlg))} kg`,
                            text: 'vs. comparação',
                            isGood: currentMetrics.mlg > (compareMetrics || currentMetrics).mlg
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Shield size={24} />}
                          title="MASSA ÓSSEA"
                          value={formatNumber(currentMetrics.ossos)}
                          unit="kg"
                        />
                        <MetricCard
                          icon={<Dumbbell size={24} />}
                          title="MASSA MUSCULAR"
                          value={formatNumber(currentMetrics.massaMuscular)}
                          unit="kg"
                          trend={compareEval ? {
                            direction: currentMetrics.massaMuscular > (compareMetrics || currentMetrics).massaMuscular ? 'up' : currentMetrics.massaMuscular < (compareMetrics || currentMetrics).massaMuscular ? 'down' : 'neutral',
                            value: `${formatNumber(Math.abs(currentMetrics.massaMuscular - (compareMetrics || currentMetrics).massaMuscular))} kg`,
                            text: 'vs. comparação',
                            isGood: currentMetrics.massaMuscular > (compareMetrics || currentMetrics).massaMuscular
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Activity size={24} />}
                          title="REL. MÚSCULO/OSSO"
                          value={formatNumber(currentMetrics.relacaoMusculoOsso)}
                          unit="índice"
                          trend={compareEval ? {
                            direction: currentMetrics.relacaoMusculoOsso > (compareMetrics || currentMetrics).relacaoMusculoOsso ? 'up' : currentMetrics.relacaoMusculoOsso < (compareMetrics || currentMetrics).relacaoMusculoOsso ? 'down' : 'neutral',
                            value: formatNumber(Math.abs(currentMetrics.relacaoMusculoOsso - (compareMetrics || currentMetrics).relacaoMusculoOsso)),
                            text: 'vs. comparação',
                            isGood: currentMetrics.relacaoMusculoOsso > (compareMetrics || currentMetrics).relacaoMusculoOsso
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Activity size={24} />}
                          title="REL. MÚSCULO/GORDURA"
                          value={formatNumber(currentMetrics.relacaoMusculoGordura)}
                          unit="índice"
                          trend={compareEval ? {
                            direction: currentMetrics.relacaoMusculoGordura > (compareMetrics || currentMetrics).relacaoMusculoGordura ? 'up' : currentMetrics.relacaoMusculoGordura < (compareMetrics || currentMetrics).relacaoMusculoGordura ? 'down' : 'neutral',
                            value: formatNumber(Math.abs(currentMetrics.relacaoMusculoGordura - (compareMetrics || currentMetrics).relacaoMusculoGordura)),
                            text: 'vs. comparação',
                            isGood: currentMetrics.relacaoMusculoGordura > (compareMetrics || currentMetrics).relacaoMusculoGordura
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Ruler size={24} />}
                          title="DPVC"
                          value={formatDpvc(currentMetrics.dpvc, currentMetrics.hasDpvc)}
                          unit=""
                          subtitle={currentMetrics.hasDpvc ? currentMetrics.statusPvc : undefined}
                          trend={compareEval && currentMetrics.hasDpvc && (compareMetrics || currentMetrics).hasDpvc ? {
                            direction: currentMetrics.dpvc > (compareMetrics || currentMetrics).dpvc ? 'up' : currentMetrics.dpvc < (compareMetrics || currentMetrics).dpvc ? 'down' : 'neutral',
                            value: formatDpvc(Math.abs(currentMetrics.dpvc - (compareMetrics || currentMetrics).dpvc), true),
                            text: 'vs. comparação',
                            isGood: currentMetrics.dpvc > (compareMetrics || currentMetrics).dpvc
                          } : undefined}
                        />
                        <MetricCard
                          icon={<Ruler size={24} />}
                          title="Altura Prevista"
                          value={currentMetrics.hasDpvc ? currentMetrics.alturaPrevista.toFixed(1).replace('.', ',') : '-'}
                          unit="cm"
                        />
                      </div>
                    )}

                    {metricsPage === 2 && renderSymmetryCards()}
                    {metricsPage === 3 && renderRelationCards()}
                  </div>

                  <div className="dashboard-tables-column">
                    <Card className="data-table-card" style={{ height: '100%' }}>
                      <div className="tabs-header">
                        <button className={`tab-btn ${activeTab === 'dobras' ? 'active' : ''}`} onClick={() => setActiveTab('dobras')}>Dobras</button>
                        <button className={`tab-btn ${activeTab === 'circunferencias' ? 'active' : ''}`} onClick={() => setActiveTab('circunferencias')}>Circunf.</button>
                      </div>

                      <div className="tab-content">
                        {activeTab === 'dobras' && renderTableContent([
                          { label: 'Tríceps Dir.', cur: currentEval?.skinfolds?.tricepsRight, cmp: compareEval?.skinfolds?.tricepsRight, unit: 'mm', inverseGood: true },
                          { label: 'Tríceps Esq.', cur: currentEval?.skinfolds?.tricepsLeft, cmp: compareEval?.skinfolds?.tricepsLeft, unit: 'mm', inverseGood: true },
                          { label: 'Subescapular', cur: currentEval?.skinfolds?.subscapular, cmp: compareEval?.skinfolds?.subscapular, unit: 'mm', inverseGood: true },
                          { label: 'Tórax', cur: currentEval?.skinfolds?.chest, cmp: compareEval?.skinfolds?.chest, unit: 'mm', inverseGood: true },
                          { label: 'Subaxilar', cur: currentEval?.skinfolds?.midaxillary, cmp: compareEval?.skinfolds?.midaxillary, unit: 'mm', inverseGood: true },
                          { label: 'Supra-ilíaca', cur: currentEval?.skinfolds?.suprailiac, cmp: compareEval?.skinfolds?.suprailiac, unit: 'mm', inverseGood: true },
                          { label: 'Abdominal', cur: currentEval?.skinfolds?.abdominal, cmp: compareEval?.skinfolds?.abdominal, unit: 'mm', inverseGood: true },
                          { label: 'Coxa Dir.', cur: currentEval?.skinfolds?.thighRight, cmp: compareEval?.skinfolds?.thighRight, unit: 'mm', inverseGood: true },
                          { label: 'Coxa Esq.', cur: currentEval?.skinfolds?.thighLeft, cmp: compareEval?.skinfolds?.thighLeft, unit: 'mm', inverseGood: true },
                          { label: 'Panturrilha Dir.', cur: currentEval?.skinfolds?.calfRight, cmp: compareEval?.skinfolds?.calfRight, unit: 'mm', inverseGood: true },
                          { label: 'Panturrilha Esq.', cur: currentEval?.skinfolds?.calfLeft, cmp: compareEval?.skinfolds?.calfLeft, unit: 'mm', inverseGood: true }
                        ])}

                        {activeTab === 'circunferencias' && renderTableContent([
                          { label: 'Ombro', cur: currentEval?.circumferences?.shoulder, cmp: compareEval?.circumferences?.shoulder, unit: 'cm' },
                          { label: 'Peitoral', cur: currentEval?.circumferences?.chest, cmp: compareEval?.circumferences?.chest, unit: 'cm' },
                          { label: 'Braço Dir.', cur: currentEval?.circumferences?.armRight, cmp: compareEval?.circumferences?.armRight, unit: 'cm' },
                          { label: 'Braço Esq.', cur: currentEval?.circumferences?.armLeft, cmp: compareEval?.circumferences?.armLeft, unit: 'cm' },
                          { label: 'Cintura', cur: currentEval?.circumferences?.waist, cmp: compareEval?.circumferences?.waist, unit: 'cm', inverseGood: true },
                          { label: 'Abdômen', cur: currentEval?.circumferences?.abdomen, cmp: compareEval?.circumferences?.abdomen, unit: 'cm', inverseGood: true },
                          { label: 'Quadril', cur: currentEval?.circumferences?.hip, cmp: compareEval?.circumferences?.hip, unit: 'cm' },
                          { label: 'Medial Dir.', cur: currentEval?.circumferences?.thighMidRight, cmp: compareEval?.circumferences?.thighMidRight, unit: 'cm' },
                          { label: 'Medial Esq.', cur: currentEval?.circumferences?.thighMidLeft, cmp: compareEval?.circumferences?.thighMidLeft, unit: 'cm' },
                          { label: 'Panturrilha Dir.', cur: currentEval?.circumferences?.calfRight, cmp: compareEval?.circumferences?.calfRight, unit: 'cm' },
                          { label: 'Panturrilha Esq.', cur: currentEval?.circumferences?.calfLeft, cmp: compareEval?.circumferences?.calfLeft, unit: 'cm' },
                          { label: 'D. Punho', cur: currentEval?.circumferences?.wristRight, cmp: compareEval?.circumferences?.wristRight, unit: 'cm' },
                          { label: 'D. Joelho', cur: currentEval?.circumferences?.kneeRight, cmp: compareEval?.circumferences?.kneeRight, unit: 'cm' },
                          { label: 'Envergadura', cur: currentEval?.circumferences?.envergadura, cmp: compareEval?.circumferences?.envergadura, unit: 'cm' }
                        ])}
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              <div className="footer-info">
                <Activity size={16} />
                <span>Os dados apresentados são referentes à avaliação selecionada. A tendência mostra a diferença para a avaliação de comparação.</span>
              </div>
            </>
          )}
        </>
      )}

      {/* Modals */}
      <ImportExcelModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={refreshAthletes}
      />

      {isDeleteModalOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <div className="delete-modal-icon">
              <Trash2 size={32} />
            </div>
            <h2 className="delete-modal-title">Excluir Atleta</h2>
            <p className="delete-modal-text">
              Tem certeza que deseja excluir <strong>{athlete?.fullName}</strong>? Esta ação removerá também todas as avaliações dele e não poderá ser desfeita.
            </p>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={handleDeleteAthlete}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isGroupModalOpen && athlete && (
        <div className="delete-modal-overlay" onClick={() => !isSavingGroup && setIsGroupModalOpen(false)}>
          <div className="delete-modal-content group-modal-content-wide" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-icon">
              <Users size={32} />
            </div>
            <h2 className="delete-modal-title">Grupo do Atleta</h2>
            <p className="delete-modal-text">
              Escolha um grupo para <strong>{athlete.fullName}</strong> ou limpe a seleção para deixá-lo avulso.
            </p>
            <div style={{ width: '100%', textAlign: 'left' }}>
              <SearchableSelect
                options={groups.map(g => ({ id: g.id, name: g.name }))}
                value={groupModalValue}
                onChange={setGroupModalValue}
                placeholder="Sem grupo — atleta avulso"
                creatable
                createLabel={(term) => `Criar grupo "${term}"`}
                disabled={isSavingGroup}
              />
            </div>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={() => setIsGroupModalOpen(false)} disabled={isSavingGroup}>
                <X size={16} /> Cancelar
              </button>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }} onClick={handleSaveGroup} disabled={isSavingGroup}>
                {isSavingGroup ? <Loading size="sm" variant="white" message="" /> : <><Check size={16} /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReportModalOpen && currentEval && athlete && (
        <ReportModal 
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          athlete={Mapper.mapNewToOldAthlete(athlete)}
          currentEval={currentEval}
          compareEval={compareEval}
          currentMetrics={currentMetrics!}
          compareMetrics={compareMetrics || undefined}
          formula={selectedFormula}
          athleteGroup={currentGroup}
        />
      )}

      {isAssessmentListOpen && athlete && (
        <AssessmentListModal
          isOpen={isAssessmentListOpen}
          onClose={() => setIsAssessmentListOpen(false)}
          athlete={Mapper.mapNewToOldAthlete(athlete)}
          assessments={assessments}
          onDeleteAssessment={handleDeleteAssessment}
          onEditAssessment={(id) => navigate(`/edit-assessment/${athlete.id}/${id}`)}
        />
      )}
    </div>
  );
}
