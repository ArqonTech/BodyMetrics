import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import type { SportResponse } from '../types/api';
import { useAuth } from './AuthContext';

interface SportContextType {
  sports: SportResponse[];
  loading: boolean;
  error: string | null;
  refreshSports: () => Promise<void>;
  loadMoreSports: () => Promise<void>;
  addSport: (sport: SportResponse) => void;
  updateSportInCache: (sport: SportResponse) => void;
  hasMore: boolean;
}

const SportContext = createContext<SportContextType | undefined>(undefined);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [sports, setSports] = useState<SportResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [hasFetched, setHasFetched] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fetchingRef = React.useRef(false);

  const fetchSports = useCallback(async (pageNum: number = 1) => {
    if (!user || fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    try {
      const response = await apiService.listSports({ page: pageNum, pageSize: 20 });
      if (pageNum === 1) {
        setSports(response.items);
      } else {
        setSports(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          const newItems = response.items.filter(s => !existingIds.has(s.id));
          return [...prev, ...newItems];
        });
      }
      setPage(response.page);
      setTotalPages(response.totalPages);
      setError(null);
      setHasFetched(true);
    } catch (err) {
      console.error('Erro ao buscar esportes:', err);
      setError('Não foi possível carregar os esportes.');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user]);

  const loadMoreSports = useCallback(async () => {
    if (page < totalPages && !loading) {
      await fetchSports(page + 1);
    }
  }, [page, totalPages, loading, fetchSports]);

  useEffect(() => {
    if (user && !hasFetched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
      fetchSports();
    }
    if (!user) {
      setSports([]);
      setHasFetched(false);
    }
  }, [user, fetchSports, hasFetched]);

  const refreshSports = useCallback(() => fetchSports(1), [fetchSports]);

  const addSport = useCallback((sport: SportResponse) => {
    setSports(prev => [sport, ...prev.filter(s => s.id !== sport.id)]);
  }, []);

  const updateSportInCache = useCallback((sport: SportResponse) => {
    setSports(prev => prev.map(s => s.id === sport.id ? sport : s));
  }, []);

  return (
    <SportContext.Provider value={{
      sports,
      loading,
      error,
      refreshSports,
      loadMoreSports,
      addSport,
      updateSportInCache,
      hasMore: page < totalPages
    }}>
      {children}
    </SportContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context file intentionally exports its provider and hook together
export function useSports() {
  const context = useContext(SportContext);
  if (context === undefined) {
    throw new Error('useSports must be used within a SportProvider');
  }
  return context;
}
