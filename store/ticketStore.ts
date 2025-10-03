// store/ticketStore.ts
import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';
import { PurchaseShow } from '@/types/payment';

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
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'cancelled';
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

export interface TicketStore {
  shows: Show[];
  activities: Activity[];
  activeSnipes: number;
  pendingPurchases: PurchaseShow[];
  paymentConfirmation: { status: 'success' | 'cancelled' | null; sessionId?: string };
  addShow: (show: Show) => void;
  removeShow: (id: string) => void;
  toggleSnipe: (id: string) => void;
  toggleMultipleSnipes: (showIds: string[]) => void;
  updateShow: (id: string, updates: Partial<Show>) => void;
  addActivity: (action: string, show: string, showId: string, status: ActivityStatus) => void;
  updateAutomationState: (showId: string, state: 'waiting' | 'running' | 'stopped') => void;
  updateAutomationResult: (showId: string, result: { success: boolean; message: string; transactionId?: string }) => void;
  addPendingPurchase: (purchase: PurchaseShow) => void;
  clearPendingPurchases: () => void;
  setPaymentConfirmationStatus: (status: 'success' | 'cancelled', sessionId?: string) => void;
  incrementActiveSnipes: () => void;
  resetActiveSnipes: () => void;
}

export const [TicketProvider, useTicketStore] = createContextHook(() => {
  const [shows, setShows] = useState<Show[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<PurchaseShow[]>([]);
  const [paymentConfirmation, setPaymentConfirmation] = useState<{
    status: 'success' | 'cancelled' | null;
    sessionId?: string;
  }>({ status: null });
  const [activeSnipes, setActiveSnipes] = useState<number>(0);

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
      if (prev.some(s => s.id === show.id)) {
        return prev;
      }
      const newShows = [...prev, show];
      if (show.isActive) {
        setActiveSnipes(prev => prev + 1);
      }
      return newShows;
    });
    addActivity('Show added', `${show.artist} - ${show.title}`, show.id, 'added');
  }, [addActivity]);

  const removeShow = useCallback((id: string) => {
    const show = shows.find(s => s.id === id);
    setShows(prev => {
      const newShows = prev.filter(show => show.id !== id);
      if (show && show.isActive) {
        setActiveSnipes(prev => prev - 1);
      }
      return newShows;
    });
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
      setActiveSnipes(prev => prev + (newActiveState ? 1 : -1));
      addActivity(
        newActiveState ? 'Snipe scheduled' : 'Snipe cancelled',
        `${show.artist} - ${show.title}`,
        show.id,
        newActiveState ? 'scheduled' : 'failed'
      );
    }
  }, [shows, addActivity]);

  const toggleMultipleSnipes = useCallback((showIds: string[]) => {
    let activatedCount = 0;
    setShows(prev => prev.map(s => {
      if (showIds.includes(s.id) && !s.isActive) {
        activatedCount += 1;
        return { ...s, isActive: true };
      }
      return s;
    }));
    setActiveSnipes(prev => prev + activatedCount);
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
    if (updates.isActive !== undefined) {
      setActiveSnipes(prev => prev + (updates.isActive ? 1 : -1));
    }
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
        ? { 
            ...show, 
            automationResult: { ...result, timestamp: Date.now() },
            paymentStatus: result.success ? 'completed' : 'failed'
          } 
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

  const addPendingPurchase = useCallback((purchase: PurchaseShow) => {
    setPendingPurchases(prev => [...prev, purchase]);
  }, []);

  const clearPendingPurchases = useCallback(() => {
    setPendingPurchases([]);
  }, []);

  const setPaymentConfirmationStatus = useCallback((status: 'success' | 'cancelled', sessionId?: string) => {
    setPaymentConfirmation({ status, sessionId });
  }, []);

  const incrementActiveSnipes = useCallback(() => {
    setActiveSnipes(prev => prev + 1);
  }, []);

  const resetActiveSnipes = useCallback(() => {
    setActiveSnipes(shows.filter(show => show.isActive).length);
  }, [shows]);

  return {
    shows,
    activities,
    activeSnipes,
    pendingPurchases,
    paymentConfirmation,
    addShow,
    removeShow,
    toggleSnipe,
    toggleMultipleSnipes,
    updateShow,
    addActivity,
    updateAutomationState,
    updateAutomationResult,
    addPendingPurchase,
    clearPendingPurchases,
    setPaymentConfirmationStatus,
    incrementActiveSnipes,
    resetActiveSnipes,
  };
});