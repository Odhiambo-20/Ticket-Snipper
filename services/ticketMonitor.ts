// services/ticketMonitor.ts
import axios from 'axios';
import { logger } from '../utils/logger';

interface SeatGeekEvent {
  id: number;
  title: string;
  datetime_local: string;
  venue: {
    name: string;
    city: string;
    state: string;
  };
  performers: Array<{
    id: number;
    name: string;
    image: string;
  }>;
  stats: {
    listing_count: number;
    lowest_price: number;
    highest_price: number;
    average_price: number;
  };
  url: string;
}

interface TicketAvailabilityResponse {
  available: boolean;
  lastChecked: string;
  eventId: string;
  price: number;
  seats: { id: string; status: string }[];
  title?: string;
  venue?: string;
  listingCount?: number;
}

function isAxiosError(error: unknown): error is { response?: { status?: number; statusText?: string }; code?: string; message: string } {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error && (error as any).isAxiosError === true;
}

export class TicketMonitorService {
  private apiUrl = process.env.EXPO_PUBLIC_BACKEND_API_URL || 'http://10.0.2.2:3000';
  private apiKey = process.env.EXPO_PUBLIC_TICKET_API_KEY || '';
  private maxRetries = 3;
  private retryDelayMs = 1000;

  async scanAvailableShows(location: string = 'New York', type: string = 'concert'): Promise<TicketAvailabilityResponse[]> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        const response = await axios.get<{ shows: Array<{ id: string; title: string; venue: string; price: number; availableSeats: number }> }>(
          `${this.apiUrl}/api/shows`,
          {
            headers: { 'x-api-key': this.apiKey },
            params: { location, type },
            timeout: 5000,
          }
        );

        const availableShows = response.data.shows
          .filter(show => show.availableSeats > 0)
          .map(show => ({
            available: show.availableSeats > 0,
            lastChecked: new Date().toISOString(),
            eventId: show.id,
            price: show.price,
            seats: Array.from({ length: Math.min(show.availableSeats, 10) }, (_, i) => ({
              id: `seat-${i + 1}`,
              status: 'available',
            })),
            title: show.title,
            venue: show.venue,
            listingCount: show.availableSeats,
          }));

        logger.info('Scanned available shows from backend', { count: availableShows.length });
        return availableShows;
      } catch (error: unknown) {
        attempts++;
        const isAxios = isAxiosError(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Backend scan attempt failed', { attempt: attempts, error: errorMessage });
        if (attempts < this.maxRetries && isAxios && (error.code === 'ECONNABORTED' || error.response?.status === 429)) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * attempts));
          continue;
        }
        return [];
      }
    }
    return [];
  }

  async checkAvailability(eventId: string): Promise<boolean> {
    let attempts = 0;
    while (attempts < this.maxRetries) {
      try {
        const response = await axios.get<{ show: { availableSeats: number } }>(
          `${this.apiUrl}/api/shows/${eventId}`,
          {
            headers: { 'x-api-key': this.apiKey },
            timeout: 5000,
          }
        );

        const available = response.data.show.availableSeats > 0;
        logger.info('Event availability checked', {
          eventId,
          available,
          listingCount: response.data.show.availableSeats,
          lastChecked: new Date().toISOString(),
        });
        return available;
      } catch (error: unknown) {
        attempts++;
        const isAxios = isAxiosError(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Backend availability check failed', { attempt: attempts, error: errorMessage });
        if (attempts < this.maxRetries && isAxios && (error.code === 'ECONNABORTED' || error.response?.status === 429)) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelayMs * attempts));
          continue;
        }
        return false;
      }
    }
    return false;
  }
}

export const monitorTickets = new TicketMonitorService();