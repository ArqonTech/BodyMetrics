import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Loading } from './Loading';
import { useAthletes } from '../hooks/useAthletes';
import type { AthleteSpreadsheetImportViewModel } from '../types/api';
import { useSports } from '../contexts/SportContext';
import { useGroups } from '../hooks/useGroups';
import { SearchableSelect, NEW_OPTION_PREFIX } from './SearchableSelect';
import { asApiError } from '../utils/apiError';
import './ImportExcelModal.css';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (firstAthleteId?: string) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { importAthletes } = useAthletes();
  const { sports, refreshSports } = useSports();
  const { refreshGroups } = useGroups();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [sportValue, setSportValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<AthleteSpreadsheetImportViewModel | null>(null);
  const [previewData, setPreviewData] = useState<{ headers: string[], rows: Record<string, unknown>[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sportName = sportValue.startsWith(NEW_OPTION_PREFIX) ? sportValue.slice(NEW_OPTION_PREFIX.length) : sportValue;

  useEffect(() => {
    if (isOpen) {
      refreshSports();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
      setSelectedFile(null);
      setError(null);
      setSuccess(false);
      setIsProcessing(false);
      setSportValue('');
      setImportResult(null);
      setPreviewData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependency list is intentional; adding the missing dependency would re-run the effect
  }, [isOpen]);

  if (!isOpen) return null;

  const processFile = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setPreviewData(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '', range: 0 });
        
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          setPreviewData({
            headers,
            rows: rows.slice(0, 10)
          });
        }
      } catch (err) {
        console.error("Erro ao gerar preview:", err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    // Sempre reseta o element.value para permitir que o usuário selecione o MESMO arquivo novamente sem bugar
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !sportName.trim()) {
      setError("Por favor, selecione um esporte e um arquivo.");
      return;
    }
    setIsProcessing(true);
    setError(null);

    try {
      const result = await importAthletes(sportName.trim(), selectedFile);
      setImportResult(result);
      setSuccess(true);
      // Atualiza esportes e grupos, caso novos tenham sido criados durante a importação
      refreshSports();
      refreshGroups();
      
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 3000);

    } catch (err) {
      const apiError = asApiError(err);
      const data = apiError.response?.data;
      let msg = "Ocorreu um erro ao salvar os dados.";
      
      if (data?.errors) {
        // Extrai todas as mensagens de erro do objeto 'errors' da API
        msg = Object.values(data.errors).flat().join(". ");
      } else {
        msg = data?.detail || data?.title || msg;
      }
      
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelAndReset = () => {
    setSelectedFile(null);
    setError(null);
    setSportValue('');
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="import-modal-overlay" onClick={onClose}>
      <div className={`import-modal-content ${previewData ? 'modal-expanded' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h2 className="import-modal-title">
            <FileSpreadsheet className="text-primary" /> 
            Importar Histórico (Excel)
          </h2>
          <button className="close-btn" onClick={onClose} disabled={isProcessing}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="import-error-banner" style={{ margin: '0 1.5rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={20} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Erro ao importar o arquivo, tente novamente.</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.85, lineHeight: '1.2' }}>{error}</span>
            </div>
          </div>
        )}

        {success ? (
          <div className="import-summary" style={{ textAlign: 'center', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div className="success-icon-container" style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '50%', color: '#15803d' }}>
              <CheckCircle2 size={48} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ color: 'var(--color-text-main)', margin: 0, fontSize: '1.5rem' }}>Importação Finalizada!</h3>
              <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>A planilha foi processada com sucesso.</p>
            </div>
            
            {importResult && (
              <div className="import-stats-grid" style={{ display: 'grid', gridTemplateColumns: importResult.createdGroups > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '1rem', width: '100%', maxWidth: importResult.createdGroups > 0 ? '520px' : '400px' }}>
                <div className="stat-item" style={{ backgroundColor: 'var(--color-bg-page)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{importResult.createdAthletes}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Atletas Criados</span>
                </div>
                <div className="stat-item" style={{ backgroundColor: 'var(--color-bg-page)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                  <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{importResult.importedAssessments}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Avaliações</span>
                </div>
                {importResult.createdGroups > 0 && (
                  <div className="stat-item" style={{ backgroundColor: 'var(--color-bg-page)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{importResult.createdGroups}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Grupos Criados</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              <Loading size="sm" message="" />
              <span>Redirecionando para o dashboard...</span>
            </div>
          </div>
        ) : (
          <div className="import-flow-container">
            <div className="import-form-section" style={{ padding: '0 1.5rem 1.5rem' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                Esporte <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <SearchableSelect
                options={sports.map(s => ({ id: s.name, name: s.name }))}
                value={sportValue}
                onChange={setSportValue}
                placeholder="Selecione ou digite o esporte..."
                creatable
                createLabel={(term) => `Criar esporte "${term}"`}
              />
              <p className={`sport-field-hint ${sportName ? '' : 'sport-field-hint-required'}`}>
                {!sportName && <AlertCircle size={14} />}
                {sportName ? 'Você pode escolher um esporte existente ou cadastrar um novo apenas digitando o nome.' : 'O campo Esporte é obrigatório para iniciar a importação.'}
              </p>
              <p className="sport-field-hint">
                Dica: inclua uma coluna opcional <strong>"Time"</strong> na planilha para agrupar automaticamente os atletas importados em grupos.
              </p>
            </div>

            <div 
              className={`import-dropzone ${isDragging ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              style={{ margin: '0 1.5rem 1.5rem', cursor: isProcessing ? 'not-allowed' : 'pointer' }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
              />
              <div className="import-dropzone-icon">
                {isProcessing ? (
                  <Loading size="sm" message="" />
                ) : selectedFile ? (
                  <CheckCircle2 size={32} style={{ color: 'var(--color-primary)' }} />
                ) : (
                  <Upload size={32} />
                )}
              </div>
              <p className="import-dropzone-text">
                {isProcessing ? 'Enviando para o servidor...' : selectedFile ? selectedFile.name : 'Arraste e solte o arquivo Excel aqui'}
              </p>
              {!isProcessing && !selectedFile && (
                <p className="import-dropzone-subtext">ou clique para procurar (.xlsx ou .xls)</p>
              )}
            </div>

            {previewData && !isProcessing && (
              <div className="import-preview-section" style={{ padding: '0 1.5rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 className="import-preview-title">Pré-visualização (10 primeiras linhas)</h4>
                </div>
                <div className="import-preview-scroll">
                  <table className="import-preview-table">
                    <thead>
                      <tr>
                        {previewData.headers.map((h, i) => <th key={i}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rIndex) => (
                        <tr key={rIndex}>
                          {previewData.headers.map((h, cIndex) => {
                            let cellData = row[h];
                            if (cellData instanceof Date) {
                              cellData = cellData.toLocaleDateString();
                            }
                            return <td key={cIndex}>{String(cellData !== undefined && cellData !== null ? cellData : '')}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="import-modal-actions" style={{ padding: '1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={selectedFile ? cancelAndReset : onClose}
                disabled={isProcessing}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                {selectedFile ? 'Trocar Arquivo' : 'Cancelar'}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport}
                disabled={isProcessing || !selectedFile || !sportName.trim()}
                style={{ minWidth: '180px', padding: '0.75rem 1.5rem' }}
              >
                {isProcessing ? <Loading size="sm" variant="white" message="" /> : <FileSpreadsheet size={20} />}
                {isProcessing ? 'Processando...' : 'Iniciar Importação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
