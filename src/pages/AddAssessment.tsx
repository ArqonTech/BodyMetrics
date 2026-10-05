import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import * as ApiTypes from '../types/api';
import * as Mapper from '../utils/mapper';
import { Card } from '../components/Card';
import { DatePicker } from '../components/DatePicker';
import { Activity, Scale, Ruler, Droplets, User2, Calculator, AlertTriangle, AlertCircle } from 'lucide-react';
import { Loading } from '../components/Loading';
import './AddAssessment.css';

export default function AddAssessment() {
  const { athletes, getAthleteById, updateAthlete, loading: athletesLoading } = useAthletes();
  const navigate = useNavigate();
  const { athleteId, assessmentId } = useParams<{ athleteId?: string, assessmentId?: string }>();

  const isEditing = !!assessmentId;

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>(athleteId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useHeightCalc, setUseHeightCalc] = useState(false);
  const [benchHeight, setBenchHeight] = useState('');
  const [heightFlash, setHeightFlash] = useState(false);
  const [shakingFields, setShakingFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const shakeTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const errorTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const triggerShake = (name: string) => {
    setShakingFields(prev => {
      const next = new Set(prev);
      next.add(name);
      return next;
    });
    if (shakeTimeouts.current[name]) clearTimeout(shakeTimeouts.current[name]);
    shakeTimeouts.current[name] = setTimeout(() => {
      setShakingFields(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }, 420);
  };

  const flagInvalidInput = (name: string, message: string) => {
    triggerShake(name);
    setFieldErrors(prev => ({ ...prev, [name]: message }));
    if (errorTimeouts.current[name]) clearTimeout(errorTimeouts.current[name]);
    errorTimeouts.current[name] = setTimeout(() => {
      setFieldErrors(prev => {
        const rest = { ...prev };
        delete rest[name];
        return rest;
      });
    }, 2500);
  };

  useEffect(() => {
    const shakes = shakeTimeouts.current;
    const errors = errorTimeouts.current;
    return () => {
      Object.values(shakes).forEach(clearTimeout);
      Object.values(errors).forEach(clearTimeout);
    };
  }, []);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    height: '',
    sittingHeight: '',
    
    // Dobras
    tricepsRight: '', tricepsLeft: '',
    subscapular: '', chestSkinfold: '',
    midaxillary: '',
    abdominal: '', thighRightSkinfold: '',
    thighLeftSkinfold: '', calfRightSkinfold: '',
    calfLeftSkinfold: '', iliacCrest: '', supraspinale: '',

    // Circunferencias
    shoulder: '', chest: '',
    armRight: '', armLeft: '',
    waist: '', abdomen: '', hip: '',
    thighMidRight: '', thighMidLeft: '',
    calfRight: '', calfLeft: '',
    wristRight: '', kneeRight: '',
    ankle: '', envergadura: ''
  });

  const athlete = selectedAthleteId ? getAthleteById(selectedAthleteId) : null;

  const previousAssessment = useMemo(() => {
    if (!athlete || athlete.physicalAssessments.length === 0) return null;
    const sorted = athlete.physicalAssessments
      .map(pa => Mapper.mapPhysicalAssessmentToAssessment(pa, athlete.id))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (isEditing && assessmentId) {
      const dateToFind = assessmentId.startsWith('pa-') ? assessmentId.replace('pa-', '') : assessmentId;
      const currentIndex = sorted.findIndex(a => a.date === dateToFind);
      if (currentIndex !== -1 && currentIndex + 1 < sorted.length) {
        return sorted[currentIndex + 1];
      }
      return null;
    }
    return sorted[0] || null;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependency list is intentional; adding the missing dependency would re-run the effect
  }, [athlete, isEditing, assessmentId, selectedAthleteId]);

  const getPrevValue = (name: string): number | null => {
    if (!previousAssessment) return null;
    switch (name) {
      case 'weight': return previousAssessment.weight;
      case 'height': return previousAssessment.height;
      case 'sittingHeight': return previousAssessment.sittingHeight || null;
      // dobras
      case 'tricepsRight': return previousAssessment.skinfolds?.tricepsRight ?? null;
      case 'tricepsLeft': return previousAssessment.skinfolds?.tricepsLeft ?? null;
      case 'subscapular': return previousAssessment.skinfolds?.subscapular ?? null;
      case 'chestSkinfold': return previousAssessment.skinfolds?.chest ?? null;
      case 'midaxillary': return previousAssessment.skinfolds?.midaxillary ?? null;
      case 'abdominal': return previousAssessment.skinfolds?.abdominal ?? null;
      case 'thighRightSkinfold': return previousAssessment.skinfolds?.thighRight ?? null;
      case 'thighLeftSkinfold': return previousAssessment.skinfolds?.thighLeft ?? null;
      case 'calfRightSkinfold': return previousAssessment.skinfolds?.calfRight ?? null;
      case 'calfLeftSkinfold': return previousAssessment.skinfolds?.calfLeft ?? null;
      case 'iliacCrest': return previousAssessment.skinfolds?.iliacCrest ?? null;
      case 'supraspinale': return previousAssessment.skinfolds?.supraspinale ?? null;
      // circunferências
      case 'shoulder': return previousAssessment.circumferences?.shoulder ?? null;
      case 'chest': return previousAssessment.circumferences?.chest ?? null;
      case 'armRight': return previousAssessment.circumferences?.armRight ?? null;
      case 'armLeft': return previousAssessment.circumferences?.armLeft ?? null;
      case 'waist': return previousAssessment.circumferences?.waist ?? null;
      case 'abdomen': return previousAssessment.circumferences?.abdomen ?? null;
      case 'hip': return previousAssessment.circumferences?.hip ?? null;
      case 'thighMidRight': return previousAssessment.circumferences?.thighMidRight ?? null;
      case 'thighMidLeft': return previousAssessment.circumferences?.thighMidLeft ?? null;
      case 'calfRight': return previousAssessment.circumferences?.calfRight ?? null;
      case 'calfLeft': return previousAssessment.circumferences?.calfLeft ?? null;
      case 'wristRight': return previousAssessment.circumferences?.wristRight ?? null;
      case 'kneeRight': return previousAssessment.circumferences?.kneeRight ?? null;
      case 'ankle': return previousAssessment.circumferences?.ankle ?? null;
      case 'envergadura': return previousAssessment.circumferences?.envergadura ?? null;
      default: return null;
    }
  };

  const renderPreviousValueHint = (name: string, unit: string) => {
    const prevVal = getPrevValue(name);
    if (prevVal === null || prevVal === undefined) return null;

    return (
      <div className="prev-val-hint">
        <span>Anterior: {prevVal.toFixed(2).replace('.', ',')} {unit}</span>
      </div>
    );
  };

  useEffect(() => {
    if (athleteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
      setSelectedAthleteId(athleteId);
    } else if (athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependency list is intentional; adding the missing dependency would re-run the effect
  }, [athleteId, athletes]);

  useEffect(() => {
    if (assessmentId && athletes.length > 0) {
      const dateToFind = assessmentId.startsWith('pa-') ? assessmentId.replace('pa-', '') : assessmentId;
      
      let foundAthlete: ApiTypes.AthleteViewModel | undefined;
      let foundApiAssessment: ApiTypes.PhysicalAssessment | undefined;

      if (athleteId) {
        foundAthlete = athletes.find(a => a.id === athleteId);
        if (foundAthlete) {
          foundApiAssessment = foundAthlete.physicalAssessments.find(p => p.assessmentDate === dateToFind);
        }
      } else {
        // Fallback for backward compatibility
        for (const a of athletes) {
          const pa = a.physicalAssessments.find(p => p.assessmentDate === dateToFind);
          if (pa) {
            foundAthlete = a;
            foundApiAssessment = pa;
            break;
          }
        }
      }

      if (foundAthlete && foundApiAssessment) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
        setSelectedAthleteId(foundAthlete.id);
        const existing = Mapper.mapPhysicalAssessmentToAssessment(foundApiAssessment, foundAthlete.id);
        setFormData({
          date: existing.date,
          weight: existing.weight?.toString() || '',
          height: existing.height?.toString() || '',
          sittingHeight: existing.sittingHeight?.toString() || '',
          
          tricepsRight: existing.skinfolds?.tricepsRight?.toString() || '',
          tricepsLeft: existing.skinfolds?.tricepsLeft?.toString() || '',
          subscapular: existing.skinfolds?.subscapular?.toString() || '',
          chestSkinfold: existing.skinfolds?.chest?.toString() || '',
          midaxillary: existing.skinfolds?.midaxillary?.toString() || '',
          abdominal: existing.skinfolds?.abdominal?.toString() || '',
          thighRightSkinfold: existing.skinfolds?.thighRight?.toString() || '',
          thighLeftSkinfold: existing.skinfolds?.thighLeft?.toString() || '',
          calfRightSkinfold: existing.skinfolds?.calfRight?.toString() || '',
          calfLeftSkinfold: existing.skinfolds?.calfLeft?.toString() || '',
          iliacCrest: existing.skinfolds?.iliacCrest?.toString() || '',
          supraspinale: existing.skinfolds?.supraspinale?.toString() || '',

          shoulder: existing.circumferences?.shoulder?.toString() || '',
          chest: existing.circumferences?.chest?.toString() || '',
          armRight: existing.circumferences?.armRight?.toString() || '',
          armLeft: existing.circumferences?.armLeft?.toString() || '',
          waist: existing.circumferences?.waist?.toString() || '',
          abdomen: existing.circumferences?.abdomen?.toString() || '',
          hip: existing.circumferences?.hip?.toString() || '',
          thighMidRight: existing.circumferences?.thighMidRight?.toString() || '',
          thighMidLeft: existing.circumferences?.thighMidLeft?.toString() || '',
          calfRight: existing.circumferences?.calfRight?.toString() || '',
          calfLeft: existing.circumferences?.calfLeft?.toString() || '',
          wristRight: existing.circumferences?.wristRight?.toString() || '',
          kneeRight: existing.circumferences?.kneeRight?.toString() || '',
          ankle: existing.circumferences?.ankle?.toString() || '',
          envergadura: existing.circumferences?.envergadura?.toString() || ''
        });
      }
    }
  }, [assessmentId, athleteId, athletes]);

  const heightNum = parseFloat(formData.height);
  const benchNum = parseFloat(benchHeight);
  const hasBenchHeightConflict = useHeightCalc
    && benchHeight.trim() !== ''
    && !isNaN(heightNum) && !isNaN(benchNum)
    && benchNum >= heightNum;

  useEffect(() => {
    if (!useHeightCalc) return;
    const valid = !isNaN(heightNum) && !isNaN(benchNum) && (heightNum - benchNum) > 0;
    const computed = valid ? (heightNum - benchNum).toFixed(2) : '';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
    setFormData(prev => prev.sittingHeight === computed ? prev : { ...prev, sittingHeight: computed });
  }, [useHeightCalc, heightNum, benchNum]);

  useEffect(() => {
    if (!useHeightCalc || !formData.sittingHeight) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
    setHeightFlash(true);
    const timer = setTimeout(() => setHeightFlash(false), 600);
    return () => clearTimeout(timer);
  }, [formData.sittingHeight, useHeightCalc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
    if (hasBenchHeightConflict) triggerShake('benchHeight');
  }, [hasBenchHeightConflict]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name !== 'date' && value.includes('-')) {
      flagInvalidInput(name, 'O valor não pode ser negativo.');
      setFormData(prev => ({ ...prev, [name]: value.replace(/-/g, '') }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBenchHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value.includes('-')) {
      flagInvalidInput('benchHeight', 'O valor não pode ser negativo.');
      setBenchHeight(value.replace(/-/g, ''));
      return;
    }
    setBenchHeight(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthleteId) return;

    const hasAtLeastOneMeasurement = Object.entries(formData)
      .filter(([key]) => key !== 'date')
      .some(([, value]) => {
        if (value.trim() === '') return false;
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
      });

    if (!hasAtLeastOneMeasurement) {
      setShowEmptyModal(true);
      return;
    }

    if (hasBenchHeightConflict) {
      triggerShake('benchHeight');
      return;
    }

    setIsSubmitting(true);

    try {
      const athlete = getAthleteById(selectedAthleteId);
      if (!athlete) throw new Error('Atleta não encontrado');

      const parseNum = (val: string) => parseFloat(val) || 0;

      const newAssessment: ApiTypes.PhysicalAssessment = {
        assessmentDate: formData.date,
        generalMeasurements: {
          weightKg: parseNum(formData.weight),
          heightCm: parseNum(formData.height),
          sittingHeightCm: parseNum(formData.sittingHeight)
        },
        skinfolds: {
          rightTricepsMm: parseNum(formData.tricepsRight),
          leftTricepsMm: parseNum(formData.tricepsLeft),
          subscapularMm: parseNum(formData.subscapular),
          thoraxMm: parseNum(formData.chestSkinfold),
          subaxillaryMm: parseNum(formData.midaxillary),
          abdominalMm: parseNum(formData.abdominal),
          rightThighMm: parseNum(formData.thighRightSkinfold),
          leftThighMm: parseNum(formData.thighLeftSkinfold),
          rightCalfMm: parseNum(formData.calfRightSkinfold),
          leftCalfMm: parseNum(formData.calfLeftSkinfold),
          iliacCrestMm: parseNum(formData.iliacCrest),
          supraspinaleMm: parseNum(formData.supraspinale)
        },
        circumferences: {
          shoulderCm: parseNum(formData.shoulder),
          chestCm: parseNum(formData.chest),
          rightArmCm: parseNum(formData.armRight),
          leftArmCm: parseNum(formData.armLeft),
          waistCm: parseNum(formData.waist),
          abdominalCm: parseNum(formData.abdomen),
          hipCm: parseNum(formData.hip),
          rightMidThighCm: parseNum(formData.thighMidRight),
          leftMidThighCm: parseNum(formData.thighMidLeft),
          rightCalfCm: parseNum(formData.calfRight),
          leftCalfCm: parseNum(formData.calfLeft),
          rightWristCm: parseNum(formData.wristRight),
          rightKneeCm: parseNum(formData.kneeRight),
          rightAnkleCm: parseNum(formData.ankle),
          envergaduraCm: parseNum(formData.envergadura)
        }
      };

      const dateToFind = isEditing && assessmentId ? (assessmentId.startsWith('pa-') ? assessmentId.replace('pa-', '') : assessmentId) : null;

      let updatedAssessments = [...athlete.physicalAssessments];
      if (isEditing && dateToFind) {
        // Substitui a existente (procurando pela data original)
        updatedAssessments = updatedAssessments.map(pa => 
          pa.assessmentDate === dateToFind ? newAssessment : pa
        );
      } else {
        // Adiciona nova
        updatedAssessments.push(newAssessment);
      }

      const updateCommand = Mapper.mapAthleteToUpdateCommand(athlete);
      updateCommand.physicalAssessments = updatedAssessments;

      await updateAthlete(athlete.id, updateCommand);

      navigate(-1);
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      alert('Não foi possível salvar a avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (name: string, label: string, unit: string = '') => (
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <div className={unit ? "input-with-unit" : ""}>
        <input
          type="number"
          step="0.01"
          min="0"
          id={name}
          name={name}
          value={formData[name as keyof typeof formData]}
          onChange={handleChange}
          placeholder="0.00"
          className={shakingFields.has(name) ? 'input-shake input-error' : ''}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {fieldErrors[name] ? (
        <span className="field-error-text"><AlertCircle size={13} /> {fieldErrors[name]}</span>
      ) : renderPreviousValueHint(name, unit)}
    </div>
  );

  if (athletesLoading && athletes.length === 0) {
    return <Loading fullScreen message="Carregando atletas..." />;
  }

  if (athletes.length === 0) {
    return (
      <div className="container add-assessment-container">
        <div className="add-assessment-header">
          <h1>{isEditing ? 'Editar Avaliação' : 'Nova Avaliação Antropométrica'}</h1>
          <p>Registre ou atualize as medidas, dobras e circunferências do atleta.</p>
        </div>
        <Card style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--color-bg-page)', padding: '1rem', borderRadius: '50%', display: 'inline-flex', marginBottom: '0.5rem' }}>
            <User2 size={48} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)', margin: 0 }}>Nenhum Atleta Disponível</h2>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: '0 auto 1rem', lineHeight: 1.5 }}>
            Para registrar uma nova avaliação, é necessário ter pelo menos um atleta cadastrado no sistema.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/add')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Cadastrar Atleta
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container add-assessment-container">
      {isSubmitting && <Loading fullScreen message="Salvando avaliação..." />}
      <div className="add-assessment-header">
        <h1>{isEditing ? 'Editar Avaliação' : 'Nova Avaliação Antropométrica'}</h1>
        <p>Registre ou atualize as medidas, dobras e circunferências do atleta.</p>
      </div>

      <form onSubmit={handleSubmit} className="assessment-form-layout">
        
        <Card className="assessment-section-card">
          <div className="section-title" style={{ marginTop: 0 }}>
            <div className="section-icon-wrapper">
              <Activity size={20} />
            </div>
            Identificação e Data
          </div>
          <div className="grid-2-cols">
            <div className="form-group">
              <label htmlFor="athleteId">Atleta</label>
              <select 
                id="athleteId" 
                name="athleteId" 
                value={selectedAthleteId} 
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                disabled={isEditing}
              >
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.fullName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="date">Data da Avaliação</label>
              <div className="input-with-unit">
                <DatePicker 
                  id="date" 
                  name="date" 
                  value={formData.date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="assessment-section-card">
          <div className="section-title" style={{ marginTop: 0 }}>
            <div className="section-icon-wrapper">
              <Scale size={20} />
            </div>
            Medidas Gerais
          </div>
          <div className="grid-3-cols">
            {renderInput('weight', 'Peso', 'kg')}
            {renderInput('height', 'Altura', 'cm')}

            <div className="form-group">
              <div className="height-field-label">
                <label htmlFor="sittingHeight">Alt. Sentado</label>
                <button
                  type="button"
                  className={`calc-toggle ${useHeightCalc ? 'active' : ''}`}
                  onClick={() => setUseHeightCalc(v => !v)}
                >
                  <Calculator size={13} />
                  {useHeightCalc ? 'Usar manual' : 'Calcular via banco'}
                </button>
              </div>
              <div className="input-with-unit">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  id="sittingHeight"
                  name="sittingHeight"
                  value={formData.sittingHeight}
                  onChange={handleChange}
                  placeholder="0.00"
                  readOnly={useHeightCalc}
                  className={[
                    useHeightCalc ? 'computed-input' : '',
                    useHeightCalc && heightFlash ? 'flash' : '',
                    shakingFields.has('sittingHeight') ? 'input-shake input-error' : ''
                  ].filter(Boolean).join(' ')}
                />
                <span className="unit">cm</span>
              </div>
              {fieldErrors['sittingHeight'] ? (
                <span className="field-error-text"><AlertCircle size={13} /> {fieldErrors['sittingHeight']}</span>
              ) : renderPreviousValueHint('sittingHeight', 'cm')}
              <div className={`bench-height-reveal ${useHeightCalc ? 'open' : ''}`}>
                <div className="bench-height-inner">
                  <div className="bench-height-inner-content">
                    <label htmlFor="benchHeight" className="bench-label">Altura do Banco</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        id="benchHeight"
                        name="benchHeight"
                        value={benchHeight}
                        onChange={handleBenchHeightChange}
                        placeholder="0.00"
                        className={[
                          shakingFields.has('benchHeight') ? 'input-shake' : '',
                          (shakingFields.has('benchHeight') || hasBenchHeightConflict) ? 'input-error' : ''
                        ].filter(Boolean).join(' ')}
                      />
                      <span className="unit">cm</span>
                    </div>
                    {fieldErrors['benchHeight'] ? (
                      <span className="field-error-text">
                        <AlertCircle size={13} /> {fieldErrors['benchHeight']}
                      </span>
                    ) : hasBenchHeightConflict ? (
                      <span className="field-error-text">
                        <AlertCircle size={13} /> Altura do banco deve ser menor que a altura em pé.
                      </span>
                    ) : (
                      <span className="field-hint">Alt. Sentado = Altura - Banco</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="assessment-split-layout">
          <Card className="assessment-section-card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <div className="section-icon-wrapper">
                <Droplets size={20} />
              </div>
              Dobras Cutâneas
            </div>
            <div className="grid-3-cols">
              {renderInput('tricepsRight', 'Tríceps Dir.', 'mm')}
              {renderInput('tricepsLeft', 'Tríceps Esq.', 'mm')}
              {renderInput('subscapular', 'Subescapular', 'mm')}
              {renderInput('chestSkinfold', 'Tórax', 'mm')}
              {renderInput('midaxillary', 'Subaxilar', 'mm')}
              {renderInput('abdominal', 'Abdominal', 'mm')}
              {renderInput('thighRightSkinfold', 'Coxa Dir.', 'mm')}
              {renderInput('thighLeftSkinfold', 'Coxa Esq.', 'mm')}
              {renderInput('calfRightSkinfold', 'Panturrilha Dir.', 'mm')}
              {renderInput('calfLeftSkinfold', 'Panturrilha Esq.', 'mm')}
              {renderInput('iliacCrest', 'Crist. ilíaca', 'mm')}
              {renderInput('supraspinale', 'Sup. Espin.', 'mm')}
            </div>
          </Card>

          <Card className="assessment-section-card">
            <div className="section-title" style={{ marginTop: 0 }}>
              <div className="section-icon-wrapper">
                <Ruler size={20} />
              </div>
              Circunferências
            </div>
            <div className="grid-3-cols">
              {renderInput('shoulder', 'Ombro', 'cm')}
              {renderInput('chest', 'Peitoral', 'cm')}
              {renderInput('armRight', 'Braço Dir.', 'cm')}
              {renderInput('armLeft', 'Braço Esq.', 'cm')}
              {renderInput('waist', 'Cintura', 'cm')}
              {renderInput('abdomen', 'Abdômen', 'cm')}
              {renderInput('hip', 'Quadril', 'cm')}
              {renderInput('thighMidRight', 'Medial Dir.', 'cm')}
              {renderInput('thighMidLeft', 'Medial Esq.', 'cm')}
              {renderInput('calfRight', 'Pantu Dir.', 'cm')}
              {renderInput('calfLeft', 'Pantu Esq.', 'cm')}
              {renderInput('wristRight', 'D. Punho', 'cm')}
              {renderInput('kneeRight', 'D. Joelho', 'cm')}
              {renderInput('ankle', 'D. Tornozelo', 'cm')}
              {renderInput('envergadura', 'Envergadura', 'cm')}
            </div>
          </Card>
        </div>

        <div className="sticky-form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || athletes.length === 0}>
            {isSubmitting ? <Loading size="sm" variant="white" message="" /> : (isEditing ? 'Atualizar Avaliação' : 'Salvar Avaliação')}
          </button>
        </div>
      </form>

      {showEmptyModal && (
        <div className="assessment-modal-overlay" onClick={() => setShowEmptyModal(false)}>
          <div className="assessment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="assessment-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h2 className="assessment-modal-title">Nenhuma medida preenchida</h2>
            <p className="assessment-modal-text">
              Preencha pelo menos um campo com um valor maior que zero antes de salvar a avaliação.
            </p>
            <div className="assessment-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setShowEmptyModal(false)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
