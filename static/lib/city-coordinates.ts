// Common city coordinates for Indian cities and major international destinations
export const cityCoordinates: Record<string, { lat: number; lon: number }> = {
  // Indian cities
  Delhi: { lat: 28.6139, lon: 77.209 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Hyderabad: { lat: 17.385, lon: 78.4867 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Lucknow: { lat: 26.8467, lon: 80.9462 },
  Chandigarh: { lat: 30.7333, lon: 76.7794 },
  Goa: { lat: 15.2993, lon: 74.124 },
  Kochi: { lat: 9.9312, lon: 76.2673 },
  Cochin: { lat: 9.9312, lon: 76.2673 },
  Trivandrum: { lat: 8.5241, lon: 76.9366 },
  Thiruvananthapuram: { lat: 8.5241, lon: 76.9366 },
  Indore: { lat: 22.7196, lon: 75.8577 },
  Bhopal: { lat: 23.2599, lon: 77.4126 },
  Nagpur: { lat: 21.1458, lon: 79.0882 },
  Visakhapatnam: { lat: 17.6869, lon: 83.2185 },
  Patna: { lat: 25.5941, lon: 85.1376 },
  Guwahati: { lat: 26.1445, lon: 91.7362 },
  Srinagar: { lat: 34.0837, lon: 74.7973 },
  Amritsar: { lat: 31.634, lon: 74.8723 },
  Varanasi: { lat: 25.3176, lon: 82.9739 },
  Udaipur: { lat: 24.5854, lon: 73.7125 },
  Agra: { lat: 27.1767, lon: 78.0081 },
  Coimbatore: { lat: 11.0168, lon: 76.9558 },
  Madurai: { lat: 9.9252, lon: 78.1198 },
  Mangalore: { lat: 12.9141, lon: 74.856 },

  // International cities
  "New York": { lat: 40.7128, lon: -74.006 },
  London: { lat: 51.5074, lon: -0.1278 },
  Paris: { lat: 48.8566, lon: 2.3522 },
  Dubai: { lat: 25.2048, lon: 55.2708 },
  Singapore: { lat: 1.3521, lon: 103.8198 },
  Bangkok: { lat: 13.7563, lon: 100.5018 },
  Tokyo: { lat: 35.6762, lon: 139.6503 },
  "Hong Kong": { lat: 22.3193, lon: 114.1694 },
  Sydney: { lat: -33.8688, lon: 151.2093 },
  Melbourne: { lat: -37.8136, lon: 144.9631 },
  "Los Angeles": { lat: 34.0522, lon: -118.2437 },
  "San Francisco": { lat: 37.7749, lon: -122.4194 },
  Toronto: { lat: 43.6532, lon: -79.3832 },
  Vancouver: { lat: 49.2827, lon: -123.1207 },
  Amsterdam: { lat: 52.3676, lon: 4.9041 },
  Berlin: { lat: 52.52, lon: 13.405 },
  Rome: { lat: 41.9028, lon: 12.4964 },
  Madrid: { lat: 40.4168, lon: -3.7038 },
  Barcelona: { lat: 41.3851, lon: 2.1734 },
  Istanbul: { lat: 41.0082, lon: 28.9784 },
  Moscow: { lat: 55.7558, lon: 37.6173 },
  Beijing: { lat: 39.9042, lon: 116.4074 },
  Shanghai: { lat: 31.2304, lon: 121.4737 },
  Seoul: { lat: 37.5665, lon: 126.978 },
  Kuala: { lat: 3.139, lon: 101.6869 },
  "Kuala Lumpur": { lat: 3.139, lon: 101.6869 },
  Jakarta: { lat: -6.2088, lon: 106.8456 },
  Manila: { lat: 14.5995, lon: 120.9842 },
  Colombo: { lat: 6.9271, lon: 79.8612 },
  Kathmandu: { lat: 27.7172, lon: 85.324 },
  Dhaka: { lat: 23.8103, lon: 90.4125 },
  Karachi: { lat: 24.8607, lon: 67.0011 },
  Lahore: { lat: 31.5497, lon: 74.3436 },
};

export function getCityCoordinates(cityName: string): { lat: number; lon: number } | null {
  if (!cityName) return null;

  // Try exact match first
  const normalizedName = cityName.trim();
  if (cityCoordinates[normalizedName]) {
    return cityCoordinates[normalizedName];
  }

  // Try case-insensitive match
  const lowerName = normalizedName.toLowerCase();
  const matchedKey = Object.keys(cityCoordinates).find(
    key => key.toLowerCase() === lowerName
  );

  if (matchedKey) {
    return cityCoordinates[matchedKey];
  }

  return null;
}
