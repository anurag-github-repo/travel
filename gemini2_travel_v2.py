import os
import uvicorn
import asyncio
import logging
import re
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from serpapi import GoogleSearch
from crewai import Agent, Task, Crew
from datetime import datetime, timedelta
from functools import lru_cache

# Load API Keys
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyA2C2-YB43Mra_cleDmrblCJ-JSzd2cPfk")
SERP_API_KEY = os.getenv("SERP_API_KEY", "0c05012f41e43d4f77923b240810779b7251f4b12b3fcc08368d79c195bbc5a5")

# Initialize Logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- LLM Initialization ---
@lru_cache(maxsize=1)
def initialize_llm():
    from crewai import LLM
    return LLM(model="gemini/gemini-2.0-flash", api_key=GEMINI_API_KEY)

# --- Pydantic Models ---
class FlightRequest(BaseModel): origin: str; destination: str; outbound_date: str; return_date: str
class HotelRequest(BaseModel): location: str; check_in_date: str; check_out_date: str
class ItineraryRequest(BaseModel): destination: str; check_in_date: str; check_out_date: str; flights: str; hotels: str
class GeneralQueryRequest(BaseModel): destination: str; query: str
class FlightInfo(BaseModel): airline: str; price: str; duration: str; stops: str; departure: str; arrival: str; travel_class: str; return_date: str; airline_logo: str
class HotelInfo(BaseModel): name: str; price: str; rating: float; location: str; link: str
class AIResponse(BaseModel):
    flights: List[FlightInfo] = Field(default_factory=list); hotels: List[HotelInfo] = Field(default_factory=list)
    ai_flight_recommendation: str = ""; ai_hotel_recommendation: str = ""
    itinerary: str = ""; general_answer: Optional[str] = None
class ParseQueryRequest(BaseModel): query: str
class ParsedTravelDetails(BaseModel):
    origin: Optional[str] = None; destination: Optional[str] = None
    outbound_date: Optional[str] = None; days: Optional[int] = None
    success: bool = False; error: Optional[str] = None

app = FastAPI(title="Travel Planning API", version="1.7.0")

# --- IATA Code Handling ---
CITY_TO_IATA = { "mumbai": "BOM", "hyderabad": "HYD", "delhi": "DEL", "bangalore": "BLR", "chennai": "MAA", "kolkata": "CCU", "pune": "PNQ", "goa": "GOI", "ahmedabad": "AMD", "kochi": "COK", "jaipur": "JAI", "udaipur": "UDR", "vadodara": "BDQ" }

async def run_search(params):
    try: return await asyncio.to_thread(lambda: GoogleSearch(params).get_dict())
    except Exception as e: raise HTTPException(status_code=500, detail=f"Search API error: {e}")

async def convert_city_to_location_id(city_name: str) -> str:
    city_lower = city_name.lower().strip()
    if len(city_lower) == 3 and city_lower.isalpha(): return city_lower.upper()
    if city_lower in CITY_TO_IATA: return CITY_TO_IATA[city_lower]
    try:
        logger.info(f"Dynamically searching for IATA code for {city_name}")
        params = {"api_key": SERP_API_KEY, "engine": "google", "q": f"{city_name} airport IATA code"}
        search_results = await run_search(params)
        text_to_search = str(search_results.get("answer_box", "")) + str(search_results.get("organic_results", ""))
        matches = re.findall(r'\b([A-Z]{3})\b', text_to_search)
        if matches:
            iata_code = matches[0]; CITY_TO_IATA[city_lower] = iata_code
            logger.info(f"Found and cached IATA code for {city_name}: {iata_code}")
            return iata_code
    except Exception as e: logger.warning(f"Dynamic IATA search failed for {city_name}: {e}")
    logger.error(f"Could not find IATA code for {city_name}. Using original name.")
    return city_name

# --- Data Fetching ---
async def search_flights(req: FlightRequest):
    origin = await convert_city_to_location_id(req.origin)
    destination = await convert_city_to_location_id(req.destination)
    params = { "api_key": SERP_API_KEY, "engine": "google_flights", "hl": "en", "gl": "in", "departure_id": origin, "arrival_id": destination, "outbound_date": req.outbound_date, "return_date": req.return_date, "currency": "INR" }
    res = await run_search(params)
    if "error" in res: return {"error": res["error"]}
    return [FlightInfo(**{
        "airline": f.get("flights")[0].get("airline", "N/A"), "price": str(f.get("price", "N/A")),
        "duration": f"{f.get('total_duration', 'N/A')} min", "stops": "Nonstop" if len(f["flights"]) == 1 else f"{len(f['flights']) - 1} stop(s)",
        "departure": f.get("flights")[0].get("departure_airport", {}).get("time", "N/A"), "arrival": f.get("flights")[0].get("arrival_airport", {}).get("time", "N/A"),
        "travel_class": f.get("flights")[0].get("travel_class", "Economy"), "return_date": req.return_date,
        "airline_logo": f.get("flights")[0].get("airline_logo", "")
    }) for f in res.get("best_flights", []) if f.get("flights")]

async def search_hotels(req: HotelRequest):
    params = { "api_key": SERP_API_KEY, "engine": "google_hotels", "q": f"hotels in {req.location}", "hl": "en", "gl": "in", "check_in_date": req.check_in_date, "check_out_date": req.check_out_date, "currency": "INR" }
    res = await run_search(params)
    if "error" in res: return {"error": res["error"]}
    return [HotelInfo(**{
        "name": h.get("name", "N/A"), "price": h.get("rate_per_night", {}).get("lowest", "N/A"),
        "rating": h.get("overall_rating", 0.0), "location": h.get("location", "N/A"), "link": h.get("link", "#")
    }) for h in res.get("properties", [])]

# --- AI Crew Tasks ---
async def run_crew_task(agent, task):
    crew = Crew(agents=[agent], tasks=[task], verbose=False)
    return await asyncio.to_thread(crew.kickoff)

# --- API Endpoints ---
@app.post("/search_flights/", response_model=AIResponse)
async def ep_search_flights(req: FlightRequest):
    flights = await search_flights(req)
    if isinstance(flights, dict): raise HTTPException(400, flights["error"])
    if not flights: raise HTTPException(404, "No flights found")
    agent = Agent(role="AI Flight Analyst", goal="Recommend the best flight.", backstory="An expert AI travel analyst.", llm=initialize_llm())
    # --- THIS IS THE FIX ---
    task = Task(
        description=f"Analyze and recommend the best flight from the data based on price (INR) and convenience.\nData:\n{flights}",
        agent=agent,
        expected_output="A concise, single-paragraph recommendation for the best flight option." # Added required field
    )
    rec = await run_crew_task(agent, task)
    return AIResponse(flights=flights, ai_flight_recommendation=str(rec))

@app.post("/search_hotels/", response_model=AIResponse)
async def ep_search_hotels(req: HotelRequest):
    hotels = await search_hotels(req)
    if isinstance(hotels, dict): raise HTTPException(400, hotels["error"])
    if not hotels: raise HTTPException(404, "No hotels found")
    agent = Agent(role="AI Hotel Analyst", goal="Recommend the best hotel.", backstory="An expert AI travel analyst.", llm=initialize_llm())
    # --- THIS IS THE FIX ---
    task = Task(
        description=f"Analyze and recommend the best hotel from the data based on price (INR), rating, and location.\nData:\n{hotels}",
        agent=agent,
        expected_output="A concise, single-paragraph recommendation for the best hotel option." # Added required field
    )
    rec = await run_crew_task(agent, task)
    return AIResponse(hotels=hotels, ai_hotel_recommendation=str(rec))

@app.post("/generate_itinerary/", response_model=AIResponse)
async def ep_generate_itinerary(req: ItineraryRequest):
    days = (datetime.strptime(req.check_out_date, "%Y-%m-%d") - datetime.strptime(req.check_in_date, "%Y-%m-%d")).days
    agent = Agent(role="AI Travel Planner", goal="Create a detailed itinerary.", backstory="An expert travel planner.", llm=initialize_llm())
    task = Task(
        description=f"Create a {days}-day itinerary for {req.destination}. Use provided flight ({req.flights}) and hotel ({req.hotels}) info. Use markdown.",
        agent=agent,
        expected_output="A well-structured itinerary in markdown format."
    )
    itinerary = await run_crew_task(agent, task)
    return AIResponse(itinerary=str(itinerary))

@app.post("/complete_search/", response_model=AIResponse)
async def ep_complete_search(req: FlightRequest):
    hotel_req = HotelRequest(location=req.destination, check_in_date=req.outbound_date, check_out_date=req.return_date)
    flight_task, hotel_task = asyncio.create_task(ep_search_flights(req)), asyncio.create_task(ep_search_hotels(hotel_req))
    flight_res, hotel_res = await asyncio.gather(flight_task, hotel_task, return_exceptions=True)
    final = AIResponse()
    f_text, h_text = "Not available.", "Not available."
    if not isinstance(flight_res, Exception): final.flights, final.ai_flight_recommendation, f_text = flight_res.flights, flight_res.ai_flight_recommendation, str(flight_res.flights)
    if not isinstance(hotel_res, Exception): final.hotels, final.ai_hotel_recommendation, h_text = hotel_res.hotels, hotel_res.ai_hotel_recommendation, str(hotel_res.hotels)
    if not isinstance(flight_res, Exception) and not isinstance(hotel_res, Exception):
        final.itinerary = (await ep_generate_itinerary(ItineraryRequest(destination=req.destination, check_in_date=req.outbound_date, check_out_date=req.return_date, flights=f_text, hotels=h_text))).itinerary
    return final

@app.post("/parse_travel_query/", response_model=ParsedTravelDetails)
async def ep_parse_travel_query(req: ParseQueryRequest):
    try:
        today = datetime.now()
        prompt = f"""
        You are a precise information extraction AI. From the user's query, extract travel details and return ONLY a JSON object.
        Current date is {today.strftime('%Y-%m-%d')}.
        CRITICAL RULE: If any piece of information is NOT in the query, you MUST use a `null` value. Do not guess.
        QUERY: "{req.query}"
        Fields: "origin", "destination", "outbound_date" (YYYY-MM-DD), "days" (integer).
        For dates, if no year is given, use {today.year} unless the date has passed, then use {today.year + 1}.
        Example for "mumbai to udaipur": {{"origin": "Mumbai", "destination": "Udaipur", "outbound_date": null, "days": null}}
        """
        agent = Agent(role="Query Parser", goal="Extract info precisely.", backstory="An expert in parsing queries without assuming.", llm=initialize_llm())
        task = Task(description=prompt, agent=agent, expected_output="A valid JSON with null for missing fields.")
        results = await run_crew_task(agent, task)
        json_str = re.search(r'\{.*\}', str(results), re.DOTALL)
        if not json_str: return ParsedTravelDetails(success=False, error="No JSON found.")
        data = json.loads(json_str.group(0)); data["success"] = True
        return ParsedTravelDetails(**data)
    except Exception as e:
        logger.error(f"Error parsing query: {e}")
        return ParsedTravelDetails(success=False, error=str(e))

@app.post("/general_travel_query/", response_model=AIResponse)
async def ep_general_travel_query(req: GeneralQueryRequest):
    logger.info(f"Handling general query: {req.query}")
    agent = Agent(
        role="Friendly Travel Assistant AI",
        goal="Answer the user's question clearly. If the question is about your identity, introduce yourself as an AI travel planner.",
        backstory="You are a helpful AI assistant. Your purpose is to help users plan trips or answer their questions.",
        llm=initialize_llm()
    )
    task = Task(
        description=f"A user asks: '{req.query}'. Formulate a helpful, direct response.",
        agent=agent,
        expected_output="A friendly and helpful answer. For a question like 'what are you', the answer MUST be 'I am an AI travel planner, here to help you organize your trip!'."
    )
    answer = await run_crew_task(agent, task)
    final_answer = str(answer).strip()
    if not final_answer or final_answer.lower() == req.query.lower():
        final_answer = "I am an AI travel planner, built to help you organize your trip. To get started, you can tell me where you'd like to go."
    return AIResponse(general_answer=final_answer)

# --- Server Execution ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)