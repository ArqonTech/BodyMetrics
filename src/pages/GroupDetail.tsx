import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, Check, X, UserMinus, ArrowLeftRight, Users, FolderInput, Archive, FileText, SlidersHorizontal, RotateCcw
} from 'lucide-react';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { SearchableSelect } from '../components/SearchableSelect';
import { GroupReportModal } from '../components/GroupReportModal';
import { useGroups } from '../hooks/useGroups';
import apiService from '../services/api.service';
import type { AthleteViewModel } from '../types/api';
import { asApiError } from '../utils/apiError';
import './GroupDetail.css';

function getErrorMessage(err: unknown, fallback: string): string {
  const data = asApiError(err).response?.data;
  if (data?.errors) {
    return Object.values(data.errors).flat().join('. ');
  }
  return data?.detail || data?.title || fallback;
}

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, loading, renameGroup, deleteGroup, addAthleteToGroup, removeAthleteFromGroup, refreshGroups } = useGroups();

  const group = groups.find(g => g.id === groupId);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
  const [pendingMigrate, setPendingMigrate] = useState<{ athleteId: string; athleteName: string; targetGroupId: string; targetGroupName: string } | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [migratingMemberId, setMigratingMemberId] = useState<string | null>(null);
  const [migratePos, setMigratePos] = useState<{ top: number; right: number } | null>(null);
  const migrateMenuRef = useRef<HTMLDivElement>(null);

  const closeMigrateMenu = useCallback(() => {
    setMigratingMemberId(null);
    setMigratePos(null);
  }, []);

  const toggleMigrateMenu = (memberId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (migratingMemberId === memberId) {
      closeMigrateMenu();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setMigratePos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMigratingMemberId(memberId);
  };

  useEffect(() => {
    if (!migratingMemberId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.migrate-trigger-btn')) return;
      if (migrateMenuRef.current && !migrateMenuRef.current.contains(target)) {
        closeMigrateMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', closeMigrateMenu, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeMigrateMenu, true);
    };
  }, [migratingMemberId, closeMigrateMenu]);

  // Picker de atleta avulso para adicionar ao grupo
  const [athleteOptions, setAthleteOptions] = useState<AthleteViewModel[]>([]);
  const [athletePage, setAthletePage] = useState(1);
  const [athleteTotalPages, setAthleteTotalPages] = useState(1);
  const [pickerValue, setPickerValue] = useState('');
  const [isAddingAthlete, setIsAddingAthlete] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);

  const fetchUngroupedAthletes = useCallback(async (page: number, fullName?: string) => {
    const response = await apiService.listAthletes({ page, pageSize: 20, fullName });
    setAthleteOptions(prev => page === 1 ? response.items : [...prev, ...response.items.filter(a => !prev.some(p => p.id === a.id))]);
    setAthletePage(response.page);
    setAthleteTotalPages(response.totalPages);
  }, []);

  useEffect(() => {
    if (!groupId) return;
    if (!group) refreshGroups();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
    fetchUngroupedAthletes(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- dependency list is intentional; adding the missing dependency would re-run the effect
  }, [groupId]);

  const startEditName = () => {
    if (!group) return;
    setNameDraft(group.name);
    setNameError(null);
    setIsEditingName(true);
  };

  const saveEditName = async () => {
    const trimmed = nameDraft.trim();
    if (!group || !trimmed || trimmed === group.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    setNameError(null);
    try {
      await renameGroup(group.id, trimmed);
      setIsEditingName(false);
    } catch (err) {
      setNameError(getErrorMessage(err, 'Não foi possível renomear o grupo.'));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    try {
      await deleteGroup(group.id);
      navigate('/groups');
    } catch {
      alert('Não foi possível excluir o grupo.');
    }
  };

  const handleConfirmRemove = async () => {
    if (!group || !pendingRemove) return;
    const { id } = pendingRemove;
    setPendingRemove(null);
    setBusyMemberId(id);
    try {
      await removeAthleteFromGroup(group.id, id);
      fetchUngroupedAthletes(1);
    } catch (err) {
      alert(getErrorMessage(err, 'Não foi possível remover o atleta do grupo.'));
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleConfirmMigrate = async () => {
    if (!pendingMigrate) return;
    const { athleteId, targetGroupId } = pendingMigrate;
    setPendingMigrate(null);
    setBusyMemberId(athleteId);
    try {
      await addAthleteToGroup(targetGroupId, athleteId);
    } catch (err) {
      alert(getErrorMessage(err, 'Não foi possível mover o atleta.'));
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleAddAthlete = async (athleteId: string) => {
    if (!group || !athleteId) return;
    setIsAddingAthlete(true);
    try {
      await addAthleteToGroup(group.id, athleteId);
      setPickerValue('');
      fetchUngroupedAthletes(1);
    } catch (err) {
      alert(getErrorMessage(err, 'Não foi possível adicionar o atleta ao grupo.'));
    } finally {
      setIsAddingAthlete(false);
    }
  };

  if (loading && !group) {
    return <Loading fullScreen message="Carregando grupo..." />;
  }

  if (!group) {
    return (
      <div className="container group-detail-container">
        <Card className="group-not-found">
          <Users size={40} color="var(--color-text-light)" />
          <h2>Grupo não encontrado</h2>
          <p>Este grupo pode ter sido excluído.</p>
          <Link to="/groups" className="btn btn-primary">Voltar para Grupos</Link>
        </Card>
      </div>
    );
  }

  const otherGroups = groups.filter(g => g.id !== group.id);
  const sportOptions = Array.from(new Set(group.members.map(member => member.sportName).filter(Boolean))) as string[];
  const categoryOptions = Array.from(new Set(group.members.map(member => member.category).filter(Boolean))) as string[];
  const sectorOptions = Array.from(new Set(group.members.map(member => member.sector).filter(Boolean))) as string[];

  const toggleFilterValue = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
  };

  const clearFilters = () => {
    setSelectedSports([]);
    setSelectedCategories([]);
    setSelectedSectors([]);
  };

  const filteredMembers = group.members.filter(member => {
    const matchesSport = selectedSports.length === 0 || (!!member.sportName && selectedSports.includes(member.sportName));
    const matchesCategory = selectedCategories.length === 0 || (!!member.category && selectedCategories.includes(member.category));
    const matchesSector = selectedSectors.length === 0 || (!!member.sector && selectedSectors.includes(member.sector));
    return matchesSport && matchesCategory && matchesSector;
  });

  const activeFilterCount = selectedSports.length + selectedCategories.length + selectedSectors.length;
  const hasActiveFilters = activeFilterCount > 0;

  const renderFilterGroup = (
    label: string,
    options: string[],
    selectedValues: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (options.length === 0) return null;

    return (
      <div className="group-filter-block">
        <span className="group-filter-label">
          {label}
          {selectedValues.length > 0 && <span className="group-filter-count">{selectedValues.length}</span>}
        </span>
        <div className="group-filter-options">
          {options.map(option => {
            const isActive = selectedValues.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={`group-filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => toggleFilterValue(option, setter)}
              >
                {isActive && <Check size={13} className="group-filter-chip-check" />}
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="container group-detail-container">
      <button className="back-link" onClick={() => navigate('/groups')}>
        <ArrowLeft size={18} /> Voltar para Grupos
      </button>

      <Card className="group-detail-header">
        <div className="group-detail-title-row">
          <div className="group-detail-icon"><Users size={26} /></div>
          {isEditingName ? (
            <div className="group-name-edit-wrapper">
              <div className="group-name-edit">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEditName()}
                  disabled={isSavingName}
                />
                <button className="icon-btn icon-btn-confirm" onClick={saveEditName} disabled={isSavingName} title="Salvar">
                  <Check size={18} />
                </button>
                <button className="icon-btn" onClick={() => setIsEditingName(false)} disabled={isSavingName} title="Cancelar">
                  <X size={18} />
                </button>
              </div>
              {nameError && <p className="group-name-error">{nameError}</p>}
            </div>
          ) : (
            <div className="group-name-display">
              <h1>{group.name}</h1>
              <button className="icon-btn" onClick={startEditName} title="Renomear grupo">
                <Pencil size={16} />
              </button>
            </div>
          )}
          <button
            className="icon-btn"
            onClick={() => setIsReportModalOpen(true)}
            title="Exportar relatórios individuais (ZIP)"
            disabled={group.members.length === 0}
          >
            <Archive size={18} />
          </button>
          <button
            className="icon-btn"
            onClick={() => navigate(`/groups/${group.id}/simplified-report`, { state: { filteredMembers, groupName: group.name } })}
            title="Relatório resumido do grupo"
            disabled={group.members.length === 0}
          >
            <FileText size={18} />
          </button>
          <button className="icon-btn icon-btn-danger" onClick={() => setIsDeleteModalOpen(true)} title="Excluir grupo">
            <Trash2 size={18} />
          </button>
        </div>
        <p className="group-detail-subtitle">
          {filteredMembers.length} de {group.members.length} {group.members.length === 1 ? 'atleta' : 'atletas'} neste grupo
        </p>
      </Card>

      <Card className={`group-filters-card ${hasActiveFilters ? 'has-active-filters' : ''}`}>
        <div className="group-filters-header">
          <div className="group-filters-heading">
            <div className="group-filters-icon">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3>
                Filtros dos atletas
                {hasActiveFilters && <span className="group-filters-badge">{activeFilterCount}</span>}
              </h3>
              <p>Combine filtros por esporte, categoria e setor. A exportação usa exatamente esta seleção.</p>
            </div>
          </div>
          <button type="button" className="group-filters-clear-btn" onClick={clearFilters} disabled={!hasActiveFilters}>
            <RotateCcw size={14} /> Limpar filtros
          </button>
        </div>
        <div className="group-filters-grid">
          {renderFilterGroup('Esporte', sportOptions, selectedSports, setSelectedSports)}
          {renderFilterGroup('Categoria', categoryOptions, selectedCategories, setSelectedCategories)}
          {renderFilterGroup('Setor', sectorOptions, selectedSectors, setSelectedSectors)}
        </div>
      </Card>

      <Card className="group-add-athlete-card">
        <label className="add-athlete-label">Adicionar atleta avulso ao grupo</label>
        <div className="add-athlete-row">
          <SearchableSelect
            options={athleteOptions.map(a => ({ id: a.id, name: a.fullName }))}
            value={pickerValue}
            onChange={(id) => { setPickerValue(id); if (id) handleAddAthlete(id); }}
            onSearch={(term) => fetchUngroupedAthletes(1, term)}
            onLoadMore={() => { if (athletePage < athleteTotalPages) fetchUngroupedAthletes(athletePage + 1); }}
            placeholder="Buscar atleta sem grupo..."
            noOptionsMessage="Nenhum atleta avulso encontrado"
            disabled={isAddingAthlete}
          />
          {isAddingAthlete && <Loading size="sm" message="" />}
        </div>
      </Card>

      <Card className="group-members-card">
        {group.members.length === 0 ? (
          <div className="group-members-empty">
            <p>Nenhum atleta neste grupo ainda. Use o campo acima para adicionar.</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="group-members-empty">
            <p>Nenhum atleta corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <table className="group-members-table">
            <thead>
              <tr>
                <th>Atleta</th>
                <th></th>
                <th style={{ width: '1%' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member, index) => (
                <tr key={member.id} className="group-member-row" style={{ animationDelay: `${index * 30}ms` }}>
                  <td>
                    <Link to={`/dashboard/${member.id}`} className="member-name-link">{member.fullName}</Link>
                  </td>
                  <td>
                    <div className="member-tags">
                      {member.sportName && <span className="member-tag">{member.sportName}</span>}
                      {member.category && <span className="member-tag">{member.category}</span>}
                      {member.sector && <span className="member-tag">{member.sector}</span>}
                    </div>
                  </td>
                  <td>
                    <div className="member-actions">
                      <button
                        className={`icon-btn migrate-trigger-btn ${migratingMemberId === member.id ? 'icon-btn-active' : ''}`}
                        title="Mover para outro grupo"
                        disabled={busyMemberId === member.id || otherGroups.length === 0}
                        onClick={(e) => toggleMigrateMenu(member.id, e)}
                      >
                        <ArrowLeftRight size={16} />
                      </button>
                      <button
                        className="icon-btn icon-btn-danger"
                        title="Remover do grupo"
                        disabled={busyMemberId === member.id}
                        onClick={() => setPendingRemove({ id: member.id, name: member.fullName })}
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {migratingMemberId && migratePos && (
        <div
          className="migrate-menu"
          ref={migrateMenuRef}
          style={{ top: migratePos.top, right: migratePos.right }}
        >
          <div className="migrate-menu-header">
            <FolderInput size={13} /> Mover para
          </div>
          {otherGroups.map(g => (
            <button
              key={g.id}
              className="migrate-menu-item"
              disabled={busyMemberId === migratingMemberId}
              onClick={() => {
                const athleteName = group.members.find(m => m.id === migratingMemberId)?.fullName || '';
                setPendingMigrate({ athleteId: migratingMemberId, athleteName, targetGroupId: g.id, targetGroupName: g.name });
                closeMigrateMenu();
              }}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-content">
            <div className="delete-modal-icon">
              <Trash2 size={32} />
            </div>
            <h2 className="delete-modal-title">Excluir Grupo</h2>
            <p className="delete-modal-text">
              Tem certeza que deseja excluir <strong>{group.name}</strong>? Os {group.members.length} atleta(s) deste grupo voltarão a ficar avulsos.
            </p>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#dc2626' }} onClick={handleDeleteGroup}>Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {pendingRemove && (
        <div className="delete-modal-overlay" onClick={() => setPendingRemove(null)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <UserMinus size={32} />
            </div>
            <h2 className="delete-modal-title">Remover Atleta</h2>
            <p className="delete-modal-text">
              Remover <strong>{pendingRemove.name}</strong> do grupo <strong>{group.name}</strong>? O atleta ficará avulso.
            </p>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" onClick={() => setPendingRemove(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ backgroundColor: '#dc2626' }} onClick={handleConfirmRemove}>Sim, Remover</button>
            </div>
          </div>
        </div>
      )}

      {pendingMigrate && (
        <div className="delete-modal-overlay" onClick={() => setPendingMigrate(null)}>
          <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon migrate-modal-icon">
              <ArrowLeftRight size={32} />
            </div>
            <h2 className="delete-modal-title">Mover Atleta</h2>
            <p className="delete-modal-text">
              Mover <strong>{pendingMigrate.athleteName}</strong> para o grupo <strong>{pendingMigrate.targetGroupName}</strong>?
            </p>
            <div className="delete-modal-actions">
              <button className="btn btn-secondary" onClick={() => setPendingMigrate(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmMigrate}>Sim, Mover</button>
            </div>
          </div>
        </div>
      )}
      {isReportModalOpen && (
        <GroupReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          group={group}
          filteredMembers={filteredMembers}
        />
      )}
    </div>
  );
}
