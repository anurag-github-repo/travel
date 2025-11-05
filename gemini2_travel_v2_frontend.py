import streamlit as st
import requests
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# --- API Configuration ---
API_BASE_URL = "https://vchat.marketsverse.com"
API_URLS = {
    "flights": f"{API_BASE_URL}/search_flights/",
    "hotels": f"{API_BASE_URL}/search_hotels/",
    "itinerary": f"{API_BASE_URL}/generate_itinerary/",
    "complete": f"{API_BASE_URL}/complete_search/",
    "parse": f"{API_BASE_URL}/parse_travel_query/",
    "general": f"{API_BASE_URL}/general_travel_query/",
    "parse_command": f"{API_BASE_URL}/parse_command/"
}

# --- Page Setup & Session State ---
st.set_page_config(page_title="AI Travel Planner", page_icon="✈️", layout="wide")

def init_session_state():
    for key, value in {"messages": [], "travel_data": {}}.items():
        if key not in st.session_state: st.session_state[key] = value

# --- Helper Functions ---
def call_api(url: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    try:
        response = requests.post(url, json=payload, timeout=90)
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
        if 'lakh' in t.lower(): return num * 100000
        if 'k' in t.lower(): return num * 1000
        return num
    return None

# --- UI Display Components ---
def display_results_in_chat(results: Dict[str, Any]):
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
def get_next_needed_info(data: dict) -> Optional[str]:
    """Determines the next piece of information needed from the user."""
    if not data.get("destination"): return "destination"
    if not data.get("origin"): return "origin"
    if not data.get("outbound_date"): return "outbound_date"
    if not data.get("days"): return "days"
    if not data.get("num_people"): return "num_people"
    if not data.get("budget_per_person"): return "budget_per_person"
    return None # All info gathered

def get_follow_up_question(missing_info: Optional[str], data: dict) -> str:
    """Generates the next question for the user based on missing info."""
    if missing_info == "destination": return "Hello! I'm your AI travel planner. To get started, where would you like to travel?"
    if missing_info == "origin": return f"Great, a trip to {data.get('destination')}! Where will you be travelling from?"
    if missing_info == "outbound_date": return "Sounds good. When would you like to depart?"
    if missing_info == "days":
        date_str = data.get("outbound_date", datetime.now()).strftime('%B %d, %Y')
        return f"Got it, departing on {date_str}. And for how many days will you be travelling?"
    if missing_info == "num_people": return "Perfect. How many people are traveling?"
    if missing_info == "budget_per_person": return "Almost there! What's your rough budget per person in INR?"
    return "Awesome, I have all the details. What would you like to do? You can ask for **flights**, **hotels**, an **itinerary**, or a **complete travel plan**."

def handle_user_input(user_input: str):
    """The main conversational engine."""
    data = st.session_state.travel_data
    
    # 1. Update state with any travel info from the user's message
    with st.spinner("..."):
        parsed_data = call_api(API_URLS["parse"], {"query": user_input})
    if parsed_data and parsed_data.get("success"):
        data.update({k: v for k, v in parsed_data.items() if v is not None})
        if parsed_data.get("outbound_date"):
            try: data["outbound_date"] = datetime.strptime(parsed_data["outbound_date"], "%Y-%m-%d")
            except (ValueError, TypeError): pass
        if data.get("outbound_date") and data.get("days"):
            data["return_date"] = data.get("outbound_date", datetime.now()) + timedelta(days=int(data["days"]))

    # 2. Determine what information, if any, is still needed
    missing_info = get_next_needed_info(data)

    # 3. Determine the user's intent
    with st.spinner("..."):
        command_response = call_api(API_URLS["parse_command"], {"query": user_input})
    command = command_response.get("command") if command_response else "general_question"

    # 4. Act based on intent and state
    if command == "general_question":
        if results := call_api(API_URLS["general"], {"destination": data.get("destination", "general"), "query": user_input}):
            st.session_state.messages.append({"role": "assistant", "content": results.get("general_answer")})
            # After answering, if we still need info, ask the next question
            if missing_info:
                st.session_state.messages.append({"role": "assistant", "content": get_follow_up_question(missing_info, data)})

    elif command in ["flights", "hotels", "itinerary", "complete_plan"]:
        if missing_info:
            # User gave a command, but we are missing info
            st.session_state.messages.append({"role": "assistant", "content": f"I can get the {command.replace('_', ' ')} for you, but first I need to know a few more things."})
            st.session_state.messages.append({"role": "assistant", "content": get_follow_up_question(missing_info, data)})
        else:
            # We have all info and can execute the command
            def get_api_results(task_name: str, url: str, payload: dict):
                if results := call_api(url, payload):
                    st.session_state.messages.append({"role": "assistant", "content": f"Here are the {task_name} I found:", "results": results})
            
            payloads = {
                "flights": ("flights", API_URLS["flights"], {"origin": data.get("origin"), "destination": data.get("destination"), "outbound_date": format_date(data.get("outbound_date")), "return_date": format_date(data.get("return_date"))}),
                "hotels": ("hotels", API_URLS["hotels"], {"location": data.get("destination"), "check_in_date": format_date(data.get("outbound_date")), "check_out_date": format_date(data.get("return_date"))}),
                "itinerary": ("itinerary", API_URLS["itinerary"], {"destination": data.get("destination"), "check_in_date": format_date(data.get("outbound_date")), "check_out_date": format_date(data.get("return_date")), "flights": str(st.session_state.search_results.get("flights", "")), "hotels": str(st.session_state.search_results.get("hotels", ""))}),
                "complete_plan": ("complete plan", API_URLS["complete"], {"flight_request": {"origin": data.get("origin"), "destination": data.get("destination"), "outbound_date": format_date(data.get("outbound_date")), "return_date": format_date(data.get("return_date"))}})
            }
            if command in payloads:
                get_api_results(*payloads[command])
    else:
        # The user likely just provided a piece of info
        st.session_state.messages.append({"role": "assistant", "content": get_follow_up_question(missing_info, data)})

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
    st.session_state.messages.append({"role": "assistant", "content": "Hello! I'm your AI travel planner, ready to help you organize the perfect trip."})

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "results" in message:
            display_results_in_chat(message["results"])

if user_input := st.chat_input("Your message..."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    handle_user_input(user_input)
    st.rerun()