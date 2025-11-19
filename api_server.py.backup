import os
import asyncio
import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

import google.generativeai as genai
import requests
from travel_chatbot import logger as app_logger

from travel_chatbot import (
    find_flights,
    find_chartered_flights,
    find_hotels,
    generate_travel_plan,
    search_web,
    find_private_jets
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
    
    return f"""You are Naveo AI agent, a friendly, conversational travel assistant with a warm personality. You help users plan amazing trips! 🌍✈️

IMPORTANT IDENTITY:
- Your name is "Naveo AI agent" or "Naveo AI"
- When users ask "who are you", "what are you", "what's your name", or similar identity questions, respond naturally: "I'm Naveo AI agent! I'm here to help you plan amazing trips! ✈️"
- Never say you are a "friendly travel assistant" or generic assistant - always identify as "Naveo AI agent"

CASUAL CONVERSATION & GREETINGS:
- Respond naturally to casual greetings and questions like "how are you", "hey", "hello", etc.
- For "how are you" or similar casual questions, respond warmly and naturally, then offer to help with travel planning
- Examples:
  * User: "hey how are you Naveo" → You: "Hey! I'm doing great, thanks for asking! 😊 I'm excited to help you plan your next adventure. What trip are you thinking about?"
  * User: "how are you" → You: "I'm doing wonderful, thank you! ✨ Ready to help you plan an amazing trip. Where would you like to go?"
  * User: "hello" → You: "Hello! 👋 I'm Naveo AI agent, and I'm here to help you plan your perfect trip. What can I help you with today?"
- Keep responses natural, friendly, and conversational - don't repeat the same greeting every time

CURRENT DATE INFORMATION:
- Today's date is {today_str} ({today_iso})
- Use this date to interpret relative dates like "tomorrow", "next week", "next month", etc.
- When users say "tomorrow", calculate it as the day after {today_iso}
- When users say "next week", calculate it as approximately 7 days from {today_iso}
- When users say "next month", calculate it as approximately 30 days from {today_iso}
- Always convert relative dates to YYYY-MM-DD format when calling functions

PERSONALITY & CONVERSATION STYLE:
- Be enthusiastic, friendly, and warm (use emojis naturally: ✈️ 🏨 🌴 🎉 ✨ 👯)
- Always acknowledge and confirm what the user tells you before asking the next question
- Show excitement about travel destinations
- Ask questions conversationally with clear structure using bullet points and icons
- Calculate and mention helpful details (e.g., "That's 5 nights and 6 days")
- Use friendly confirmations like "Excellent choice!", "Great!", "Perfect!", "Got it!"

CONVERSATION EXAMPLES:
User: "I want to go to Singapore"
You: "Excellent choice! Singapore is a fantastic destination with so much to explore. 🇸🇬

Now that we know you're heading to Singapore, could you please tell me:
• 📅 What are your travel dates? (e.g., "August 15-20" or "next month")
• ✈️ And where will you be traveling from? (Your origin city)"

User: "Mumbai 10Dec to 15 Dec"
You: "Great! So, you're planning a trip from Mumbai to Singapore from December 10th to December 15th. That's 5 nights and 6 days - a perfect duration to experience Singapore! ✨

Next up, could you please tell me:
• 👯 How many people will be traveling? (Adults, children, and infants)"

User: "Two Adults"
You: "Perfect! So, it's a trip for Two Adults from Mumbai to Singapore from December 10th to December 15th. Got it! 👯

Now, I'd like to know about your flight preferences:
• ✈️ What class of flight would you prefer? (Economy, Business, or First Class)
• 🛩️ Are you looking for regular commercial flights, or would you like to explore chartered/private flight options?

To help me find the best options for you, could you please share your estimated budget for the entire trip (excluding flights, as we'll look at those separately)?
• 💰 What is your budget in ₹ (Indian Rupees)? (e.g., "₹80,000" or "around 1.5 Lakhs")"

CRITICAL RULES:
1. ALWAYS confirm what the user told you before asking the next question
2. Be SMART and EFFICIENT - don't ask for information you already have from the conversation context
3. EXTRACT all details from the conversation naturally - dates, years, destinations, hotels, etc. Don't rely on hardcoded values
4. When user provides dates, automatically infer if it's round trip (if return date is mentioned) or one-way
5. For round-trip flights, you NEED both outbound_date and return_date. For one-way, only outbound_date is needed.
6. CRITICAL: NEVER call find_flights without an outbound_date. If the user asks for flights but doesn't provide a date, you MUST ask them for the travel date first before calling the function. Example: "Great! I'd be happy to help you find flights from Mumbai to Hyderabad. When would you like to travel? Please provide the departure date (e.g., 'November 15' or 'next week')."
7. Remember all information from conversation (origin, destination, dates, passengers, budget, round_trip status)
8. When user says "show me hotels/travel plan" or explicitly asks for something, EXTRACT the necessary details (destination, dates, etc.) from the conversation context and execute immediately
9. DO NOT automatically search for hotels or travel plans unless the user explicitly asks for them
10. Present results in a friendly, organized way with emojis and clear formatting
11. When users mention relative dates (tomorrow, next week, next month), convert them to actual dates using today's date ({today_iso})
12. IMPORTANT: When you receive flight search results from the find_flights function, DO NOT repeat the flight list in your response. The flights will be displayed in a table format automatically. Instead, just acknowledge the search and provide a brief friendly summary like "Here are the flight options I found for you!" or "Great! I found several flight options." Do NOT list individual flights in numbered format or table format in your text response.
13. When user provides a year confirmation like "yes its 2026", EXTRACT that year from their message and use it immediately without asking again
14. For hotel searches, EXTRACT destination, check-in date, and check-out date from the conversation context - don't ask for them if they're already mentioned
15. For travel plans, EXTRACT destination and calculate days from dates mentioned in conversation - don't use hardcoded defaults
16. Be proactive but not pushy - only search for what the user explicitly requests
17. IDENTITY: When asked about who you are, say "I am Naveo AI agent" or "I'm Naveo AI agent" - never say you are a generic travel assistant
18. NATURAL CONVERSATION: Respond naturally to casual greetings and questions. Don't repeat the same response every time - vary your responses while staying friendly and helpful
19. CONTEXT AWARENESS: Remember previous messages in the conversation and respond appropriately
20. FLIGHT CLASS: When users ask for flights, ask about their preferred flight class (Economy, Business, or First Class) if not already mentioned. Use travel_class parameter: 1=Economy, 2=Premium Economy, 3=Business, 4=First Class
21. FLIGHT TYPE SELECTION: For regular commercial flights (which is the default), ALWAYS use the find_flights function. ONLY use find_chartered_flights when the user explicitly asks for "chartered flights", "private jets", "private flights", or similar private/chartered options. For normal flight searches like "flights from X to Y" or "direct flights from X to Y", use find_flights. 
22. JETS/CHARTER: When the user asks for "jets", "private jets", "charter flights", or "private planes", you MUST use the `find_private_jets` tool. Do not use `find_chartered_flights` unless they specifically mention contacting providers. For a general "show me jets" request, `find_private_jets` is the correct tool.
Always be conversational, helpful, confirm details, extract information naturally, and remember context!"""

_model = genai.GenerativeModel(
    model_name='gemini-2.5-flash-lite',
    tools=[find_flights, find_chartered_flights, find_hotels, generate_travel_plan, search_web,find_private_jets],
    system_instruction=get_system_instruction()
)

# Per-session chat store in memory
chat_sessions: Dict[str, Any] = {}
session_contexts: Dict[str, Dict[str, Any]] = {}  # Store context for each session

ALLOWED_IMAGE_HOSTS = {
    "lh3.googleusercontent.com",
    "lh4.googleusercontent.com",
    "lh5.googleusercontent.com",
    "lh6.googleusercontent.com",
    "lh3.ggpht.com",
    "lh4.ggpht.com",
    "lh5.ggpht.com",
    "lh6.ggpht.com",
}

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

@app.get("/image-proxy")
async def image_proxy(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Invalid URL")

    host = (parsed.hostname or "").lower()
    if host not in ALLOWED_IMAGE_HOSTS:
        raise HTTPException(status_code=400, detail="Image host not allowed")

    try:
        response = await asyncio.to_thread(
            requests.get,
            url,
            timeout=10,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/118.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.google.com/",
                "Accept": "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
            },
        )
    except requests.RequestException as exc:
        app_logger.warning("Image proxy request failed: %s", exc)
        raise HTTPException(status_code=502, detail="Unable to fetch image")

    if response.status_code >= 400:
        app_logger.warning(
            "Image proxy upstream error %s for %s", response.status_code, url
        )
        raise HTTPException(status_code=502, detail="Image unavailable")

    content_type = response.headers.get("content-type", "image/jpeg")
    return Response(content=response.content, media_type=content_type)

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    chat = get_chat(req.session_id)
    context = get_context(req.session_id)
    
    # Enhance message with context for follow-up queries
    enhanced_message = req.message
    msg_lower = req.message.lower()
    
    # Let AI extract details naturally - don't hardcode enhancements
    # Just provide context hints if needed, but let AI do the extraction
    
    # Handle round trip updates - just update context flags, let AI extract details
    if any(word in msg_lower for word in ["round trip", "roundtrip", "return", "one way", "one-way", "single"]):
        if "round trip" in msg_lower or "roundtrip" in msg_lower or ("return" in msg_lower and "date" in msg_lower):
            context["round_trip"] = True
        elif "one way" in msg_lower or "one-way" in msg_lower or "single" in msg_lower:
            context["round_trip"] = False
            context["return_date"] = ""  # Clear return date for one-way
    
    # Let AI extract flight details naturally from conversation - no hardcoded enhancements
    
    # Let AI handle "also" requests naturally - it will extract details from conversation
    # No hardcoded logic needed - AI will understand context and extract what's needed
    
    # Log the enhancement for debugging
    if enhanced_message != req.message:
        app_logger.info(f"Enhanced message: '{req.message}' -> '{enhanced_message}' (context: {context})")

    # Add current date context to the message if it contains relative dates
    # Let AI extract year and other details naturally from the conversation
    from datetime import datetime
    today = datetime.now()
    today_iso = today.strftime("%Y-%m-%d")
    today_str = today.strftime("%B %d, %Y")
    
    # Only add date context for relative dates - let AI extract specific years and dates
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
                    missing = []
                    if not args.get('departure_city'):
                        missing.append("departure city")
                    if not args.get('arrival_city'):
                        missing.append("arrival city")
                    if not args.get('outbound_date'):
                        missing.append("travel date")
                    result = f"To search for flights, I need the following information: {', '.join(missing)}. Please provide the missing details so I can help you find the best flight options."
                    structured = None
                    # Log the validation failure
                    app_logger.warning(f"find_flights validation failed: missing {missing}, args={args}")
                else:
                    flights = []
                    route = None
                    # Update context - always update round_trip status
                    context["origin"] = args.get('departure_city', context.get("origin", ""))
                    context["destination"] = args.get('arrival_city', context.get("destination", ""))
                    context["depart_date"] = args.get('outbound_date', context.get("depart_date", ""))
                    return_date_arg = args.get('return_date')
                    if return_date_arg:
                        context["return_date"] = return_date_arg
                        context["round_trip"] = True
                    else:
                        # Only clear return_date if explicitly one-way
                        if context.get("round_trip") is False:
                            context["return_date"] = ""
                        context["round_trip"] = False
                    
                    # Get structured flights for UI first
                    try:
                        from travel_chatbot import get_iata_for_city, search_google_flights, get_city_coords
                        outbound_date = args.get('outbound_date')
                        # Double-check that outbound_date is present and valid
                        if not outbound_date:
                            raise ValueError("outbound_date is required but was not provided")
                        dep = await get_iata_for_city(args.get('departure_city'))
                        arr = await get_iata_for_city(args.get('arrival_city'))
                        app_logger.info(f"Searching flights: {dep} -> {arr} on {outbound_date}")
                        flights = await search_google_flights(dep, arr, outbound_date, args.get('return_date'))
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
                    
                    # Don't add the flight summary text if we have structured flights - the table will show them
                    # Only add a brief message if there's no other text from the AI
                    if not out_text and flights:
                        out_text = "Great! I found flight options for you. ✈️"
                    elif not out_text and not flights:
                        out_text = "I couldn't find any flights matching your criteria. Please try different dates or cities."
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
                # Get images from stored travel plan
                from travel_chatbot import travel_plan
                plan_data = travel_plan.get(destination.lower(), {})
                images = plan_data.get("images", {})
                structured = {"travel_plan": result, "travel_plan_images": images}
            elif fn == 'search_web':
                result = await search_web(**args)
                # Get structured search results
                from travel_chatbot import search_google
                query = args.get('query', '')
                location = args.get('location')
                num = args.get('num', 10)
                search_results = await search_google(query, location=location, num=num)
                structured = {"search_results": search_results}
            elif fn == 'find_chartered_flights':
                # Update context
                context["origin"] = args.get('departure_city', context.get("origin", ""))
                context["destination"] = args.get('arrival_city', context.get("destination", ""))
                context["depart_date"] = args.get('outbound_date', context.get("depart_date", ""))
                return_date_arg = args.get('return_date')
                if return_date_arg:
                    context["return_date"] = return_date_arg
                    context["round_trip"] = True
                else:
                    context["round_trip"] = False
                
                # Execute chartered flights search
                try:
                    result = await find_chartered_flights(**args)
                except Exception as e:
                    app_logger.error(f"Error calling find_chartered_flights with args {args}: {e}", exc_info=True)
                    result = "I encountered an issue searching for chartered flight options. Please try again or contact private jet charter companies directly."
                    structured = None
                else:
                    structured = None  # Chartered flights don't return structured data like regular flights

            elif fn == 'find_private_jets': # <--- ADD THIS ENTIRE BLOCK
                # Update context
                context["origin"] = args.get('departure_city', context.get("origin", ""))
                context["destination"] = args.get('arrival_city', context.get("destination", ""))
                context["depart_date"] = args.get('outbound_date', context.get("depart_date", ""))

                try:
                    # The function itself returns the structured data directly
                    jets_result = await find_private_jets(**args)
                    result = f"Found {len(jets_result)} private jet options for the route {args.get('departure_city')} to {args.get('arrival_city')}."
                    structured = {"jets": jets_result} # Pass structured data to the frontend
                except Exception as e:
                    app_logger.error(f"Error calling find_private_jets with args {args}: {e}", exc_info=True)
                    result = "I encountered an issue searching for private jets. Please try again."
                    structured = None
                                
            else:
                # Unknown function - provide user-friendly error without mentioning tools
                app_logger.warning(f"Unknown function called: {fn}")
                result = "I'm having trouble processing that request. Please try rephrasing your question or contact support if the issue persists."
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
            # Check if there's an error message in the result
            if tr.get('result') and isinstance(tr.get('result'), str):
                result_text = tr.get('result', '')
                # If it's an error message about missing info, use it
                if 'missing' in result_text.lower() or 'need' in result_text.lower() or 'required' in result_text.lower():
                    out_text = result_text
                    break
            if tr.get('flights') is not None:
                summary_bits.append(f"Flights found: {len(tr.get('flights') or [])}")
            if tr.get('hotels') is not None:
                summary_bits.append(f"Hotels found: {len(tr.get('hotels') or [])}")
            if tr.get('travel_plan'):
                summary_bits.append("Travel plan created")
        if not out_text and summary_bits:
            out_text = "; ".join(summary_bits)
        # Final fallback - if still no text, provide a generic helpful message
        if not out_text:
            out_text = "I'm here to help you with your travel plans! Could you please provide more details about what you're looking for?"

    return ChatResponse(text=out_text, tool_calls=tool_calls, tool_results=tool_results)


