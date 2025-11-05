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
    for key, value in {"messages": [], "travel_data": {}, "stage": "gathering_info", "last_question": None, "search_results": {}}.items():
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
def get_next_response() -> str:
    """Checks the stored travel data and decides the next logical question to ask."""
    data = st.session_state.travel_data
    if not data.get("destination"):
        st.session_state.last_question = "destination"
        return "Hello! I'm your AI travel planner. To get started, where would you like to travel?"
    if not data.get("origin"):
        st.session_state.last_question = "origin"
        return f"Great, a trip to {data.get('destination')}! Where will you be travelling from?"
    if not data.get("outbound_date"):
        st.session_state.last_question = "outbound_date"
        return "Sounds good. When would you like to depart?"
    if not data.get("days"):
        st.session_state.last_question = "days"
        date_str = data.get("outbound_date", datetime.now()).strftime('%B %d, %Y')
        return f"Got it, departing on {date_str}. And for how many days will you be travelling?"
    if not data.get("num_people"):
        st.session_state.last_question = "num_people"
        return "Perfect. How many people are traveling?"
    if not data.get("budget_per_person"):
        st.session_state.last_question = "budget"
        return "Almost there! What's your rough budget per person in INR?"

    # If all info is gathered, transition to the next stage
    st.session_state.stage = "info_gathered"
    st.session_state.last_question = None
    return "Awesome, I have all the details. What would you like to do? You can ask for **flights**, **hotels**, an **itinerary**, or a **complete travel plan**."

def handle_user_input(user_input: str):
    """
    This is the main function that orchestrates the bot's response.
    It updates the state, determines intent, and executes the appropriate action.
    """
    data = st.session_state.travel_data

    # Step 1: Always update the state with any info from the user's message
    last_q = st.session_state.last_question
    if last_q in ["days", "num_people", "budget"]:
        if last_q == "days": data["days"] = extract_number(user_input)
        elif last_q == "num_people": data["num_people"] = extract_number(user_input)
        elif last_q == "budget": data["budget_per_person"] = extract_number(user_input)
    
    with st.spinner("Thinking..."):
        parsed_data = call_api(API_URLS["parse"], {"query": user_input})
    if parsed_data and parsed_data.get("success"):
        data.update({k: v for k, v in parsed_data.items() if v is not None})
        if parsed_data.get("outbound_date"):
            try: data["outbound_date"] = datetime.strptime(parsed_data["outbound_date"], "%Y-%m-%d")
            except (ValueError, TypeError): pass
    if data.get("outbound_date") and data.get("days"):
        data["return_date"] = data.get("outbound_date", datetime.now()) + timedelta(days=int(data["days"]))

    # Step 2: Check if all information has been gathered
    all_info_gathered = all(data.get(k) for k in ["origin", "destination", "outbound_date", "days", "num_people", "budget_per_person"])
    if all_info_gathered:
        st.session_state.stage = "info_gathered"

    # Step 3: Determine the user's command/intent
    with st.spinner("..."):
        command_response = call_api(API_URLS["parse_command"], {"query": user_input})
    command = command_response.get("command") if command_response else "general_question"
    
    # Step 4: Execute the appropriate action
    if command == "general_question":
        if results := call_api(API_URLS["general"], {"destination": data.get("destination", "general"), "query": user_input}):
            st.session_state.messages.append({"role": "assistant", "content": results.get("general_answer")})
            # If we are still gathering info, prompt for the next piece
            if st.session_state.stage == "gathering_info":
                 st.session_state.messages.append({"role": "assistant", "content": get_next_response()})

    elif st.session_state.stage == "info_gathered":
        # Execute planning commands only if all info is gathered
        def get_api_results(task_name: str, url: str, payload: dict):
            if results := call_api(url, payload):
                st.session_state.search_results.update(results)
                st.session_state.messages.append({"role": "assistant", "content": f"Here are the {task_name} I found:", "results": results})

        if command == "flights":
            payload = {"origin": data.get("origin"), "destination": data.get("destination"), "outbound_date": format_date(data.get("outbound_date")), "return_date": format_date(data.get("return_date"))}
            get_api_results("flights", API_URLS["flights"], payload)
        elif command == "hotels":
            payload = {"location": data.get("destination"), "check_in_date": format_date(data.get("outbound_date")), "check_out_date": format_date(data.get("return_date"))}
            get_api_results("hotels", API_URLS["hotels"], payload)
        elif command == "itinerary":
            payload = {"destination": data.get("destination"), "check_in_date": format_date(data.get("outbound_date")), "check_out_date": format_date(data.get("return_date")), "flights": str(st.session_state.search_results.get("flights", "")), "hotels": str(st.session_state.search_results.get("hotels", ""))}
            get_api_results("itinerary", API_URLS["itinerary"], payload)
    else:
        # If the user gives a command but info is still missing, ask the next question
        st.session_state.messages.append({"role": "assistant", "content": get_next_response()})


# --- Main App ---
init_session_state()

with st.sidebar:
    st.title("AI Travel Planner");
    if st.button("Start New Plan", use_container_width=True): st.session_state.clear(); st.rerun()
    st.markdown("---"); data = st.session_state.travel_data
    st.markdown(f"**To:** {data.get('destination', '...')}"); st.markdown(f"**From:** {data.get('origin', '...')}")
    st.markdown(f"**When:** {format_date(data.get('outbound_date')) or '...'} ({data.get('days')} days)")
    st.markdown(f"**Who:** {data.get('num_people')} travelers"); st.markdown(f"**Budget:** ₹{data.get('budget_per_person') or '...'}/person")

st.header("Chat with the AI Travel Planner")

if not st.session_state.messages:
    st.session_state.messages.append({"role": "assistant", "content": "Hello! I'm your AI travel planner, ready to help you organize the perfect trip. To get started, where would you like to travel?"})

for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])
        if "results" in message:
            display_results_in_chat(message["results"])

if user_input := st.chat_input("Your message..."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    handle_user_input(user_input)
    st.rerun()