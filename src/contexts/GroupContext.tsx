import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import type { AthleteGroupViewModel } from '../types/api';
import { useAuth } from './AuthContext';

interface GroupContextType {
  groups: AthleteGroupViewModel[];
  loading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<AthleteGroupViewModel>;
  renameGroup: (id: string, name: string) => Promise<AthleteGroupViewModel>;
  deleteGroup: (id: string) => Promise<void>;
  addAthleteToGroup: (groupId: string, athleteId: string) => Promise<AthleteGroupViewModel>;
  removeAthleteFromGroup: (groupId: string, athleteId: string) => Promise<void>;
  getGroupForAthlete: (athleteId: string) => AthleteGroupViewModel | undefined;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<AthleteGroupViewModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [hasFetched, setHasFetched] = useState(false);
  const fetchingRef = React.useRef(false);

  const fetchGroups = useCallback(async () => {
    if (!user || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    try {
      const response = await apiService.listGroups();
      setGroups(response);
      setError(null);
      setHasFetched(true);
    } catch (err) {
      console.error('Erro ao buscar grupos:', err);
      setError('Não foi possível carregar os grupos.');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasFetched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
      fetchGroups();
    }
    if (!user) {
      setGroups([]);
      setHasFetched(false);
    }
  }, [user, fetchGroups, hasFetched]);

  const refreshGroups = useCallback(() => fetchGroups(), [fetchGroups]);

  const createGroup = useCallback(async (name: string) => {
    const group = await apiService.createGroup({ name });
    setGroups(prev => [group, ...prev]);
    return group;
  }, []);

  const renameGroup = useCallback(async (id: string, name: string) => {
    const group = await apiService.updateGroup(id, { id, name });
    setGroups(prev => prev.map(g => g.id === id ? group : g));
    return group;
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    await apiService.deleteGroup(id);
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  // Movendo/adicionando um atleta pode tirá-lo de outro grupo no servidor,
  // então recarregamos a lista inteira em vez de tentar remendar o cache local.
  const addAthleteToGroup = useCallback(async (groupId: string, athleteId: string) => {
    const group = await apiService.addAthleteToGroup(groupId, athleteId);
    await fetchGroups();
    return group;
  }, [fetchGroups]);

  const removeAthleteFromGroup = useCallback(async (groupId: string, athleteId: string) => {
    await apiService.removeAthleteFromGroup(groupId, athleteId);
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, members: g.members.filter(m => m.id !== athleteId) }
      : g
    ));
  }, []);

  const getGroupForAthlete = useCallback((athleteId: string) => {
    return groups.find(g => g.members.some(m => m.id === athleteId));
  }, [groups]);

  return (
    <GroupContext.Provider value={{
      groups,
      loading,
      error,
      refreshGroups,
      createGroup,
      renameGroup,
      deleteGroup,
      addAthleteToGroup,
      removeAthleteFromGroup,
      getGroupForAthlete
    }}>
      {children}
    </GroupContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context file intentionally exports its provider and hook together
export function useGroupContext() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
}
