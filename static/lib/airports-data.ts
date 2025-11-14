// Comprehensive list of major airports worldwide
export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const airports: Airport[] = [
  // United States
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International Airport", city: "Atlanta", country: "United States" },
  { code: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States" },
  { code: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "United States" },
  { code: "DFW", name: "Dallas/Fort Worth International Airport", city: "Dallas", country: "United States" },
  { code: "DEN", name: "Denver International Airport", city: "Denver", country: "United States" },
  { code: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States" },
  { code: "SFO", name: "San Francisco International Airport", city: "San Francisco", country: "United States" },
  { code: "SEA", name: "Seattle-Tacoma International Airport", city: "Seattle", country: "United States" },
  { code: "LAS", name: "Harry Reid International Airport", city: "Las Vegas", country: "United States" },
  { code: "MCO", name: "Orlando International Airport", city: "Orlando", country: "United States" },
  { code: "EWR", name: "Newark Liberty International Airport", city: "Newark", country: "United States" },
  { code: "MIA", name: "Miami International Airport", city: "Miami", country: "United States" },
  { code: "PHX", name: "Phoenix Sky Harbor International Airport", city: "Phoenix", country: "United States" },
  { code: "IAH", name: "George Bush Intercontinental Airport", city: "Houston", country: "United States" },
  { code: "BOS", name: "Logan International Airport", city: "Boston", country: "United States" },
  { code: "MSP", name: "Minneapolis-St Paul International Airport", city: "Minneapolis", country: "United States" },
  { code: "DTW", name: "Detroit Metropolitan Wayne County Airport", city: "Detroit", country: "United States" },
  { code: "PHL", name: "Philadelphia International Airport", city: "Philadelphia", country: "United States" },
  { code: "LGA", name: "LaGuardia Airport", city: "New York", country: "United States" },
  { code: "FLL", name: "Fort Lauderdale-Hollywood International Airport", city: "Fort Lauderdale", country: "United States" },
  { code: "BWI", name: "Baltimore/Washington International Airport", city: "Baltimore", country: "United States" },
  { code: "DCA", name: "Ronald Reagan Washington National Airport", city: "Washington", country: "United States" },
  { code: "IAD", name: "Washington Dulles International Airport", city: "Washington", country: "United States" },
  { code: "SAN", name: "San Diego International Airport", city: "San Diego", country: "United States" },
  { code: "TPA", name: "Tampa International Airport", city: "Tampa", country: "United States" },
  { code: "PDX", name: "Portland International Airport", city: "Portland", country: "United States" },
  { code: "STL", name: "St. Louis Lambert International Airport", city: "St. Louis", country: "United States" },
  { code: "HNL", name: "Daniel K. Inouye International Airport", city: "Honolulu", country: "United States" },
  { code: "AUS", name: "Austin-Bergstrom International Airport", city: "Austin", country: "United States" },
  { code: "MSY", name: "Louis Armstrong New Orleans International Airport", city: "New Orleans", country: "United States" },
  { code: "SLC", name: "Salt Lake City International Airport", city: "Salt Lake City", country: "United States" },
  { code: "CLT", name: "Charlotte Douglas International Airport", city: "Charlotte", country: "United States" },

  // United Kingdom
  { code: "LHR", name: "Heathrow Airport", city: "London", country: "United Kingdom" },
  { code: "LGW", name: "Gatwick Airport", city: "London", country: "United Kingdom" },
  { code: "MAN", name: "Manchester Airport", city: "Manchester", country: "United Kingdom" },
  { code: "EDI", name: "Edinburgh Airport", city: "Edinburgh", country: "United Kingdom" },
  { code: "BHX", name: "Birmingham Airport", city: "Birmingham", country: "United Kingdom" },
  { code: "GLA", name: "Glasgow Airport", city: "Glasgow", country: "United Kingdom" },
  { code: "LTN", name: "London Luton Airport", city: "London", country: "United Kingdom" },
  { code: "STN", name: "London Stansted Airport", city: "London", country: "United Kingdom" },
  { code: "LCY", name: "London City Airport", city: "London", country: "United Kingdom" },

  // India
  { code: "DEL", name: "Indira Gandhi International Airport", city: "Delhi", country: "India" },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International Airport", city: "Mumbai", country: "India" },
  { code: "BLR", name: "Kempegowda International Airport", city: "Bangalore", country: "India" },
  { code: "HYD", name: "Rajiv Gandhi International Airport", city: "Hyderabad", country: "India" },
  { code: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India" },
  { code: "CCU", name: "Netaji Subhas Chandra Bose International Airport", city: "Kolkata", country: "India" },
  { code: "COK", name: "Cochin International Airport", city: "Kochi", country: "India" },
  { code: "GOI", name: "Goa International Airport", city: "Goa", country: "India" },
  { code: "PNQ", name: "Pune Airport", city: "Pune", country: "India" },
  { code: "AMD", name: "Sardar Vallabhbhai Patel International Airport", city: "Ahmedabad", country: "India" },
  { code: "JAI", name: "Jaipur International Airport", city: "Jaipur", country: "India" },
  { code: "IXC", name: "Chandigarh International Airport", city: "Chandigarh", country: "India" },
  { code: "LKO", name: "Chaudhary Charan Singh International Airport", city: "Lucknow", country: "India" },
  { code: "TRV", name: "Trivandrum International Airport", city: "Thiruvananthapuram", country: "India" },
  { code: "GAU", name: "Lokpriya Gopinath Bordoloi International Airport", city: "Guwahati", country: "India" },
  { code: "IXB", name: "Bagdogra Airport", city: "Bagdogra", country: "India" },
  { code: "NAG", name: "Dr. Babasaheb Ambedkar International Airport", city: "Nagpur", country: "India" },
  { code: "VNS", name: "Lal Bahadur Shastri Airport", city: "Varanasi", country: "India" },
  { code: "SXR", name: "Sheikh ul-Alam International Airport", city: "Srinagar", country: "India" },

  // Europe
  { code: "CDG", name: "Charles de Gaulle Airport", city: "Paris", country: "France" },
  { code: "ORY", name: "Orly Airport", city: "Paris", country: "France" },
  { code: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
  { code: "MUC", name: "Munich Airport", city: "Munich", country: "Germany" },
  { code: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands" },
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas Airport", city: "Madrid", country: "Spain" },
  { code: "BCN", name: "Barcelona-El Prat Airport", city: "Barcelona", country: "Spain" },
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino Airport", city: "Rome", country: "Italy" },
  { code: "MXP", name: "Milan Malpensa Airport", city: "Milan", country: "Italy" },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
  { code: "SAW", name: "Sabiha Gökçen International Airport", city: "Istanbul", country: "Turkey" },
  { code: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland" },
  { code: "VIE", name: "Vienna International Airport", city: "Vienna", country: "Austria" },
  { code: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark" },
  { code: "ARN", name: "Stockholm Arlanda Airport", city: "Stockholm", country: "Sweden" },
  { code: "OSL", name: "Oslo Airport", city: "Oslo", country: "Norway" },
  { code: "HEL", name: "Helsinki-Vantaa Airport", city: "Helsinki", country: "Finland" },
  { code: "DUB", name: "Dublin Airport", city: "Dublin", country: "Ireland" },
  { code: "LIS", name: "Lisbon Portela Airport", city: "Lisbon", country: "Portugal" },
  { code: "ATH", name: "Athens International Airport", city: "Athens", country: "Greece" },
  { code: "PRG", name: "Václav Havel Airport Prague", city: "Prague", country: "Czech Republic" },
  { code: "WAW", name: "Warsaw Chopin Airport", city: "Warsaw", country: "Poland" },
  { code: "BUD", name: "Budapest Ferenc Liszt International Airport", city: "Budapest", country: "Hungary" },
  { code: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium" },

  // Middle East
  { code: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates" },
  { code: "AUH", name: "Abu Dhabi International Airport", city: "Abu Dhabi", country: "United Arab Emirates" },
  { code: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar" },
  { code: "RUH", name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia" },
  { code: "JED", name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia" },
  { code: "TLV", name: "Ben Gurion Airport", city: "Tel Aviv", country: "Israel" },
  { code: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt" },
  { code: "AMM", name: "Queen Alia International Airport", city: "Amman", country: "Jordan" },
  { code: "KWI", name: "Kuwait International Airport", city: "Kuwait City", country: "Kuwait" },
  { code: "BAH", name: "Bahrain International Airport", city: "Manama", country: "Bahrain" },
  { code: "MCT", name: "Muscat International Airport", city: "Muscat", country: "Oman" },

  // Asia Pacific
  { code: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong" },
  { code: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore" },
  { code: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea" },
  { code: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan" },
  { code: "HND", name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan" },
  { code: "KIX", name: "Kansai International Airport", city: "Osaka", country: "Japan" },
  { code: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "China" },
  { code: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China" },
  { code: "CAN", name: "Guangzhou Baiyun International Airport", city: "Guangzhou", country: "China" },
  { code: "SZX", name: "Shenzhen Bao'an International Airport", city: "Shenzhen", country: "China" },
  { code: "CTU", name: "Chengdu Shuangliu International Airport", city: "Chengdu", country: "China" },
  { code: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand" },
  { code: "DMK", name: "Don Mueang International Airport", city: "Bangkok", country: "Thailand" },
  { code: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia" },
  { code: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia" },
  { code: "DPS", name: "Ngurah Rai International Airport", city: "Denpasar (Bali)", country: "Indonesia" },
  { code: "MNL", name: "Ninoy Aquino International Airport", city: "Manila", country: "Philippines" },
  { code: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia" },
  { code: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia" },
  { code: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia" },
  { code: "PER", name: "Perth Airport", city: "Perth", country: "Australia" },
  { code: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand" },
  { code: "TPE", name: "Taiwan Taoyuan International Airport", city: "Taipei", country: "Taiwan" },
  { code: "MNL", name: "Ninoy Aquino International Airport", city: "Manila", country: "Philippines" },
  { code: "HAN", name: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam" },
  { code: "SGN", name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam" },
  { code: "RGN", name: "Yangon International Airport", city: "Yangon", country: "Myanmar" },
  { code: "CMB", name: "Bandaranaike International Airport", city: "Colombo", country: "Sri Lanka" },
  { code: "KTM", name: "Tribhuvan International Airport", city: "Kathmandu", country: "Nepal" },
  { code: "DAC", name: "Hazrat Shahjalal International Airport", city: "Dhaka", country: "Bangladesh" },
  { code: "ISB", name: "Islamabad International Airport", city: "Islamabad", country: "Pakistan" },
  { code: "LHE", name: "Allama Iqbal International Airport", city: "Lahore", country: "Pakistan" },
  { code: "KHI", name: "Jinnah International Airport", city: "Karachi", country: "Pakistan" },

  // Africa
  { code: "JNB", name: "O.R. Tambo International Airport", city: "Johannesburg", country: "South Africa" },
  { code: "CPT", name: "Cape Town International Airport", city: "Cape Town", country: "South Africa" },
  { code: "LOS", name: "Murtala Muhammed International Airport", city: "Lagos", country: "Nigeria" },
  { code: "ADD", name: "Addis Ababa Bole International Airport", city: "Addis Ababa", country: "Ethiopia" },
  { code: "NBO", name: "Jomo Kenyatta International Airport", city: "Nairobi", country: "Kenya" },
  { code: "ALG", name: "Houari Boumediene Airport", city: "Algiers", country: "Algeria" },
  { code: "CMN", name: "Mohammed V International Airport", city: "Casablanca", country: "Morocco" },
  { code: "TUN", name: "Tunis-Carthage International Airport", city: "Tunis", country: "Tunisia" },
  { code: "ACC", name: "Kotoka International Airport", city: "Accra", country: "Ghana" },
  { code: "DAR", name: "Julius Nyerere International Airport", city: "Dar es Salaam", country: "Tanzania" },

  // South America
  { code: "GRU", name: "São Paulo/Guarulhos International Airport", city: "São Paulo", country: "Brazil" },
  { code: "GIG", name: "Rio de Janeiro/Galeão International Airport", city: "Rio de Janeiro", country: "Brazil" },
  { code: "BSB", name: "Brasília International Airport", city: "Brasília", country: "Brazil" },
  { code: "EZE", name: "Ministro Pistarini International Airport", city: "Buenos Aires", country: "Argentina" },
  { code: "SCL", name: "Arturo Merino Benítez International Airport", city: "Santiago", country: "Chile" },
  { code: "LIM", name: "Jorge Chávez International Airport", city: "Lima", country: "Peru" },
  { code: "BOG", name: "El Dorado International Airport", city: "Bogotá", country: "Colombia" },
  { code: "UIO", name: "Mariscal Sucre International Airport", city: "Quito", country: "Ecuador" },
  { code: "CCS", name: "Simón Bolívar International Airport", city: "Caracas", country: "Venezuela" },
  { code: "PTY", name: "Tocumen International Airport", city: "Panama City", country: "Panama" },

  // Canada
  { code: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada" },
  { code: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada" },
  { code: "YUL", name: "Montréal-Pierre Elliott Trudeau International Airport", city: "Montreal", country: "Canada" },
  { code: "YYC", name: "Calgary International Airport", city: "Calgary", country: "Canada" },
  { code: "YEG", name: "Edmonton International Airport", city: "Edmonton", country: "Canada" },
  { code: "YOW", name: "Ottawa Macdonald-Cartier International Airport", city: "Ottawa", country: "Canada" },

  // Mexico & Central America
  { code: "MEX", name: "Mexico City International Airport", city: "Mexico City", country: "Mexico" },
  { code: "CUN", name: "Cancún International Airport", city: "Cancún", country: "Mexico" },
  { code: "GDL", name: "Guadalajara International Airport", city: "Guadalajara", country: "Mexico" },
  { code: "MTY", name: "Monterrey International Airport", city: "Monterrey", country: "Mexico" },
  { code: "SJO", name: "Juan Santamaría International Airport", city: "San José", country: "Costa Rica" },
  { code: "SAL", name: "Monseñor Óscar Arnulfo Romero International Airport", city: "San Salvador", country: "El Salvador" },

  // Caribbean
  { code: "SJU", name: "Luis Muñoz Marín International Airport", city: "San Juan", country: "Puerto Rico" },
  { code: "MBJ", name: "Sangster International Airport", city: "Montego Bay", country: "Jamaica" },
  { code: "NAS", name: "Lynden Pindling International Airport", city: "Nassau", country: "Bahamas" },
  { code: "PUJ", name: "Punta Cana International Airport", city: "Punta Cana", country: "Dominican Republic" },
  { code: "HAV", name: "José Martí International Airport", city: "Havana", country: "Cuba" },
];

// Function to search airports
export function searchAirports(query: string): Airport[] {
  if (!query || query.length < 2) return [];

  const searchTerm = query.toLowerCase();
  return airports.filter(airport =>
    airport.code.toLowerCase().includes(searchTerm) ||
    airport.name.toLowerCase().includes(searchTerm) ||
    airport.city.toLowerCase().includes(searchTerm) ||
    airport.country.toLowerCase().includes(searchTerm)
  ).slice(0, 10); // Limit to 10 results
}

// Function to get airport by code
export function getAirportByCode(code: string): Airport | undefined {
  return airports.find(airport => airport.code === code);
}
