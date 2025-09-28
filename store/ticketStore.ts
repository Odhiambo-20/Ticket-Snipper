import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';

export interface Show {
  id: string;
  title: string;
  artist: string;
  date: string;
  venue: string;
  saleTime: string;
  ticketUrl: string;
  preferences: {
    section: string;
    maxPrice: number;
    quantity: number;
  };
  isActive: boolean;
}

export const [TicketProvider, useTicketStore] = createContextHook(() => {
  const [shows, setShows] = useState<Show[]>([]);

  const activeSnipes = useMemo(() => shows.filter(show => show.isActive).length, [shows]);

  const addShow = useCallback((show: Show) => {
    setShows(prev => [...prev, show]);
  }, []);

  const removeShow = useCallback((id: string) => {
    setShows(prev => prev.filter(show => show.id !== id));
  }, []);

  const toggleSnipe = useCallback((id: string) => {
    setShows(prev => prev.map(show =>
      show.id === id ? { ...show, isActive: !show.isActive } : show
    ));
  }, []);

  const updateShow = useCallback((id: string, updates: Partial<Show>) => {
    setShows(prev => prev.map(show =>
      show.id === id ? { ...show, ...updates } : show
    ));
  }, []);

  return useMemo(() => ({
    shows,
    activeSnipes,
    addShow,
    removeShow,
    toggleSnipe,
    updateShow,
  }), [shows, activeSnipes, addShow, removeShow, toggleSnipe, updateShow]);
});