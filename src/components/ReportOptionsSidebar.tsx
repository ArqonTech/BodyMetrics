import React, { useRef } from 'react';
import { Upload, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { ReportSelections } from '../types/report';

interface ReportOptionsSidebarProps {
  logos: string[];
  setLogos: React.Dispatch<React.SetStateAction<string[]>>;
  showGroupAverageToggle?: boolean;
  showGroupAverage: boolean;
  setShowGroupAverage: React.Dispatch<React.SetStateAction<boolean>>;
  selections: ReportSelections;
  setSelections: React.Dispatch<React.SetStateAction<ReportSelections>>;
  expandedSections: Record<string, boolean>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  footer: React.ReactNode;
}

const SECTION_LABELS: Record<keyof ReportSelections, string> = {
  composition: 'Composição Corporal',
  symmetry: 'Simetria',
  relations: 'Relações',
  skinfolds: 'Dobras Cutâneas',
  circumferences: 'Circunferências'
};

const SECTION_ITEMS: Record<keyof ReportSelections, { id: string; label: string }[]> = {
  composition: [
    { id: 'peso', label: 'Peso' }, { id: 'altura', label: 'Altura' },
    { id: 'percentualGordura', label: '% Gordura' }, { id: 'sumDobras', label: 'Soma Dobras' },
    { id: 'gordura', label: 'Massa Gorda' }, { id: 'mlg', label: 'MLG' },
    { id: 'ossos', label: 'Massa Óssea' }, { id: 'massaMuscular', label: 'Massa Muscular' },
    { id: 'relacaoMusculoOsso', label: 'Rel. Músculo/Osso' },
    { id: 'relacaoMusculoGordura', label: 'Rel. Músculo/Gordura' },
    { id: 'dpvc', label: 'DPVC' }, { id: 'alturaPrevista', label: 'Altura Prevista' }
  ],
  symmetry: [
    { id: 'Coxa', label: 'Coxa' }, { id: 'Panturrilha', label: 'Panturrilha' }, { id: 'Braço', label: 'Braço' }
  ],
  relations: [
    { id: 'Coxa / Fêmur', label: 'Coxa / Fêmur' },
    { id: 'Panturrilha / Tornozelo', label: 'Panturrilha / Tornozelo' },
    { id: 'Braço / Úmero', label: 'Braço / Úmero' }
  ],
  skinfolds: [
    { id: 'tricepsRight', label: 'Tríceps D.' }, { id: 'tricepsLeft', label: 'Tríceps E.' },
    { id: 'subscapular', label: 'Subesc.' }, { id: 'chest', label: 'Tórax' },
    { id: 'midaxillary', label: 'Subax.' }, { id: 'suprailiac', label: 'Supra-ilí.' },
    { id: 'abdominal', label: 'Abd.' }, { id: 'thighRight', label: 'Coxa D.' },
    { id: 'thighLeft', label: 'Coxa E.' }, { id: 'calfRight', label: 'Pantu. D.' },
    { id: 'calfLeft', label: 'Pantu. E.' }
  ],
  circumferences: [
    { id: 'shoulder', label: 'Ombro' }, { id: 'chest', label: 'Peitoral' },
    { id: 'armRight', label: 'Braço D.' }, { id: 'armLeft', label: 'Braço E.' },
    { id: 'waist', label: 'Cintura' }, { id: 'abdomen', label: 'Abdômen' }, { id: 'hip', label: 'Quadril' },
    { id: 'thighMidRight', label: 'Medial D.' }, { id: 'thighMidLeft', label: 'Medial E.' },
    { id: 'calfRight', label: 'Pantu. D.' }, { id: 'calfLeft', label: 'Pantu. E.' },
    { id: 'wristRight', label: 'D. Punho' }, { id: 'kneeRight', label: 'D. Joelho' },
    { id: 'ankle', label: 'D. Torno.' }, { id: 'envergadura', label: 'Envergadura' }
  ]
};

export function ReportOptionsSidebar({
  logos, setLogos, showGroupAverageToggle = true, showGroupAverage, setShowGroupAverage, selections, setSelections, expandedSections, setExpandedSections, footer
}: ReportOptionsSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setLogos(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeLogo = (index: number) => {
    setLogos(prev => prev.filter((_, i) => i !== index));
  };

  const moveLogo = (index: number, direction: 'left' | 'right') => {
    setLogos(prev => {
      const newLogos = [...prev];
      const swapIndex = direction === 'left' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= newLogos.length) return prev;
      [newLogos[index], newLogos[swapIndex]] = [newLogos[swapIndex], newLogos[index]];
      return newLogos;
    });
  };

  const toggleSectionExpand = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleAllInSection = (section: keyof ReportSelections, value: boolean) => {
    setSelections(prev => {
      const newItems = { ...prev[section].items };
      Object.keys(newItems).forEach(key => {
        newItems[key] = value;
      });
      return { ...prev, [section]: { ...prev[section], items: newItems } };
    });
  };

  const toggleItem = (section: keyof ReportSelections, itemKey: string) => {
    setSelections(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        items: { ...prev[section].items, [itemKey]: !prev[section].items[itemKey] }
      }
    }));
  };

  const isAnySelected = (section: keyof ReportSelections) => Object.values(selections[section].items).some(v => v);
  const allSelected = (section: keyof ReportSelections) => Object.values(selections[section].items).every(v => v);

  return (
    <div className="report-sidebar">
      <div className="logos-manager">
        <h3>Logos do Relatório</h3>
        <p>Adicione logos para o cabeçalho do relatório (PNG).</p>

        <div className="logos-list">
          {logos.map((logo, idx) => (
            <div key={idx} className="logo-item-wrapper">
              <img src={logo} alt={`Logo ${idx}`} className="logo-thumbnail" />
              <div className="logo-actions">
                <button onClick={() => moveLogo(idx, 'left')} disabled={idx === 0}><ChevronLeft size={16} /></button>
                <button onClick={() => removeLogo(idx)} className="btn-danger"><Trash2 size={16} /></button>
                <button onClick={() => moveLogo(idx, 'right')} disabled={idx === logos.length - 1}><ChevronRight size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        <input
          type="file"
          accept="image/png, image/jpeg"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button className="btn btn-secondary w-full" onClick={() => fileInputRef.current?.click()}>
          <Upload size={18} /> Adicionar Logo
        </button>
      </div>

      <div className="report-sections-manager">
        {showGroupAverageToggle && (
          <div className="report-toggle-row">
            <span className="report-toggle-label">Mostrar média do grupo nos cards</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={showGroupAverage}
                onChange={() => setShowGroupAverage(prev => !prev)}
              />
              <span className="switch-track"><span className="switch-thumb" /></span>
            </label>
          </div>
        )}

        <h3>Conteúdo do Relatório</h3>

        {(Object.keys(SECTION_LABELS) as (keyof ReportSelections)[]).map(section => (
          <div key={section} className={`section-control ${expandedSections[section] ? 'expanded' : ''}`}>
            <div className="section-control-header" onClick={() => toggleSectionExpand(section)}>
              <div className="section-title-with-badge">
                <strong>{SECTION_LABELS[section]}</strong>
                {isAnySelected(section) && <span className="selection-badge">{Object.values(selections[section].items).filter(v => v).length}</span>}
              </div>
              <div className="section-header-actions">
                <button className="btn-text" onClick={e => { e.stopPropagation(); toggleAllInSection(section, !allSelected(section)); }}>
                  {allSelected(section) ? 'Nenhum' : 'Todos'}
                </button>
                {expandedSections[section] ? <ChevronRight size={16} className="rotate-90" /> : <ChevronRight size={16} />}
              </div>
            </div>
            {expandedSections[section] && (
              <div className="items-control">
                {SECTION_ITEMS[section].map(item => (
                  <label key={item.id} className="item-checkbox">
                    <input type="checkbox" checked={!!selections[section].items[item.id]} onChange={() => toggleItem(section, item.id)} />
                    {item.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="report-actions">
        {footer}
      </div>
    </div>
  );
}
