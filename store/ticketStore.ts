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
  paymentMethod?: 'stripe' | 'paypal';
  isActive: boolean;
  automationState?: 'waiting' | 'running' | 'stopped';
  automationResult?: {
    success: boolean;
    message: string;
    timestamp?: number;
    transactionId?: string;
  };
}

export type ActivityStatus = 'scheduled' | 'success' | 'failed' | 'added' | 'viewed';

export interface Activity {
  id: string;
  action: string;
  show: string;
  showId: string;
  timestamp: number;
  status: ActivityStatus;
}

export const [TicketProvider, useTicketStore] = createContextHook(() => {
  const [shows, setShows] = useState<Show[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const activeSnipes = useMemo(() => shows.filter(show => show.isActive).length, [shows]);

  const addActivity = useCallback((action: string, show: string, showId: string, status: ActivityStatus) => {
    const newActivity: Activity = {
      id: `activity-${Date.now()}-${Math.random()}`,
      action,
      show,
      showId,
      timestamp: Date.now(),
      status,
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 20));
  }, []);

  const addShow = useCallback((show: Show) => {
    setShows(prev => {
      // Prevent duplicate shows by checking id
      if (prev.some(s => s.id === show.id)) {
        return prev;
      }
      return [...prev, show];
    });
    addActivity('Show added', `${show.artist} - ${show.title}`, show.id, 'added');
  }, [addActivity]);

  const removeShow = useCallback((id: string) => {
    const show = shows.find(s => s.id === id);
    setShows(prev => prev.filter(show => show.id !== id));
    if (show) {
      addActivity('Show removed', `${show.artist} - ${show.title}`, show.id, 'failed');
    }
  }, [shows, addActivity]);

  const toggleSnipe = useCallback((id: string) => {
    const show = shows.find(s => s.id === id);
    if (show) {
      const newActiveState = !show.isActive;
      setShows(prev => prev.map(s =>
        s.id === id ? { ...s, isActive: newActiveState } : s
      ));
      addActivity(
        newActiveState ? 'Snipe scheduled' : 'Snipe cancelled',
        `${show.artist} - ${show.title}`,
        show.id,
        newActiveState ? 'scheduled' : 'failed'
      );
    }
  }, [shows, addActivity]);

  const toggleMultipleSnipes = useCallback((showIds: string[]) => {
    setShows(prev => prev.map(s =>
      showIds.includes(s.id) ? { ...s, isActive: true } : s
    ));
    showIds.forEach(id => {
      const show = shows.find(s => s.id === id);
      if (show && !show.isActive) {
        addActivity('Snipe scheduled', `${show.artist} - ${show.title}`, show.id, 'scheduled');
      }
    });
  }, [shows, addActivity]);

  const updateShow = useCallback((id: string, updates: Partial<Show>) => {
    setShows(prev => prev.map(show =>
      show.id === id ? { ...show, ...updates } : show
    ));
  }, []);

  const updateAutomationState = useCallback((showId: string, state: 'waiting' | 'running' | 'stopped') => {
    setShows(prev => prev.map(show =>
      show.id === showId ? { ...show, automationState: state } : show
    ));
    const show = shows.find(s => s.id === showId);
    if (show) {
      const statusMap = {
        waiting: 'scheduled' as ActivityStatus,
        running: 'scheduled' as ActivityStatus,
        stopped: 'failed' as ActivityStatus,
      };
      addActivity(
        `Automation ${state}`,
        `${show.artist} - ${show.title}`,
        showId,
        statusMap[state]
      );
    }
  }, [shows, addActivity]);

  const updateAutomationResult = useCallback((showId: string, result: { success: boolean; message: string; transactionId?: string }) => {
    setShows(prev => prev.map(show =>
      show.id === showId 
        ? { ...show, automationResult: { ...result, timestamp: Date.now() } } 
        : show
    ));
    const show = shows.find(s => s.id === showId);
    if (show) {
      addActivity(
        result.success ? 'Purchase successful' : 'Purchase failed',
        `${show.artist} - ${show.title}`,
        showId,
        result.success ? 'success' : 'failed'
      );
    }
  }, [shows, addActivity]);

  // Ensure consistent Hook order by always returning the same object structure
  return useMemo(() => ({
    shows,
    activities,
    activeSnipes,
    addShow,
    removeShow,
    toggleSnipe,
    toggleMultipleSnipes,
    updateShow,
    addActivity,
    updateAutomationState,
    updateAutomationResult,
  }), [
    shows,
    activities,
    activeSnipes,
    addShow,
    removeShow,
    toggleSnipe,
    toggleMultipleSnipes,
    updateShow,
    addActivity,
    updateAutomationState,
    updateAutomationResult,
  ]);
});