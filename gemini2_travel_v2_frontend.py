import streamlit as st
import requests
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# --- API Configuration ---
API_BASE_URL = "http://localhost:8000"
API_URLS = {
    "flights": f"{API_BASE_URL}/search_flights/",
    "hotels": f"{API_BASE_URL}/search_hotels/",
    "itinerary": f"{API_BASE_URL}/generate_itinerary/",
    "complete": f"{API_BASE_URL}/complete_search/",
    "parse": f"{API_BASE_URL}/parse_travel_query/",
    "general": f"{API_BASE_URL}/general_travel_query/"
}

# --- Page Setup & Session State ---
st.set_page_config(page_title="AI Travel Planner", page_icon="✈️", layout="wide")

def init_session_state():
    for key, value in {
        "messages": [], "travel_data": {}, "stage": "gathering_info",
        "last_question": None, "search_results": {} # search_results is still useful for context
    }.items():
        if key not in st.session_state: st.session_state[key] = value

# --- Helper Functions ---
def call_api(url: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        response = requests.post(url, json=payload, timeout=90) # Increased timeout for long tasks
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        st.error(f"Connection Error: Is the backend running? Details: {e}")
    except Exception as e:
        st.error(f"An API error occurred: {e}")
    return None

def format_date(d: Optional[datetime]) -> Optional[str]: return d.strftime("%Y-%m-%d") if d else None

def extract_number(t: str) -> Optional[int]:
    n = re.findall(r'\d+', t.replace(',', ''))
    if n:
        num = int(n[0])
        return num * 1000 if 'k' in t.lower() else num
    return None

# --- UI Display Components ---
def display_results_in_chat(results: Dict[str, Any]):
    """Renders the results directly in the chat message container."""
    if not results: return
    if results.get("flights"):
        st.markdown("---"); st.markdown("##### ✈️ Top Flight Options")
        cols = st.columns(min(3, len(results["flights"])))
        for i, flight in enumerate(results["flights"][:3]):
            with cols[i]:
                with st.container(border=True):
                    st.image(flight.get('airline_logo', ''), width=30)
                    st.markdown(f"**{flight.get('airline', 'N/A')}** | ₹{flight.get('price', 'N/A')}")
                    st.caption(f"{flight.get('duration')} | {flight.get('stops')}")
        if results.get("ai_flight_recommendation"):
            with st.expander("**AI Flight Recommendation**"): st.markdown(results["ai_flight_recommendation"])
    if results.get("hotels"):
        st.markdown("---"); st.markdown("##### 🏨 Top Hotel Options")
        cols = st.columns(min(3, len(results["hotels"])))
        for i, hotel in enumerate(results["hotels"][:3]):
            with cols[i]:
                with st.container(border=True):
                    st.markdown(f"**{hotel.get('name', 'N/A')}**")
                    st.markdown(f"**₹{hotel.get('price', 'N/A')}/night** | {hotel.get('rating', 'N/A')} ⭐")
                    st.link_button("View Hotel", hotel.get('link', '#'))
        if results.get("ai_hotel_recommendation"):
            with st.expander("**AI Hotel Recommendation**"): st.markdown(results["ai_hotel_recommendation"])
    if results.get("itinerary"):
        st.markdown("---"); st.markdown("##### 🗺️ Your Travel Itinerary")
        st.markdown(results["itinerary"])

# --- Core Logic ---
def process_user_input(user_input: str):
    data = st.session_state.travel_data; last_q = st.session_state.last_question
    if last_q == "num_people": data["num_people"] = extract_number(user_input)
    elif last_q == "budget": data["budget_per_person"] = extract_number(user_input)

    with st.spinner("Thinking..."): parsed_data = call_api(API_URLS["parse"], {"query": user_input})
    if parsed_data and parsed_data.get("success"):
        data.update({k: v for k, v in parsed_data.items() if v is not None})
        if parsed_data.get("outbound_date"):
            try: data["outbound_date"] = datetime.strptime(parsed_data["outbound_date"], "%Y-%m-%d")
            except (ValueError, TypeError): pass
    if data.get("outbound_date") and data.get("days") and not data.get("return_date"):
        data["return_date"] = data["outbound_date"] + timedelta(days=int(data["days"]))

def get_next_response() -> str:
    data = st.session_state.travel_data
    prompts = [
        (not data.get("destination"), "destination", "Hello! I'm your AI travel planner. To get started, where would you like to travel?"),
        (not data.get("origin"), "origin", f"Great, a trip to {data.get('destination')}! Where will you be travelling from?"),
        (not data.get("outbound_date") or not data.get("days"), "dates", "Sounds good. When do you want to go and for how long? (e.g., 'January 24th for 3 days 2026')"),
        (not data.get("num_people"), "num_people", "Perfect. How many people are traveling?"),
        (not data.get("budget_per_person"), "budget", "Almost there! What's your rough budget per person in INR?"),
    ]
    for condition, question, prompt in prompts:
        if condition: st.session_state.last_question = question; return prompt
    st.session_state.stage = "info_gathered"; st.session_state.last_question = None
    return "Awesome, I have all the details. What would you like to do? You can ask for **flights**, **hotels**, an **itinerary**, or a **complete travel plan**."

def handle_planning_request(user_input: str):
    data = st.session_state.travel_data
    if any(cmd in user_input.lower() for cmd in ["flight", "hotel", "itinerary", "complete"]) and not data.get("outbound_date"):
        st.session_state.messages.append({"role": "assistant", "content": "I need your travel dates first. When would you like to go?"})
        st.session_state.last_question = "dates"; return

    def get_api_results(task_name: str, url: str, payload: dict) -> Optional[dict]:
        with st.spinner(f"AI is working on your {task_name}..."):
            results = call_api(url, payload)
            primary_key = task_name.split(' ')[0]
            if not (results and results.get(primary_key)):
                 st.error(f"Sorry, I couldn't find any {task_name}. Please try different criteria."); return None
            return results

    commands = {
        "flight": ("flights", API_URLS["flights"], {"origin": data.get("origin"), "destination": data.get("destination"), "outbound_date": format_date(data.get("outbound_date")), "return_date": format_date(data.get("return_date"))}),
        "hotel": ("hotels", API_URLS["hotels"], {"location": data.get("destination"), "check_in_date": format_date(data.get("outbound_date")), "check_out_date": format_date(data.get("return_date"))}),
        "itinerary": ("itinerary", API_URLS["itinerary"], {"destination": data.get("destination"), "check_in_date": format_date(data.get("outbound_date")), "check_out_date": format_date(data.get("return_date")), "flights": str(st.session_state.search_results.get("flights", "")), "hotels": str(st.session_state.search_results.get("hotels", ""))}),
        "complete": ("complete plan", API_URLS["complete"], {"flight_request": {"origin": data.get("origin"), "destination": data.get("destination"), "outbound_date": format_date(data.get("outbound_date")), "return_date": format_date(data.get("return_date"))}})
    }
    for keyword, (task_name, url, payload) in commands.items():
        if keyword in user_input.lower():
            if results := get_api_results(task_name, url, payload):
                st.session_state.search_results.update(results)
                st.session_state.messages.append({"role": "assistant", "content": f"Here are the {task_name} I found for your trip:", "results": results})
            return

    if results := get_api_results("answer", API_URLS["general"], {"destination": data.get("destination", "general"), "query": user_input}):
        if results.get("general_answer"): st.session_state.messages.append({"role": "assistant", "content": results["general_answer"]})

# --- Main App ---
init_session_state()

with st.sidebar:
    st.title("AI Travel Planner")
    if st.button("Start New Plan", use_container_width=True): st.session_state.clear(); st.rerun()
    st.markdown("---"); data = st.session_state.travel_data
    st.markdown(f"**To:** {data.get('destination', '...')}"); st.markdown(f"**From:** {data.get('origin', '...')}")
    st.markdown(f"**When:** {format_date(data.get('outbound_date')) or '...'} ({data.get('days')} days)")
    st.markdown(f"**Who:** {data.get('num_people')} travelers"); st.markdown(f"**Budget:** ₹{data.get('budget_per_person') or '...'}/person")

st.header("Chat with the AI Travel Planner")

if not st.session_state.messages:
    st.session_state.messages.append({"role": "assistant", "content": "Hello! I'm your AI travel planner, ready to help you organize the perfect trip. To get started, where would you like to travel?"})

# New Display Loop: Renders results as part of the message history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "results" in message:
            display_results_in_chat(message["results"])

if user_input := st.chat_input("Your message..."):
    st.session_state.messages.append({"role": "user", "content": user_input})

    if st.session_state.stage == "gathering_info":
        process_user_input(user_input)
        bot_response = get_next_response()
        st.session_state.messages.append({"role": "assistant", "content": bot_response})
    else: # Stage is 'info_gathered' or 'results_displayed'
        handle_planning_request(user_input)
        
    st.rerun()