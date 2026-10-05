import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Pencil, Trash2, ChevronDown, ChevronUp, Plus, ClipboardList } from 'lucide-react';
import type { Assessment } from '../types/assessment';
import './AssessmentListModal.css';

import type { Athlete } from '../types/athlete';

interface AssessmentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessments: Assessment[];
  athlete: Athlete;
  onDeleteAssessment: (id: string) => void;
  onEditAssessment: (id: string) => void;
}

export function AssessmentListModal({
  isOpen,
  onClose,
  assessments,
  athlete,
  onDeleteAssessment,
  onEditAssessment,
}: AssessmentListModalProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const [yyyy, mm, dd] = dateStr.split('T')[0].split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  const fmt = (v?: number, unit = '') =>
    v !== undefined && v !== null && v !== 0
      ? `${v.toFixed(2).replace('.', ',')} ${unit}`.trim()
      : '-';

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      onDeleteAssessment(confirmDeleteId);
      setConfirmDeleteId(null);
      if (expandedId === confirmDeleteId) setExpandedId(null);
    }
  };

  const renderDetail = (label: string, value: string) => (
    <div className="al-detail-item">
      <span className="al-detail-label">{label}</span>
      <span className="al-detail-value">{value}</span>
    </div>
  );

  const renderSkinfolds = (sf: Assessment['skinfolds']) => (
    <div className="al-detail-section">
      <h4 className="al-detail-section-title">Dobras Cutâneas (mm)</h4>
      <div className="al-detail-grid">
        {renderDetail('Tríceps D.', fmt(sf?.tricepsRight))}
        {renderDetail('Tríceps E.', fmt(sf?.tricepsLeft))}
        {renderDetail('Subescapular', fmt(sf?.subscapular))}
        {renderDetail('Tórax', fmt(sf?.chest))}
        {renderDetail('Subaxilar', fmt(sf?.midaxillary))}
        {renderDetail('Supra-ilíaca', fmt(sf?.suprailiac))}
        {renderDetail('Abdominal', fmt(sf?.abdominal))}
        {renderDetail('Coxa D.', fmt(sf?.thighRight))}
        {renderDetail('Coxa E.', fmt(sf?.thighLeft))}
        {renderDetail('Pantu. D.', fmt(sf?.calfRight))}
        {renderDetail('Pantu. E.', fmt(sf?.calfLeft))}
        {renderDetail('Crist. ilíaca', fmt(sf?.iliacCrest))}
        {renderDetail('Sup. Espin.', fmt(sf?.supraspinale))}
      </div>
    </div>
  );

  const renderCircumferences = (c: Assessment['circumferences']) => (
    <div className="al-detail-section">
      <h4 className="al-detail-section-title">Circunferências (cm)</h4>
      <div className="al-detail-grid">
        {renderDetail('Ombro', fmt(c?.shoulder))}
        {renderDetail('Peitoral', fmt(c?.chest))}
        {renderDetail('Braço D.', fmt(c?.armRight))}
        {renderDetail('Braço E.', fmt(c?.armLeft))}
        {renderDetail('Cintura', fmt(c?.waist))}
        {renderDetail('Abdômen', fmt(c?.abdomen))}
        {renderDetail('Quadril', fmt(c?.hip))}
        {renderDetail('Medial D.', fmt(c?.thighMidRight))}
        {renderDetail('Medial E.', fmt(c?.thighMidLeft))}
        {renderDetail('Pantu. D.', fmt(c?.calfRight))}
        {renderDetail('Pantu. E.', fmt(c?.calfLeft))}
        {renderDetail('D. Punho', fmt(c?.wristRight))}
        {renderDetail('D. Joelho', fmt(c?.kneeRight))}
        {renderDetail('D. Tornozelo', fmt((c as any)?.ankle))}
        {renderDetail('Envergadura', fmt((c as any)?.envergadura))}
      </div>
    </div>
  );

  return (
    <div className="al-overlay" onClick={onClose}>
      <div className="al-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="al-header">
          <div className="al-header-title">
            <ClipboardList size={20} />
            <h2>Histórico de Avaliações</h2>
          </div>
          <div className="al-header-actions">
            <button
              className="btn btn-primary al-new-btn"
              onClick={() => { onClose(); navigate(`/add-assessment/${athlete.id}`); }}
            >
              <Plus size={16} /> Nova Avaliação
            </button>
            <button className="al-close-btn" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="al-list">
          {assessments.length === 0 ? (
            <div className="al-empty">
              <p>Nenhuma avaliação cadastrada.</p>
            </div>
          ) : (
            assessments.map((a) => {
              const isExpanded = expandedId === a.id;
              return (
                <div key={a.id} className={`al-item ${isExpanded ? 'expanded' : ''}`}>
                  {/* Row */}
                  <div
                    className="al-item-row"
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  >
                    <div className="al-item-info">
                      <span className="al-item-date">{formatDate(a.date)}</span>
                      <span className="al-item-meta">
                        Peso: {fmt(a.weight, 'kg')} · Altura: {fmt(a.height, 'cm')}
                      </span>
                    </div>
                    <div className="al-item-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="al-action-btn al-edit"
                        title="Editar"
                        onClick={() => { onClose(); onEditAssessment(a.id); }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="al-action-btn al-delete"
                        title="Excluir"
                        onClick={() => setConfirmDeleteId(a.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                      <span className="al-chevron">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="al-item-detail">
                      <div className="al-detail-section">
                        <h4 className="al-detail-section-title">Medidas Gerais</h4>
                        <div className="al-detail-grid">
                          {renderDetail('Peso', fmt(a.weight, 'kg'))}
                          {renderDetail('Altura', fmt(a.height, 'cm'))}
                          {renderDetail('Alt. Sentado', fmt(a.sittingHeight, 'cm'))}
                        </div>
                      </div>
                      {renderSkinfolds(a.skinfolds)}
                      {renderCircumferences(a.circumferences)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDeleteId && (
        <div className="al-confirm-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="al-confirm-box">
            <div className="al-confirm-icon"><Trash2 size={28} /></div>
            <h3>Excluir Avaliação</h3>
            <p>Tem certeza que deseja excluir a avaliação de <strong>{formatDate(assessments.find(a => a.id === confirmDeleteId)?.date || '')}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="al-confirm-actions">
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }} onClick={handleConfirmDelete}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
