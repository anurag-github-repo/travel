import os
import re
import json
import asyncio
import logging
from logging.handlers import RotatingFileHandler
from functools import lru_cache
from typing import Dict, List, Optional, Any
from serpapi import GoogleSearch
import google.generativeai as genai
import textwrap

# --- serp_wrapper.py code starts here ---
# This section is from the provided serp_wrapper.py

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Configure rotating file handler for API/activity logs
_log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(_log_dir, exist_ok=True)
_log_path = os.path.join(_log_dir, 'app.log')
if not any(isinstance(h, RotatingFileHandler) for h in logger.handlers):
    file_handler = RotatingFileHandler(_log_path, maxBytes=1_000_000, backupCount=3, encoding='utf-8')
    file_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s - %(message)s')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

# Also log to console if not already configured
if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)
    stream_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s - %(message)s'))
    logger.addHandler(stream_handler)

SERP_API_KEY = "82b7c41c0cee2e6589cb906bd90add04b517d6d1ab1e3f5e802b4b5c2720c9e3"

async def _run_search_sync(params: Dict[str, Any]) -> Dict[str, Any]:
    def _call():
        try:
            return GoogleSearch(params).get_dict()
        except Exception as e:
            logger.exception("SerpAPI call failed")
            raise RuntimeError(f"SerpAPI error: {e}")

    return await asyncio.to_thread(_call)

CITY_TO_IATA = {
    "mumbai": "BOM",
    "vadodara": "BDQ",
    "dubai": "DXB",
    "switzerland": "ZRH",
    "hyderabad": "HYD",
    "delhi": "DEL",
    "goa": "GOI",
    "bangalore": "BLR",
}

# Basic city coordinates for mapping (lat, lon)
CITY_COORDS = {
    "mumbai": (19.0760, 72.8777),
    "hyderabad": (17.3850, 78.4867),
    "delhi": (28.6139, 77.2090),
    "goa": (15.2993, 74.1240),
    "bangalore": (12.9716, 77.5946),
    "vadodara": (22.3072, 73.1812),
    "dubai": (25.2048, 55.2708),
    "switzerland": (46.8182, 8.2275),
    "singapore": (1.3521, 103.8198),
}

def get_city_coords(city: str) -> Optional[Dict[str, float]]:
    if not city:
        return None
    key = city.lower().strip()
    if key in CITY_COORDS:
        lat, lon = CITY_COORDS[key]
        return {"lat": lat, "lon": lon}
    return None

@lru_cache(maxsize=256)
def get_iata_for_city_sync(city: str) -> str:
    # This is a synchronous wrapper for the async get_iata_for_city for lru_cache
    return asyncio.run(get_iata_for_city(city))

async def get_iata_for_city(city: str) -> str:
    if not city:
        return city

    key = city.lower().strip()
    if len(key) == 3 and key.isalpha():
        return key.upper()

    if key in CITY_TO_IATA:
        return CITY_TO_IATA[key]

    q = f"{city} airport IATA code"
    params = {
        "api_key": SERP_API_KEY,
        "engine": "google",
        "q": q,
        "hl": "en",
        "num": 10,
    }

    try:
        res = await _run_search_sync(params)
        text_to_search = ""
        if "answer_box" in res:
            text_to_search += str(res["answer_box"])
        if "organic_results" in res:
            text_to_search += " " + str(res["organic_results"])
        matches = re.findall(r'\b([A-Z]{3})\b', text_to_search)
        if matches:
            iata = matches[0]
            CITY_TO_IATA[key] = iata
            logger.info("Found IATA %s for %s via SerpAPI", iata, city)
            return iata
    except Exception as e:
        logger.warning("IATA lookup failed for %s: %s", city, e)

    logger.info("No IATA found, returning original city name: %s", city)
    return city

async def search_google_flights(
    departure_id: str,
    arrival_id: str,
    outbound_date: str,
    return_date: Optional[str] = None,
    currency: str = "INR",
    gl: str = "in",
    hl: str = "en",
    # Flight type
    flight_type: Optional[int] = None,  # 1=Round-trip, 2=One-way, 3=Multi-city
    # Passengers
    adults: int = 1,
    children: int = 0,
    infants_in_seat: int = 0,
    infants_on_lap: int = 0,
    # Advanced filters
    travel_class: Optional[int] = None,  # 1=Economy, 2=Premium Economy, 3=Business, 4=First
    stops: Optional[int] = None,  # 0=Any, 1=Nonstop, 2=1 stop
    exclude_airlines: Optional[str] = None,  # Comma-separated IATA codes or alliances
    include_airlines: Optional[str] = None,  # Comma-separated IATA codes or alliances
    bags: int = 0,  # Number of carry-on bags
    max_price: Optional[int] = None,  # Max price in currency
    outbound_times: Optional[str] = None,  # Time range: "4,18" or "4,18,3,19"
    return_times: Optional[str] = None,  # Time range for return flights
    emissions: Optional[int] = None,  # 1=Less emissions
    layover_duration: Optional[str] = None,  # Min-max in minutes: "90,330"
    exclude_conns: Optional[str] = None,  # Exclude connecting airports
    max_duration: Optional[int] = None,  # Max total duration in minutes
    exclude_basic: bool = False,  # Exclude basic economy
    deep_search: bool = False,  # Enable deep search
    # Sorting
    sort_by: Optional[int] = None,  # 1=Top, 2=Price, 3=Dep Time, 4=Arr Time, 5=Duration, 6=Emissions
) -> List[Dict[str, Any]]:
    # Ensure date format is YYYY-MM-DD
    try:
        from datetime import datetime
        # Validate and normalize date format
        datetime.strptime(outbound_date, '%Y-%m-%d')
    except ValueError:
        logger.error(f"Invalid outbound_date format: {outbound_date}. Expected YYYY-MM-DD")
        return []
    
    if return_date:
        try:
            datetime.strptime(return_date, '%Y-%m-%d')
        except ValueError:
            logger.error(f"Invalid return_date format: {return_date}. Expected YYYY-MM-DD")
            return_date = None  # Continue with one-way if return date is invalid
    
    params = {
        "api_key": SERP_API_KEY,
        "engine": "google_flights",
        "departure_id": departure_id,
        "arrival_id": arrival_id,
        "outbound_date": outbound_date,
        "currency": currency,
        "gl": gl,
        "hl": hl,
        "adults": str(adults),
    }
    
    # Flight type
    if flight_type is not None:
        params["type"] = str(flight_type)
    elif return_date:
        params["type"] = "1"  # Round-trip
    else:
        params["type"] = "2"  # One-way
    
    if return_date:
        params["return_date"] = return_date
    
    # Passengers
    if children > 0:
        params["children"] = str(children)
    if infants_in_seat > 0:
        params["infants_in_seat"] = str(infants_in_seat)
    if infants_on_lap > 0:
        params["infants_on_lap"] = str(infants_on_lap)
    
    # Advanced filters
    if travel_class is not None:
        params["travel_class"] = str(travel_class)
    if stops is not None:
        params["stops"] = str(stops)
    if exclude_airlines:
        params["exclude_airlines"] = exclude_airlines
    if include_airlines:
        params["include_airlines"] = include_airlines
    if bags > 0:
        params["bags"] = str(bags)
    if max_price is not None:
        params["max_price"] = str(max_price)
    if outbound_times:
        params["outbound_times"] = outbound_times
    if return_times:
        params["return_times"] = return_times
    if emissions is not None:
        params["emissions"] = str(emissions)
    if layover_duration:
        params["layover_duration"] = layover_duration
    if exclude_conns:
        params["exclude_conns"] = exclude_conns
    if max_duration is not None:
        params["max_duration"] = str(max_duration)
    if exclude_basic:
        params["exclude_basic"] = "true"
    if deep_search:
        params["deep_search"] = "true"
    
    # Sorting
    if sort_by is not None:
        params["sort_by"] = str(sort_by)   
    res = await _run_search_sync(params)
    
    # Debug: log the response structure
    if not isinstance(res, dict):
        logger.error(f"SerpAPI returned non-dict response: {type(res)}")
        return []
    
    # Check for errors first
    if 'error' in res:
        logger.error(f"SerpAPI error: {res.get('error')}")
        return []
    
    logger.info(f"SerpAPI response keys: {list(res.keys())}")
    logger.info(f"best_flights count: {len(res.get('best_flights', []))}")
    logger.info(f"other_flights count: {len(res.get('other_flights', []))}")
    logger.info(f"flights count: {len(res.get('flights', []))}")
    
    # Log full response structure for debugging (first 2000 chars)
    res_str = json.dumps(res, indent=2, default=str)[:2000]
    logger.info(f"SerpAPI response preview: {res_str}...")
    
    # Check for alternative response structures
    if 'flights' in res and not res.get('best_flights'):
        logger.info("Found 'flights' key instead of 'best_flights'")

    def _make_google_flights_link(dep: str, arr: str, out_d: str, ret_d: Optional[str]) -> str:
        try:
            if ret_d:
                return (
                    f"https://www.google.com/travel/flights?hl={hl}&gl={gl}&curr={currency}#"
                    f"flt={dep}.{arr}.{out_d}*{arr}.{dep}.{ret_d}"
                )
            return (
                f"https://www.google.com/travel/flights?hl={hl}&gl={gl}&curr={currency}#"
                f"flt={dep}.{arr}.{out_d}"
            )
        except Exception:
            return "https://www.google.com/travel/flights"

    def _make_kayak_link(dep: str, arr: str, out_d: str, ret_d: Optional[str]) -> str:
        # Kayak supports ISO dates: YYYY-MM-DD
        base = "https://www.kayak.com/flights"
        if ret_d:
            return f"{base}/{dep}-{arr}/{out_d}/{ret_d}?sort=bestflight_a"
        return f"{base}/{dep}-{arr}/{out_d}?sort=bestflight_a"

    def _make_skyscanner_link(dep: str, arr: str, out_d: str, ret_d: Optional[str]) -> str:
        # Skyscanner path uses YYYYMMDD (no dashes)
        out_c = out_d.replace('-', '')
        base = "https://www.skyscanner.com/transport/flights"
        if ret_d:
            ret_c = ret_d.replace('-', '')
            return f"{base}/{dep}/{arr}/{out_c}/{ret_c}/?adults=1&cabinclass=economy"
        return f"{base}/{dep}/{arr}/{out_c}/?adults=1&cabinclass=economy"

    def _make_expedia_link(dep: str, arr: str, out_d: str, ret_d: Optional[str]) -> str:
        # Expedia uses YYYY-MM-DD format
        base = "https://www.expedia.com/Flights-Search"
        if ret_d:
            return f"{base}?flight-type=on&mode=search&trip=roundtrip&leg1=from:{dep},to:{arr},departure:{out_d}TANYT&leg2=from:{arr},to:{dep},departure:{ret_d}TANYT&options=cabinclass:economy"
        return f"{base}?flight-type=on&mode=search&trip=oneway&leg1=from:{dep},to:{arr},departure:{out_d}TANYT&options=cabinclass:economy"

    def _make_booking_com_link(dep: str, arr: str, out_d: str, ret_d: Optional[str]) -> str:
        # Booking.com flights
        base = "https://www.booking.com/flights"
        if ret_d:
            return f"{base}/index.html?ss={dep}%2C{arr}&checkin_month={out_d[:7]}&checkin_monthday={out_d[8:10]}&checkout_month={ret_d[:7]}&checkout_monthday={ret_d[8:10]}"
        return f"{base}/index.html?ss={dep}%2C{arr}&checkin_month={out_d[:7]}&checkin_monthday={out_d[8:10]}"

    def _make_momondo_link(dep: str, arr: str, out_d: str, ret_d: Optional[str]) -> str:
        # Momondo flights
        base = "https://www.momondo.com/flight-search"
        if ret_d:
            return f"{base}/{dep}-{arr}/{out_d}/{ret_d}"
        return f"{base}/{dep}-{arr}/{out_d}"

    flights_out: List[Dict[str, Any]] = []

    def _append_from_collection(collection):
        for item in collection or []:
            try:
                first_leg = item.get("flights", [])[0] if item.get("flights") else {}
                airline = first_leg.get("airline") or item.get("title") or "N/A"
                price = item.get("price") or item.get("displayed_price") or "N/A"
                total_duration = item.get("total_duration") or item.get("duration") or "N/A"
                stops = "Nonstop" if len(item.get("flights", [])) == 1 else f"{max(0, len(item.get('flights', [])) - 1)} stop(s)"
                departure_time = first_leg.get("departure_airport", {}).get("time", "N/A")
                arrival_time = first_leg.get("arrival_airport", {}).get("time", "N/A")
                travel_class = first_leg.get("travel_class", "Economy")
                airline_logo = first_leg.get("airline_logo", "")
                booking_link = _make_google_flights_link(departure_id, arrival_id, outbound_date, return_date)
                kayak_link = _make_kayak_link(departure_id, arrival_id, outbound_date, return_date)
                skyscanner_link = _make_skyscanner_link(departure_id, arrival_id, outbound_date, return_date)
                expedia_link = _make_expedia_link(departure_id, arrival_id, outbound_date, return_date)
                booking_com_link = _make_booking_com_link(departure_id, arrival_id, outbound_date, return_date)
                momondo_link = _make_momondo_link(departure_id, arrival_id, outbound_date, return_date)

                flights_out.append({
                    "airline": airline,
                    "price": str(price),
                    "duration": str(total_duration),
                    "stops": stops,
                    "departure_time": departure_time,
                    "arrival_time": arrival_time,
                    "travel_class": travel_class,
                    "airline_logo": airline_logo,
                    "booking_link": booking_link,
                    "kayak_link": kayak_link,
                    "skyscanner_link": skyscanner_link,
                    "expedia_link": expedia_link,
                    "booking_com_link": booking_com_link,
                    "momondo_link": momondo_link,
                })
            except Exception as e:
                logger.warning("Skipping malformed flight entry: %s", e)
                continue

    # Try multiple possible response structures
    # For round-trip flights
    _append_from_collection(res.get("best_flights", []) or [])
    _append_from_collection(res.get("other_flights", []) or [])
    
    # For one-way flights, check alternative keys
    if not flights_out:
        _append_from_collection(res.get("flights", []) or [])
        _append_from_collection(res.get("one_way_flights", []) or [])
        _append_from_collection(res.get("outbound_flights", []) or [])
    
    # If still no flights, try nested structures
    if not flights_out and isinstance(res, dict):
        # Check for nested flight data
        if "search_parameters" in res:
            logger.info("Found search_parameters, checking for nested flight data")
        
        # Try alternative top-level keys
        for key in ['results', 'data', 'flight_results', 'flight_data']:
            if key in res:
                logger.info(f"Found alternative key: {key}")
                data = res.get(key)
                if isinstance(data, list):
                    _append_from_collection(data)
                elif isinstance(data, dict):
                    # Check if it's a nested structure
                    _append_from_collection(data.get("best_flights", []) or [])
                    _append_from_collection(data.get("other_flights", []) or [])
                    _append_from_collection(data.get("flights", []) or [])
        
        # Check for error information
        if 'error' in res:
            logger.error(f"SerpAPI error: {res.get('error')}")
        if 'search_metadata' in res:
            metadata = res.get('search_metadata', {})
            if 'status' in metadata and metadata['status'] != 'Success':
                logger.warning(f"Search metadata status: {metadata.get('status')}")

    logger.info(f"Total flights found: {len(flights_out)}")
    return flights_out

async def search_google_hotels(
    location: str,
    check_in_date: Optional[str] = None,
    check_out_date: Optional[str] = None,
    currency: str = "INR",
    gl: str = "in",
    hl: str = "en",
) -> List[Dict[str, Any]]:
    params = {
        "api_key": SERP_API_KEY,
        "engine": "google_hotels",
        "q": f"hotels in {location}",
        "currency": currency,
        "gl": gl,
        "hl": hl,
    }
    if check_in_date:
        params["check_in_date"] = check_in_date
    if check_out_date:
        params["check_out_date"] = check_out_date

    res = await _run_search_sync(params)

    hotels_out = []
    for prop in res.get("properties", []) or []:
        try:
            name = prop.get("name", "N/A")
            price = prop.get("rate_per_night", {}).get("lowest") or prop.get("price", "N/A")
            rating = prop.get("overall_rating", 0.0)
            loc = prop.get("location", {}) or prop.get("address", "N/A")
            link = prop.get("link") or prop.get("source", {}).get("link") or "#"
            # Try to extract an image/thumbnail for UI rendering
            image_url = (
                prop.get("thumbnail")
                or (prop.get("images", [{}]) or [{}])[0].get("thumbnail")
                or (prop.get("images", [{}]) or [{}])[0].get("original")
                or ""
            )

            hotels_out.append({
                "name": name,
                "price_per_night": str(price),
                "rating": float(rating) if rating else 0.0,
                "location_text": loc,
                "link": link,
                "image_url": image_url,
            })
        except Exception as e:
            logger.warning("Skipping malformed hotel entry: %s", e)
            continue
    return hotels_out

def summarize_for_ai(label: str, items: List[Dict[str, Any]], limit: int = 10) -> str:
    lines = [f"--- {label} (top {min(limit, len(items))}) ---"]
    for i, it in enumerate(items[:limit], start=1):
        if label.lower().startswith("flight"):
            lines.append(f"{i}. {it.get('airline')} | {it.get('price')} | {it.get('duration')} | {it.get('stops')} | dep: {it.get('departure_time')} arr: {it.get('arrival_time')}")
        elif label.lower().startswith("search") or label.lower().startswith("google"):
            # For general search results
            title = it.get('title', 'N/A')
            snippet = it.get('snippet', '')
            link = it.get('link', '')
            lines.append(f"{i}. {title}\n   {snippet}\n   {link}")
        else:
            lines.append(f"{i}. {it.get('name')} | {it.get('price_per_night')} | rating: {it.get('rating')} | {it.get('location_text')}")
    return "\n".join(lines)

async def search_google(
    query: str,
    location: Optional[str] = None,
    num: int = 10,
    gl: str = "in",
    hl: str = "en",
) -> List[Dict[str, Any]]:
    """
    Performs a general Google search for any query (restaurants, places, information, etc.).
    
    Parameters:
    - query: Search query (e.g., "restaurants in Mumbai", "best cafes in Paris")
    - location: Optional location to bias results (e.g., "Mumbai, India")
    - num: Number of results to return (default: 10, max: 100)
    - gl: Country code (default: in)
    - hl: Language code (default: en)
    """
    params = {
        "api_key": SERP_API_KEY,
        "engine": "google",
        "q": query,
        "num": min(num, 100),  # Cap at 100
        "gl": gl,
        "hl": hl,
    }
    
    if location:
        params["location"] = location
    
    try:
        res = await _run_search_sync(params)
        
        results = []
        
        # Extract organic results
        for item in res.get("organic_results", []) or []:
            try:
                results.append({
                    "title": item.get("title", "N/A"),
                    "snippet": item.get("snippet", ""),
                    "link": item.get("link", ""),
                    "displayed_link": item.get("displayed_link", ""),
                })
            except Exception as e:
                logger.warning("Skipping malformed search result: %s", e)
                continue
        
        # Also check answer box for direct answers
        if "answer_box" in res and res["answer_box"]:
            answer = res["answer_box"]
            results.insert(0, {
                "title": answer.get("title", "Answer"),
                "snippet": answer.get("answer", answer.get("snippet", "")),
                "link": answer.get("link", ""),
                "displayed_link": "",
            })
        
        # Check knowledge graph
        if "knowledge_graph" in res and res["knowledge_graph"]:
            kg = res["knowledge_graph"]
            results.insert(0, {
                "title": kg.get("title", ""),
                "snippet": kg.get("description", ""),
                "link": kg.get("website", ""),
                "displayed_link": "",
            })
        
        logger.info(f"Google search for '{query}' returned {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Google search failed: {e}")
        return []


# --- serp_wrapper.py code ends here ---

# --- Gemini Chatbot Code ---

travel_plan = {}  # Structured travel plan: {destination: {places: [], activities: [], days: []}}

async def find_chartered_flights(
    departure_city: str,
    arrival_city: str,
    outbound_date: str,
    return_date: Optional[str] = None,
    passengers: int = 1,
    currency: str = "INR",
) -> str:
    """
    Searches for chartered/private flight options between two cities.
    
    Parameters:
    - departure_city: City name or IATA code for departure
    - arrival_city: City name or IATA code for arrival
    - outbound_date: Departure date in YYYY-MM-DD format
    - return_date: Return date in YYYY-MM-DD format (optional)
    - passengers: Number of passengers (default: 1)
    - currency: Currency code (default: INR)
    """
    try:
        # Search for chartered flight providers
        query = f"chartered flights private jets {departure_city} to {arrival_city}"
        results = await search_google(query, location=f"{departure_city}, India", num=10)
        
        if not results:
            return f"I couldn't find chartered flight options from {departure_city} to {arrival_city}. You may want to contact private jet charter companies directly."
        
        summary = f"Chartered/Private Flight Options from {departure_city} to {arrival_city}:\n\n"
        for i, result in enumerate(results[:5], 1):
            summary += f"{i}. {result.get('title', 'N/A')}\n"
            summary += f"   {result.get('snippet', '')}\n"
            summary += f"   {result.get('link', '')}\n\n"
        
        summary += "\nNote: Chartered flights typically require direct contact with providers for pricing and availability. "
        summary += "Prices vary significantly based on aircraft type, distance, and services included."
        
        return summary
    except Exception as e:
        logger.warning("Failed to search chartered flights: %s", e)
        return f"I encountered an error searching for chartered flights. Please try contacting private jet charter companies directly."

async def find_flights(
    departure_city: str,
    arrival_city: str,
    outbound_date: str,
    return_date: Optional[str] = None,
    currency: str = "INR",
    gl: str = "in",
    hl: str = "en",
    flight_type: Optional[int] = None,
    adults: Any = 1,
    children: Any = 0,
    infants_in_seat: Any = 0,
    infants_on_lap: Any = 0,
    travel_class: Optional[Any] = None,
    stops: Optional[Any] = None,
    exclude_airlines: Optional[str] = None,
    include_airlines: Optional[str] = None,
    bags: Any = 0,
    max_price: Optional[Any] = None,
    outbound_times: Optional[str] = None,
    return_times: Optional[str] = None,
    emissions: Optional[Any] = None,
    layover_duration: Optional[str] = None,
    exclude_conns: Optional[str] = None,
    max_duration: Optional[Any] = None,
    exclude_basic: bool = False,
    deep_search: bool = False,
    sort_by: Optional[Any] = None,
):
    """
    Finds flights between two cities on a given date with optional filters.
    
    Parameters:
    - departure_city: City name or IATA code for departure
    - arrival_city: City name or IATA code for arrival
    - outbound_date: Departure date in YYYY-MM-DD format
    - return_date: Return date in YYYY-MM-DD format (optional, for round-trip)
    - currency: Currency code (default: INR)
    - gl: Country code (default: in)
    - hl: Language code (default: en)
    - flight_type: 1=Round-trip, 2=One-way, 3=Multi-city (auto-detected if not provided)
    - adults: Number of adults (default: 1)
    - children: Number of children 2-11 years (default: 0)
    - infants_in_seat: Infants in seats (default: 0)
    - infants_on_lap: Infants on lap (default: 0)
    - travel_class: 1=Economy, 2=Premium Economy, 3=Business, 4=First
    - stops: 0=Any, 1=Nonstop, 2=1 stop
    - exclude_airlines: Comma-separated airline codes or alliances to exclude
    - include_airlines: Comma-separated airline codes or alliances to include
    - bags: Number of carry-on bags
    - max_price: Maximum price in currency
    - outbound_times: Time range "4,18" (4AM-6PM dep) or "4,18,3,19" (dep+arr times)
    - return_times: Time range for return flights (same format)
    - emissions: 1=Less emissions
    - layover_duration: Min-max layover in minutes "90,330"
    - exclude_conns: Comma-separated connecting airports to exclude
    - max_duration: Maximum total duration in minutes
    - exclude_basic: Exclude basic economy (default: False)
    - deep_search: Enable deep search (default: False)
    - sort_by: 1=Top, 2=Price, 3=Dep Time, 4=Arr Time, 5=Duration, 6=Emissions
    """
    # Convert numeric parameters to integers (Gemini may pass floats)
    def to_int(val, default=0):
        if val is None:
            return default
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return default
    
    def to_int_optional(val):
        if val is None:
            return None
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None
    
    dep_iata = await get_iata_for_city(departure_city)
    arr_iata = await get_iata_for_city(arrival_city)
    flights = await search_google_flights(
        dep_iata, arr_iata, outbound_date, return_date,
        currency=currency, gl=gl, hl=hl, flight_type=to_int_optional(flight_type),
        adults=to_int(adults, 1), children=to_int(children, 0), 
        infants_in_seat=to_int(infants_in_seat, 0), infants_on_lap=to_int(infants_on_lap, 0),
        travel_class=to_int_optional(travel_class), stops=to_int_optional(stops),
        exclude_airlines=exclude_airlines, include_airlines=include_airlines,
        bags=to_int(bags, 0), max_price=to_int_optional(max_price),
        outbound_times=outbound_times, return_times=return_times,
        emissions=to_int_optional(emissions), layover_duration=layover_duration,
        exclude_conns=exclude_conns, max_duration=to_int_optional(max_duration),
        exclude_basic=exclude_basic, deep_search=deep_search,
        sort_by=to_int_optional(sort_by)
    )
    return summarize_for_ai("Flights", flights)


_aircraft_data_cache = None

def load_aircraft_data() -> List[Dict[str, Any]]:
    """Loads aircraft data from the JSON file with caching."""
    global _aircraft_data_cache
    if _aircraft_data_cache is not None:
        return _aircraft_data_cache

    try:
        # Assumes the JSON file is in the same directory as this script
        file_path = os.path.join(os.path.dirname(__file__), 'all_scraped_aircraft_data.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            _aircraft_data_cache = json.load(f)
            logger.info(f"Successfully loaded {len(_aircraft_data_cache)} aircraft records.")
            return _aircraft_data_cache
    except Exception as e:
        logger.error(f"Error loading all_scraped_aircraft_data.json: {e}")
        return []

async def find_private_jets(
    departure_city: str,
    arrival_city: str,
    outbound_date: str,
    passengers: int = 1
) -> List[Dict[str, Any]]:
    """
    Retrieves a list of available private jets.
    This tool is used when the user asks for "jets", "charter flights", or "private planes".
    
    Parameters:
    - departure_city: The city the user is departing from.
    - arrival_city: The city the user is arriving to.
    - outbound_date: The date of departure.
    - passengers: The number of people flying.
    """
    logger.info(f"Searching for private jets from {departure_city} to {arrival_city} for {passengers} passengers on {outbound_date}.")
    
    # For now, we will return the full list of jets.
    # In the future, you could add logic here to filter jets based on range, seats, etc.
    all_jets = load_aircraft_data()
    
    return all_jets



async def find_hotels(location: str, check_in_date: str, check_out_date: str):
    """Finds hotels in a given location for a given date range."""
    hotels = await search_google_hotels(location, check_in_date, check_out_date)
    return summarize_for_ai("Hotels", hotels)

async def search_web(query: str, location: Optional[str] = None, num: int = 10):
    """
    Searches the web using Google for any query. Use this for finding restaurants, cafes, 
    attractions, information, or anything else the user asks about.
    
    Parameters:
    - query: The search query (e.g., "best restaurants in Mumbai", "cafes near me", "tourist attractions in Paris")
    - location: Optional location to bias search results (e.g., "Mumbai, India")
    - num: Number of results to return (default: 10)
    """
    results = await search_google(query, location=location, num=num)
    return summarize_for_ai("Search Results", results)

async def search_images(query: str, num: int = 5) -> List[Dict[str, Any]]:
    """Searches for images using Google Images via SerpAPI."""
    params = {
        "api_key": SERP_API_KEY,
        "engine": "google",
        "q": query,
        "tbm": "isch",  # Image search
        "num": num,
        "hl": "en",
        "gl": "in",
    }
    
    try:
        res = await _run_search_sync(params)
        images = []
        for img in res.get("images_results", [])[:num]:
            images.append({
                "url": img.get("original") or img.get("link", ""),
                "thumbnail": img.get("thumbnail", ""),
                "title": img.get("title", query),
            })
        return images
    except Exception as e:
        logger.warning("Failed to search images for %s: %s", query, e)
        return []

async def generate_travel_plan(destination: str, duration_days: int = 3, interests: Optional[str] = None):
    """Generates a travel plan with places to visit and activities for a destination."""
    prompt = f"Create a {duration_days}-day travel plan for {destination}. "
    if interests:
        prompt += f"Focus on: {interests}. "
    prompt += "Include: 1) Top places to visit (with brief descriptions), 2) Activities/things to do, 3) Day-by-day itinerary. Format as a structured plan. For each major place or attraction mentioned, list it clearly with its name."
    
    try:
        GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyA2C2-YB43Mra_cleDmrblCJ-JSzd2cPfk")
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel(model_name='gemini-2.5-flash-lite')
        response = model.generate_content(prompt)
        plan_text = response.text if hasattr(response, 'text') else str(response)
        
        # Extract place names from the plan and fetch images
        # Look for common patterns like "Day 1:", "Visit", "Explore", etc.
        import re
        place_patterns = [
            r'(?:Visit|Explore|See|Go to|Check out)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|$)',
            r'###\s+(.+?)(?:\n|$)',
            r'##\s+(.+?)(?:\n|$)',
            r'\*\*([A-Z][a-zA-Z\s]+?)\*\*',
        ]
        
        places = []
        for pattern in place_patterns:
            matches = re.findall(pattern, plan_text)
            places.extend([m.strip() for m in matches if len(m.strip()) > 3 and len(m.strip()) < 50])
        
        # Remove duplicates and limit to top 10
        places = list(dict.fromkeys(places))[:10]
        
        # Fetch images for destination and top places
        images = {}
        destination_images = await search_images(f"{destination} travel destination", 3)
        if destination_images:
            images[destination] = destination_images[0].get("url", "")
        
        # Fetch images for top places
        for place in places[:5]:  # Limit to 5 places to avoid too many API calls
            place_images = await search_images(f"{place} {destination}", 1)
            if place_images:
                images[place] = place_images[0].get("url", "")
        
        # Store structured plan with images
        travel_plan[destination.lower()] = {
            "destination": destination,
            "duration_days": duration_days,
            "interests": interests,
            "plan_text": plan_text,
            "places": places,
            "activities": [],
            "days": [],
            "images": images
        }
        
        # Return plan text with image metadata (will be sent separately in structured response)
        return plan_text
    except Exception as e:
        logger.warning("Failed to generate travel plan: %s", e)
        return f"I encountered an error generating a travel plan for {destination}. Please try again."


async def main():
    """Main function to run the chatbot."""
    GOOGLE_API_KEY = "AIzaSyA2C2-YB43Mra_cleDmrblCJ-JSzd2cPfk"

    genai.configure(api_key=GOOGLE_API_KEY)
    
    # Get current date for system instruction
    from datetime import datetime
    today = datetime.now()
    today_str = today.strftime("%B %d, %Y")
    today_iso = today.strftime("%Y-%m-%d")
    
    system_instruction = f"""You are a helpful and friendly Naveo AI agent. You can answer general questions on any topic, but you specialize in helping users plan trips, find flights, hotels, restaurants, attractions, and create travel plans. When users ask about restaurants, cafes, places to visit, or any location-based information, use the search_web function to find current information. Always be helpful and informative, whether answering general questions or travel-related queries.

CURRENT DATE INFORMATION:
- Today's date is {today_str} ({today_iso})
- Use this date to interpret relative dates like "tomorrow", "next week", "next month", etc.
- When users say "tomorrow", calculate it as the day after {today_iso}
- When users say "next week", calculate it as approximately 7 days from {today_iso}
- When users say "next month", calculate it as approximately 30 days from {today_iso}
- Always convert relative dates to YYYY-MM-DD format when calling functions"""

    model = genai.GenerativeModel(
        model_name='gemini-2.5-flash-lite',
        tools=[find_flights, find_hotels, generate_travel_plan, search_web],
        system_instruction=system_instruction
    )

    chat = model.start_chat()

    print("Welcome to the Travel Assistant Chatbot!")
    print("You can ask me to find flights, hotels, restaurants, attractions, and more!")
    print("Type 'quit' to exit.")

    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            break

        response = chat.send_message(user_input)

        # Print any immediate text from the model (guarded: .text may raise if parts are non-text)
        try:
            if getattr(response, 'text', None):
                print(textwrap.indent(response.text, '> ', predicate=lambda _: True))
        except Exception:
            pass

        # Extract parts from the top candidate (SDK response shape)
        parts = []
        try:
            if getattr(response, 'candidates', None):
                cand = response.candidates[0]
                if cand and cand.content and getattr(cand.content, 'parts', None):
                    parts = cand.content.parts
            elif getattr(response, 'parts', None):
                parts = response.parts
        except Exception:
            parts = []

        for part in parts:
            if getattr(part, 'function_call', None):
                function_call = part.function_call
                function_name = function_call.name
                args = {key: value for key, value in function_call.args.items()}

                print(f"Calling function: {function_name} with args: {args}")

                if function_name == 'find_flights':
                    result = await find_flights(**args)
                elif function_name == 'find_hotels':
                    result = await find_hotels(**args)
                elif function_name == 'generate_travel_plan':
                    result = await generate_travel_plan(**args)
                elif function_name == 'search_web':
                    result = await search_web(**args)
                else:
                    result = f"Unknown function: {function_name}"

                tool_followup = chat.send_message({
                    "role": "tool",
                    "parts": [
                        {
                            "function_response": {
                                "name": function_name,
                                "response": {"result": result}
                            }
                        }
                    ]
                })
                # Print the model's follow-up after the tool result
                try:
                    if getattr(tool_followup, 'text', None):
                        print(textwrap.indent(tool_followup.text, '> ', predicate=lambda _: True))
                    else:
                        fp = []
                        if getattr(tool_followup, 'candidates', None):
                            tc = tool_followup.candidates[0]
                            if tc and tc.content and getattr(tc.content, 'parts', None):
                                fp = tc.content.parts
                        elif getattr(tool_followup, 'parts', None):
                            fp = tool_followup.parts
                        for p in fp:
                            if getattr(p, 'text', None):
                                print(textwrap.indent(p.text, '> ', predicate=lambda _: True))
                except Exception:
                    pass

            elif getattr(part, 'text', None):
                print(textwrap.indent(part.text, '> ', predicate=lambda _: True))

if __name__ == "__main__":
    asyncio.run(main())