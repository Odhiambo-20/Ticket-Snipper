import express from 'express';
import axios from 'axios';

const router = express.Router();

const SEATGEEK_API_BASE = 'https://api.seatgeek.com/2';
const SEATGEEK_CLIENT_ID = process.env.SEATGEEK_CLIENT_ID;
const SEATGEEK_CLIENT_SECRET = process.env.SEATGEEK_CLIENT_SECRET;
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://10.0.2.2:3000';

interface SeatGeekEvent {
  id: number;
  title: string;
  type: string;
  datetime_local: string;
  venue: {
    id: number;
    name: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  performers: Array<{
    id: number;
    name: string;
    image: string;
    primary: boolean;
  }>;
  short_title: string;
  url: string;
  stats: {
    listing_count?: number;
    average_price?: number;
    lowest_price?: number;
    highest_price?: number;
  };
}

interface Show {
  id: string;
  title: string;
  artist: string;
  date: string;
  venue: string;
  city: string;
  saleTime: string;
  availableSeats: number;
  price: number;
  sections: string[];
  imageUrl?: string;
  eventUrl?: string;
}

interface ApiResponse {
  success: boolean;
  shows: Show[];
  total: number;
  timestamp: string;
}

interface SeatGeekSearchResponse {
  events: SeatGeekEvent[];
  meta: {
    total: number;
    took: number;
    page: number;
    per_page: number;
  };
}

const verifyApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env.TICKET_API_KEY;

  if (!expectedApiKey) {
    console.warn('Warning: TICKET_API_KEY not set in environment variables');
    return next();
  }

  if (apiKey !== expectedApiKey) {
    console.log('❌ API Key mismatch:', { received: apiKey ? 'present' : 'missing', expected: 'set' });
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing API key. Please include x-api-key header.',
    });
  }
  next();
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const isAxiosError = (error: unknown): error is { response?: { status?: number; data?: any }; message: string } => {
  return typeof error === 'object' && error !== null && 'response' in error && 'message' in error;
};

const getSeatGeekAuth = () => ({
  client_id: SEATGEEK_CLIENT_ID,
  client_secret: SEATGEEK_CLIENT_SECRET,
});

// Helper function to fetch all pages of events
const fetchAllEvents = async (params: {
  location?: string;
  type?: string;
  per_page?: number;
}): Promise<SeatGeekEvent[]> => {
  const allEvents: SeatGeekEvent[] = [];
  let currentPage = 1;
  let totalPages = 1;
  const perPage = params.per_page || 100;
  const maxPages = 50;

  console.log('🔄 Starting to fetch all events from SeatGeek...');

  do {
    try {
      const response = await axios.get<SeatGeekSearchResponse>(`${SEATGEEK_API_BASE}/events`, {
        params: {
          ...getSeatGeekAuth(),
          'venue.city': params.location || 'New York',
          type: params.type || 'concert',
          page: currentPage,
          per_page: perPage,
          sort: 'datetime_local.asc',
          'datetime_local.gte': new Date().toISOString(),
          'listing_count.gt': 0, // Only fetch events with available tickets
        },
        timeout: 10000,
      });

      const events = response.data.events || [];
      allEvents.push(...events);

      const totalEvents = response.data.meta.total;
      totalPages = Math.ceil(totalEvents / perPage);

      console.log(`📄 Fetched page ${currentPage}/${totalPages} - ${events.length} events (Total so far: ${allEvents.length}/${totalEvents})`);

      if (events.length === 0) {
        break;
      }

      currentPage++;

      if (currentPage <= totalPages && currentPage <= maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error(`❌ Error fetching page ${currentPage}:`, error);
      break;
    }

  } while (currentPage <= totalPages && currentPage <= maxPages);

  console.log(`✅ Finished fetching all events: ${allEvents.length} total events`);
  return allEvents;
};

router.get('/', verifyApiKey, async (req, res) => {
  try {
    if (!SEATGEEK_CLIENT_ID || !SEATGEEK_CLIENT_SECRET) {
      console.error('❌ Missing SeatGeek credentials');
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'SeatGeek credentials not configured',
      });
    }

    const { 
      location = 'New York', 
      type = 'concert', 
      fetch_all = 'true',
      page = 1, 
      per_page = 25 
    } = req.query;

    let events: SeatGeekEvent[] = [];

    if (fetch_all === 'true') {
      console.log('✅ Fetching ALL events from SeatGeek (all pages)...');
      events = await fetchAllEvents({
        location: location as string,
        type: type as string,
        per_page: 100,
      });
    } else {
      console.log(`✅ Fetching events from SeatGeek (page ${page})...`);
      const response = await axios.get<SeatGeekSearchResponse>(`${SEATGEEK_API_BASE}/events`, {
        params: {
          ...getSeatGeekAuth(),
          'venue.city': location,
          type: type,
          page: page,
          per_page: per_page,
          sort: 'datetime_local.asc',
          'datetime_local.gte': new Date().toISOString(),
          'listing_count.gt': 0, // Only fetch events with available tickets
        },
        timeout: 10000,
      });
      events = response.data.events || [];
    }

    const shows = events.map((event) => {
      const primaryPerformer = event.performers.find((p) => p.primary) || event.performers[0];
      const artist = primaryPerformer ? primaryPerformer.name : 'Various Artists';

      const listingCount = event.stats?.listing_count ?? 0;
      const lowestPrice = event.stats?.lowest_price ?? 0;
      const averagePrice = event.stats?.average_price ?? 0;
      const price = lowestPrice || averagePrice || 0;

      return {
        id: event.id.toString(),
        title: event.title || event.short_title || 'Untitled Event',
        artist: artist,
        date: formatDate(event.datetime_local),
        venue: event.venue.name || 'Unknown Venue',
        city: `${event.venue.city}, ${event.venue.state}`,
        saleTime: formatTime(event.datetime_local),
        availableSeats: listingCount,
        price: price,
        sections: ['General Admission'],
        imageUrl: primaryPerformer?.image || '',
        eventUrl: event.url || '',
      };
    });

    // Filter shows with valid listings and prices
    const validShows = shows.filter(show => show.availableSeats > 0 && show.price > 0);

    res.json({
      success: true,
      shows: validShows,
      total: validShows.length,
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Returning ${validShows.length} events to client`);
    console.log(`📊 Stats breakdown: ${validShows.length} with listings, ${validShows.filter(s => s.price > 0).length} with prices`);
  } catch (error: unknown) {
    console.error('❌ Error fetching SeatGeek events:', error);
    if (isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      console.error('❌ Axios Error Details:', { status, message, data: error.response?.data });
      return res.status(status).json({
        success: false,
        error: 'SeatGeek API Error',
        message: message,
        details: error.response?.data,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shows',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/:id', verifyApiKey, async (req, res) => {
  try {
    if (!SEATGEEK_CLIENT_ID || !SEATGEEK_CLIENT_SECRET) {
      console.error('❌ Missing SeatGeek credentials');
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'SeatGeek credentials not configured',
      });
    }

    const { id } = req.params;
    console.log(`✅ Fetching event ${id} from SeatGeek...`);

    const eventResponse = await axios.get<SeatGeekEvent>(`${SEATGEEK_API_BASE}/events/${id}`, {
      params: getSeatGeekAuth(),
      timeout: 5000,
    });

    const event = eventResponse.data;
    const primaryPerformer = event.performers.find((p) => p.primary) || event.performers[0];
    const artist = primaryPerformer ? primaryPerformer.name : 'Various Artists';

    const listingCount = event.stats?.listing_count ?? 0;
    const lowestPrice = event.stats?.lowest_price ?? 0;
    const averagePrice = event.stats?.average_price ?? 0;
    const price = lowestPrice || averagePrice || 0;

    const show: Show = {
      id: event.id.toString(),
      title: event.title || event.short_title || 'Untitled Event',
      artist: artist,
      date: formatDate(event.datetime_local),
      venue: event.venue.name || 'Unknown Venue',
      city: `${event.venue.city}, ${event.venue.state}`,
      saleTime: formatTime(event.datetime_local),
      availableSeats: listingCount,
      price: price,
      sections: ['General Admission'],
      imageUrl: primaryPerformer?.image || '',
      eventUrl: event.url || '',
    };

    if (show.availableSeats === 0 || show.price === 0) {
      return res.status(400).json({
        success: false,
        error: 'Show unavailable',
        message: `Show ${show.title} has no available tickets or valid price`,
      });
    }

    res.json({
      success: true,
      show: show,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('❌ Error fetching SeatGeek event:', error);
    if (isAxiosError(error)) {
      const status = error.response?.status || 500;
      if (status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Show not found',
          message: `No event found with ID: ${req.params.id}`,
        });
      }
      const message = error.response?.data?.message || error.message;
      console.error('❌ Axios Error Details:', { status, message, data: error.response?.data });
      return res.status(status).json({
        success: false,
        error: 'SeatGeek API Error',
        message: message,
        details: error.response?.data,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch show',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/:id/reserve', verifyApiKey, async (req, res) => {
  try {
    if (!SEATGEEK_CLIENT_ID || !SEATGEEK_CLIENT_SECRET) {
      console.error('❌ Missing SeatGeek credentials');
      return res.status(500).json({
        success: false,
        error: 'Configuration Error',
        message: 'SeatGeek credentials not configured',
      });
    }

    const { id } = req.params;
    const { quantity = 1 } = req.body;
    console.log(`✅ Creating reservation for event ${id} with quantity ${quantity}...`);

    // Fetch event details from SeatGeek
    const eventResponse = await axios.get<SeatGeekEvent>(`${SEATGEEK_API_BASE}/events/${id}`, {
      params: getSeatGeekAuth(),
      timeout: 5000,
    });

    const event = eventResponse.data;
    const listingCount = event.stats?.listing_count ?? 0;
    
    if (listingCount === 0) {
      return res.status(400).json({
        success: false,
        error: 'No tickets available',
        message: `No tickets are available for event ${event.title || event.id}`,
      });
    }

    if (listingCount < quantity) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient tickets',
        message: `Requested ${quantity} tickets, but only ${listingCount} available for event ${event.title || event.id}`,
      });
    }

    const lowestPrice = event.stats?.lowest_price ?? 0;
    const averagePrice = event.stats?.average_price ?? 0;
    const price = lowestPrice || averagePrice || 0;

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: `No valid price available for event ${event.title || event.id}`,
      });
    }

    // Generate a seatId (simplified, as SeatGeek public API doesn't provide specific seat details)
    const seatId = `SEAT-${id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create Stripe Checkout Session
    const checkoutResponse = await axios.post(`${BACKEND_API_URL}/api/payments/stripe/create-checkout-session`, {
      eventId: id,
      seatId: seatId,
      quantity: quantity,
      eventTitle: event.title || event.short_title || 'Untitled Event',
      price: price,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TICKET_API_KEY,
      },
      timeout: 5000,
    });

    const checkoutData = checkoutResponse.data as {
      success: boolean;
      checkoutUrl?: string;
      sessionId?: string;
      message?: string;
    };

    if (!checkoutData.success || !checkoutData.checkoutUrl) {
      throw new Error(checkoutData.message || 'Failed to create checkout session');
    }

    const reservationId = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.json({
      success: true,
      reservationId,
      eventId: id,
      eventTitle: event.title,
      quantity: quantity,
      estimatedPrice: price * quantity,
      checkoutUrl: checkoutData.checkoutUrl,
      sessionId: checkoutData.sessionId,
      seatId: seatId,
      message: 'Redirecting to Stripe for payment completion',
    });
  } catch (error: unknown) {
    console.error('❌ Error creating reservation:', error);
    if (isAxiosError(error)) {
      const status = error.response?.status || 500;
      if (status === 404) {
        return res.status(404).json({
          success: false,
          error: 'Event not found',
          message: `No event found with ID: ${req.params.id}`,
        });
      }
      const message = error.response?.data?.message || error.message;
      console.error('❌ Axios Error Details:', { status, message, data: error.response?.data });
      return res.status(status).json({
        success: false,
        error: 'Reservation Error',
        message: message,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create reservation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;