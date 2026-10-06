import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, ChevronRight, UsersRound } from 'lucide-react';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { useGroups } from '../hooks/useGroups';
import { asApiError } from '../utils/apiError';
import './GroupsList.css';

export default function GroupsList() {
  const navigate = useNavigate();
  const { groups, loading, error, createGroup } = useGroups();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = () => {
    setName('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      const group = await createGroup(trimmed);
      setIsModalOpen(false);
      navigate(`/groups/${group.id}`);
    } catch (err) {
      const data = asApiError(err).response?.data;
      let msg = 'Não foi possível criar o grupo. Tente outro nome.';
      if (data?.errors) {
        msg = Object.values(data.errors).flat().join('. ');
      } else {
        msg = data?.detail || data?.title || msg;
      }
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = (fullName: string) =>
    fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  if (loading && groups.length === 0) {
    return <Loading fullScreen message="Carregando grupos..." />;
  }

  return (
    <div className="container groups-container">
      <div className="groups-header">
        <div>
          <h1>Grupos</h1>
          <p>Organize seus atletas em times ou grupos de treino.</p>
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={20} /> Novo Grupo
        </button>
      </div>

      {error && <p className="groups-error">{error}</p>}

      {groups.length === 0 ? (
        <Card className="groups-empty-state">
          <div className="groups-empty-icon">
            <UsersRound size={48} color="var(--color-primary)" />
          </div>
          <h2>Nenhum grupo criado</h2>
          <p>Crie um grupo para organizar seus atletas em times, agrupá-los por categoria ou fase de treino.</p>
          <button className="btn btn-primary" onClick={openModal}>
            <Plus size={20} /> Criar Primeiro Grupo
          </button>
        </Card>
      ) : (
        <div className="groups-grid">
          {groups.map((group, index) => (
            <Card
              key={group.id}
              className="group-card"
              style={{ animationDelay: `${index * 40}ms` }}
              onClick={() => navigate(`/groups/${group.id}`)}
            >
              <div className="group-card-header">
                <div className="group-card-icon">
                  <Users size={22} />
                </div>
                <ChevronRight className="group-card-arrow" size={20} />
              </div>
              <h3 className="group-card-name">{group.name}</h3>
              <p className="group-card-count">{group.members.length} {group.members.length === 1 ? 'atleta' : 'atletas'}</p>
              {group.members.length > 0 && (
                <div className="group-card-avatars">
                  {group.members.slice(0, 5).map(m => (
                    <div key={m.id} className="group-avatar" title={m.fullName}>{initials(m.fullName)}</div>
                  ))}
                  {group.members.length > 5 && (
                    <div className="group-avatar group-avatar-more">+{group.members.length - 5}</div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="group-modal-overlay" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="group-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="group-modal-header">
              <h2>Novo Grupo</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="group-modal-form">
              <label htmlFor="group-name">Nome do grupo</label>
              <input
                id="group-name"
                type="text"
                autoFocus
                placeholder="Ex: Sub-20, Time A, Elenco Principal..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
              {formError && <p className="group-modal-error">{formError}</p>}
              <div className="group-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? <Loading size="sm" variant="white" message="" /> : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
