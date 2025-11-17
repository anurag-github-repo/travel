export interface Flight {
  airline: string;
  airline_logo?: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  stops: string;
  price: string | number;
  booking_link?: string;
  kayak_link?: string;
  skyscanner_link?: string;
  expedia_link?: string;
  booking_com_link?: string;
  momondo_link?: string;
}

export interface Hotel {
  name: string;
  image_url?: string;
  location_text?: string;
  rating?: number;
  price_per_night: string | number;
  link?: string;
}

export interface SearchResult {
  title: string;
  snippet: string;
  link?: string;
  displayed_link?: string;
}

export interface RouteLocation {
  city: string;
  lat: number;
  lon: number;
}

export interface Route {
  from: RouteLocation;
  to: RouteLocation;
}

export interface ToolResult {
  name: string;
  flights?: Flight[];
  hotels?: Hotel[];
  route?: Route;
  travel_plan?: string;
  travel_plan_images?: Record<string, string>;
  search_results?: SearchResult[];
  jets?: Aircraft[];

  result?: string;
}

export interface AircraftSpecification {
  Manufacturer: string;
  Model: string;
  Classification: string;
  Seats: string;
  Speed: string;
  Range: string;
  "Luggage Capacity": string;
  "Interior Height": string;
  "Interior Width": string;
}

export interface Aircraft {
  scraped_from_url: string;
  name: string;
  overview: string;
  features: string[];
  specifications: AircraftSpecification;
  gallery_images: string[];
}

export interface APIResponse {
  text?: string;
  tool_results?: ToolResult[];
}

export interface Message {
  text: string;
  who: "user" | "bot";
  // flights?: Flight[];
  isLoading?: boolean;
}

export interface Context {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  passengers: number;
  roundTrip: boolean;
  lastQuery: string;
  extractedInfo: Record<string, any>;
  travelClass: string;
  nonStopOnly: boolean;
  searchType?: "flight" | "jet";
  adults?: number;
  children?: number;
  timePreference?: "day" | "night" | "any";
}
