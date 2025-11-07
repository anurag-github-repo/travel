import os
import asyncio
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

import google.generativeai as genai
from travel_chatbot import logger as app_logger

from travel_chatbot import (
    find_flights,
    find_hotels,
    generate_travel_plan,
    search_web,
)

# Initialize Gemini model (reuse same model as CLI but here as API singleton)
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyA2C2-YB43Mra_cleDmrblCJ-JSzd2cPfk")
genai.configure(api_key=GOOGLE_API_KEY)

def get_system_instruction() -> str:
    """Generate system instruction with current date."""
    from datetime import datetime
    today = datetime.now()
    today_str = today.strftime("%B %d, %Y")  # e.g., "January 15, 2025"
    today_iso = today.strftime("%Y-%m-%d")  # e.g., "2025-01-15"
    
    return f"""You are a friendly, conversational travel assistant with a warm personality. You help users plan amazing trips! 🌍✈️

CURRENT DATE INFORMATION:
- Today's date is {today_str} ({today_iso})
- Use this date to interpret relative dates like "tomorrow", "next week", "next month", etc.
- When users say "tomorrow", calculate it as the day after {today_iso}
- When users say "next week", calculate it as approximately 7 days from {today_iso}
- When users say "next month", calculate it as approximately 30 days from {today_iso}
- Always convert relative dates to YYYY-MM-DD format when calling functions

PERSONALITY:
- Be enthusiastic and friendly (use emojis naturally: ✈️ 🏨 🌴 🎉)
- Ask questions conversationally, not robotically
- Show excitement about travel destinations
- Be helpful and proactive

CONVERSATION STYLE:
- "Awesome! 🇸🇬 When exactly do you plan to travel?"
- "Perfect — 5 days in Singapore. How many people are traveling?"
- "Great, here are top flight options ✈️"
- "Then Singapore Airlines is your best pick — smooth morning departure!"

CRITICAL RULES:
1. When user provides only one date, ask: "Is this a round trip or one-way? If round trip, what's your return date?"
2. For round-trip flights, you NEED both outbound_date and return_date. For one-way, only outbound_date is needed.
3. Remember all information from conversation (origin, destination, dates, passengers, budget)
4. When user says "show me hotels/travel plan", use stored context automatically
5. Present results in a friendly, organized way with emojis
6. When users mention relative dates (tomorrow, next week, next month), convert them to actual dates using today's date ({today_iso})

Example conversation:
User: "I'm planning a trip to Singapore next month"
You: "Awesome! 🇸🇬 When exactly do you plan to travel, and where are you flying from?"
User: "From Mumbai, Dec 10 to Dec 15"
You: "Perfect — 5 days in Singapore. How many people are traveling?"

Always be conversational, helpful, and remember context!"""

_model = genai.GenerativeModel(
    model_name='gemini-2.5-flash-lite',
    tools=[find_flights, find_hotels, generate_travel_plan, search_web],
    system_instruction=get_system_instruction()
)

# Per-session chat store in memory
chat_sessions: Dict[str, Any] = {}
session_contexts: Dict[str, Dict[str, Any]] = {}  # Store context for each session

def get_chat(session_id: str):
    chat = chat_sessions.get(session_id)
    if chat is None:
        # Create a new model instance with updated date for new sessions
        # Note: We could recreate _model here, but it's expensive. Instead, we'll add date context in messages
        chat = _model.start_chat()
        chat_sessions[session_id] = chat
        session_contexts[session_id] = {
            "origin": "",
            "destination": "",
            "depart_date": "",
            "return_date": "",
            "passengers": 1,
            "round_trip": True
        }
    return chat

def get_context(session_id: str) -> Dict[str, Any]:
    if session_id not in session_contexts:
        session_contexts[session_id] = {
            "origin": "",
            "destination": "",
            "depart_date": "",
            "return_date": "",
            "passengers": 1,
            "round_trip": True
        }
    return session_contexts[session_id]

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    text: str
    tool_calls: List[Dict[str, Any]] = []
    tool_results: List[Dict[str, Any]] = []

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static frontend under /static and map root to index.html
static_dir = os.path.join(os.path.dirname(__file__), 'static')
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir, html=False), name="static")

@app.get("/")
def index():
    return FileResponse(os.path.join(static_dir, 'index.html'))

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/logs")
def get_logs(n: int = Query(200, ge=1, le=5000)):
    log_path = os.path.join(os.path.dirname(__file__), 'logs', 'app.log')
    if not os.path.exists(log_path):
        return {"lines": []}
    with open(log_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()[-n:]
    return {"lines": [line.rstrip('\n') for line in lines]}

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    chat = get_chat(req.session_id)
    context = get_context(req.session_id)
    
    # Enhance message with context for follow-up queries
    enhanced_message = req.message
    msg_lower = req.message.lower()
    
    # Intelligently enhance message with context - be more aggressive
    # If user asks for hotels, directly provide full context
    if any(word in msg_lower for word in ["hotel", "accommodation", "stay", "lodging", "show me hotels"]):
        if context.get("destination") and context.get("depart_date"):
            if context.get("return_date"):
                enhanced_message = f"Find hotels in {context['destination']} from {context['depart_date']} to {context['return_date']}"
            else:
                enhanced_message = f"Find hotels in {context['destination']} from {context['depart_date']}"
    
    # If user asks for travel plan, directly provide full context
    if any(word in msg_lower for word in ["travel plan", "plan", "places to visit", "things to do", "activities", "show me travel plan"]):
        if context.get("destination"):
            days = 3
            if context.get("depart_date") and context.get("return_date"):
                try:
                    from datetime import datetime
                    dep = datetime.strptime(context['depart_date'], '%Y-%m-%d')
                    ret = datetime.strptime(context['return_date'], '%Y-%m-%d')
                    days = (ret - dep).days
                    if days < 1:
                        days = 3
                except:
                    pass
            enhanced_message = f"Create a {days}-day travel plan for {context['destination']} with places to visit and activities. Do not ask for additional information."
    
    # For flights - don't auto-assume dates, let the model ask if needed
    # Only enhance if we have BOTH dates
    if any(word in msg_lower for word in ["flight", "flights", "show me flights"]) and ("show" in msg_lower or "find" in msg_lower or "also" in msg_lower or "direct" in msg_lower):
        if context.get("origin") and context.get("destination") and context.get("depart_date") and context.get("return_date"):
            if "direct" in msg_lower or "nonstop" in msg_lower:
                enhanced_message = f"Find flights from {context['origin']} to {context['destination']} on {context['depart_date']} returning on {context['return_date']}. Prefer nonstop flights."
            else:
                enhanced_message = f"Find flights from {context['origin']} to {context['destination']} on {context['depart_date']} returning on {context['return_date']}"
    
    # Handle "also" requests - if user says "show me X and Y also", create combined request
    if "also" in msg_lower or "and" in msg_lower:
        needs_hotels = any(word in msg_lower for word in ["hotel", "accommodation", "stay"])
        needs_plan = any(word in msg_lower for word in ["travel plan", "plan", "places", "activities"])
        needs_flights = any(word in msg_lower for word in ["flight", "flights"])
        
        # Build combined request
        requests = []
        if needs_flights and context.get("origin") and context.get("destination") and context.get("depart_date"):
            if context.get("return_date"):
                requests.append(f"Find flights from {context['origin']} to {context['destination']} on {context['depart_date']} returning on {context['return_date']}")
            else:
                requests.append(f"Find flights from {context['origin']} to {context['destination']} on {context['depart_date']}")
        
        if needs_hotels and context.get("destination") and context.get("depart_date"):
            if context.get("return_date"):
                requests.append(f"Find hotels in {context['destination']} from {context['depart_date']} to {context['return_date']}")
            else:
                requests.append(f"Find hotels in {context['destination']} from {context['depart_date']}")
        
        if needs_plan and context.get("destination"):
            days = 3
            if context.get("depart_date") and context.get("return_date"):
                try:
                    from datetime import datetime
                    dep = datetime.strptime(context['depart_date'], '%Y-%m-%d')
                    ret = datetime.strptime(context['return_date'], '%Y-%m-%d')
                    days = (ret - dep).days
                    if days < 1:
                        days = 3
                except:
                    pass
            requests.append(f"Create a {days}-day travel plan for {context['destination']} with places to visit and activities. Do not ask for additional information.")
        
        if requests:
            enhanced_message = ". ".join(requests) + ". Execute all these requests immediately without asking questions."
    
    # Log the enhancement for debugging
    if enhanced_message != req.message:
        app_logger.info(f"Enhanced message: '{req.message}' -> '{enhanced_message}' (context: {context})")

    # Add current date context to the message if it contains relative dates
    from datetime import datetime
    today = datetime.now()
    today_iso = today.strftime("%Y-%m-%d")
    today_str = today.strftime("%B %d, %Y")
    
    # Check if message contains relative date keywords
    relative_date_keywords = ['tomorrow', 'next week', 'next month', 'next year', 'today', 'yesterday']
    if any(keyword in enhanced_message.lower() for keyword in relative_date_keywords):
        enhanced_message = f"[Current date: {today_str} ({today_iso})] {enhanced_message}"
    
    # Send enhanced message
    response = chat.send_message(enhanced_message)

    out_text = ""
    tool_calls: List[Dict[str, Any]] = []
    tool_results: List[Dict[str, Any]] = []

    # Try to capture any immediate text
    try:
        if getattr(response, 'text', None):
            out_text = response.text or ""
    except Exception:
        pass

    # Extract parts from top candidate
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

    # Handle text parts (general queries) - avoid duplicates
    text_parts_seen = set()
    for part in parts:
        if getattr(part, 'text', None) and not getattr(part, 'function_call', None):
            part_text = (part.text or "").strip()
            if part_text:
                # Normalize text for comparison (remove extra whitespace)
                normalized = " ".join(part_text.split())
                if normalized not in text_parts_seen:
                    text_parts_seen.add(normalized)
                    # Only add if it's not a duplicate question when we have context
                    isDuplicateQuestion = False
                    if context.get("depart_date") or context.get("destination"):
                        isDuplicateQuestion = (
                            "When would you like to travel" in normalized or
                            "When do you want to travel" in normalized or
                            "What dates would you like" in normalized or
                            normalized == "When would you like to travel?" or
                            normalized == "When do you want to travel?"
                        )
                    if not isDuplicateQuestion:
                        if out_text:
                            out_text += "\n\n" + part_text
                        else:
                            out_text = part_text
    
    # Final deduplication: remove duplicate sentences/paragraphs
    if out_text:
        lines = [line.strip() for line in out_text.split('\n') if line.strip()]
        seen_lines = set()
        unique_lines = []
        for line in lines:
            normalized_line = " ".join(line.split())
            if normalized_line not in seen_lines:
                seen_lines.add(normalized_line)
                unique_lines.append(line)
        out_text = "\n".join(unique_lines) if unique_lines else out_text

    # Handle tool calls
    for part in parts:
        if getattr(part, 'function_call', None):
            fc = part.function_call
            fn = fc.name
            args = {k: v for k, v in fc.args.items()}
            tool_calls.append({"name": fn, "args": args})

            # Execute tool
            result = None
            structured = None
            
            if fn == 'find_flights':
                # Validate required arguments
                if not args.get('departure_city') or not args.get('arrival_city') or not args.get('outbound_date'):
                    result = "Missing required information: departure city, arrival city, and outbound date are required."
                    structured = None
                else:
                    flights = []
                    route = None
                    # Update context
                    context["origin"] = args.get('departure_city', context.get("origin", ""))
                    context["destination"] = args.get('arrival_city', context.get("destination", ""))
                    context["depart_date"] = args.get('outbound_date', context.get("depart_date", ""))
                    context["return_date"] = args.get('return_date', context.get("return_date", ""))
                    context["round_trip"] = args.get('return_date') is not None
                    
                    # Get structured flights for UI first
                    try:
                        from travel_chatbot import get_iata_for_city, search_google_flights, get_city_coords
                        dep = await get_iata_for_city(args.get('departure_city'))
                        arr = await get_iata_for_city(args.get('arrival_city'))
                        app_logger.info(f"Searching flights: {dep} -> {arr} on {args.get('outbound_date')}")
                        flights = await search_google_flights(dep, arr, args.get('outbound_date'), args.get('return_date'))
                        app_logger.info(f"Found {len(flights)} flights")
                        route = {
                            "from": {"city": args.get('departure_city'), **(get_city_coords(args.get('departure_city')) or {})},
                            "to": {"city": args.get('arrival_city'), **(get_city_coords(args.get('arrival_city')) or {})}
                        }
                    except Exception as e:
                        app_logger.error(f"Error searching flights: {e}", exc_info=True)
                        flights = []
                        route = None
                    
                    # Get summary text from find_flights (which also does the search internally)
                    try:
                        result = await find_flights(**args)
                    except TypeError as e:
                        app_logger.error(f"Error calling find_flights with args {args}: {e}", exc_info=True)
                        result = f"Error searching for flights: {str(e)}"
                        flights = []
                        route = None
                    
                    structured: Optional[Dict[str, Any]] = {"flights": flights, "route": route}
                    
                    # Use the result text from find_flights, which has the flight summary
                    if result and not out_text:
                        out_text = result
                    elif result and out_text:
                        out_text += "\n\n" + result
            elif fn == 'find_hotels':
                # Update context
                location = args.get('location', '')
                if location:
                    context["destination"] = location
                if args.get('check_in_date'):
                    context["depart_date"] = args.get('check_in_date')
                if args.get('check_out_date'):
                    context["return_date"] = args.get('check_out_date')
                
                # For UI, return the structured hotels array as well
                from travel_chatbot import search_google_hotels
                hotels = await search_google_hotels(args.get('location'), args.get('check_in_date'), args.get('check_out_date'))
                result = "\n".join([
                    "--- Hotels (top {0}) ---".format(min(5, len(hotels))),
                    *[f"{i+1}. {h.get('name')} | {h.get('price_per_night')} | rating: {h.get('rating')} | {h.get('location_text')}" for i, h in enumerate(hotels[:5])]
                ])
                structured = {"hotels": hotels}
                if not hotels:
                    friendly = (
                        f"I couldn't find hotels in {args.get('location')}"
                        + (f" from {args.get('check_in_date')} to {args.get('check_out_date')}" if args.get('check_in_date') else "")
                        + ". Try different dates or a nearby area."
                    )
                    if out_text:
                        out_text += "\n\n" + friendly
                    else:
                        out_text = friendly
            elif fn == 'generate_travel_plan':
                # Update context
                destination = args.get('destination', '')
                if destination:
                    context["destination"] = destination
                
                result = await generate_travel_plan(**args)
                structured = {"travel_plan": result}
            elif fn == 'search_web':
                result = await search_web(**args)
                # Get structured search results
                from travel_chatbot import search_google
                query = args.get('query', '')
                location = args.get('location')
                num = args.get('num', 10)
                search_results = await search_google(query, location=location, num=num)
                structured = {"search_results": search_results}
            else:
                result = f"Unknown function: {fn}"
                structured = None

            tr = {"name": fn, "result": result, **({} if not structured else structured)}
            tool_results.append(tr)
            try:
                app_logger.info("Tool executed: %s | args=%s | result_len=%s", fn, args, (len(tr.get('hotels', [])) if 'hotels' in tr else len(tr.get('flights', [])) if 'flights' in tr else 'n/a'))
            except Exception:
                pass

            # Send tool result back to model
            follow = chat.send_message({
                "role": "tool",
                "parts": [
                    {
                        "function_response": {
                            "name": fn,
                            "response": {"result": result}
                        }
                    }
                ]
            })
            try:
                if getattr(follow, 'text', None):
                    if out_text:
                        out_text += "\n\n" + (follow.text or "")
                    else:
                        out_text = follow.text or ""
            except Exception:
                pass

    try:
        app_logger.info("/chat session=%s msg=%s | tool_calls=%s | tool_results=%s", req.session_id, req.message, len(tool_calls), len(tool_results))
    except Exception:
        pass

    # Ensure we always return some helpful text even if the model returned none
    if not out_text:
        summary_bits = []
        for tr in tool_results:
            if tr.get('flights') is not None:
                summary_bits.append(f"Flights found: {len(tr.get('flights') or [])}")
            if tr.get('hotels') is not None:
                summary_bits.append(f"Hotels found: {len(tr.get('hotels') or [])}")
            if tr.get('travel_plan'):
                summary_bits.append("Travel plan created")
        if summary_bits:
            out_text = "; ".join(summary_bits)

    return ChatResponse(text=out_text, tool_calls=tool_calls, tool_results=tool_results)


