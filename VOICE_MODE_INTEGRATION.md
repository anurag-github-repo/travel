# Voice Mode - Backend Integration Guide

## 🎯 How It Works

The Voice Mode now intelligently routes queries to the appropriate system:

### 1. **Basic Conversations** → Handled by Gemini Voice API
For general questions and casual conversation:
- "Hello, how are you?"
- "What's the weather like?"
- "Tell me about Paris"
- "Can you help me?"

**Result**: Gemini responds directly with voice + text

### 2. **Travel Queries** → Routed to Backend API
For travel-related requests that need tool calls:

#### ✈️ Flight Queries
**Keywords**: flight, flights, fly
**Example**: "Find me flights from New York to London"
**Action**:
- Sends query to backend API
- Backend uses `find_flights` tool
- Results shown in Flights tab
- Auto-switches to Flights tab after 1.5 seconds

#### 🛩️ Jet Queries
**Keywords**: jet, jets, private, charter
**Example**: "Show me private jets to Dubai"
**Action**:
- Sends query to backend API
- Backend uses `find_private_jets` tool
- Results shown in Jets tab
- Auto-switches to Jets tab after 1.5 seconds

#### 🏨 Hotel Queries
**Keywords**: hotel, hotels, accommodation, stay
**Example**: "Find hotels in Paris"
**Action**:
- Sends query to backend API
- Backend uses `find_hotels` tool
- Results shown in Hotels tab
- Auto-switches to Hotels tab after 1.5 seconds

#### 🗺️ Travel Plan Queries
**Keywords**: plan, itinerary, trip, visit
**Example**: "Plan a 5-day trip to Tokyo"
**Action**:
- Sends query to backend API
- Backend uses `generate_travel_plan` tool
- Results shown in Travel Plan tab
- Auto-switches to Plan tab after 1.5 seconds

## 🔄 Integration Flow

```
User speaks in Voice Mode
        ↓
Voice transcribed by Gemini
        ↓
Text analyzed for keywords
        ↓
┌─────────────────┴──────────────────┐
│                                    │
Basic Question              Travel Query
      ↓                              ↓
Gemini responds            Backend API call
with voice                          ↓
                            Tool execution
                            (flights/jets/hotels/plan)
                                    ↓
                            Results in appropriate tab
                                    ↓
                            Auto-switch to that tab
```

## 📝 Example Usage Scenarios

### Scenario 1: Flight Search
```
User: "Find me direct flights from Mumbai to Singapore for next week"

1. ✅ Voice transcribed: "Find me direct flights from Mumbai..."
2. 🔍 Keyword detected: "flights"
3. 🧳 Query type: FLIGHT
4. 📤 Sent to backend API
5. ⚙️ Backend executes find_flights tool
6. ✈️ Results populate Flights tab
7. 🔄 Auto-switches to Flights tab
8. ✅ Status: "Flight search complete!"
```

### Scenario 2: Casual Chat
```
User: "Hello, how are you doing today?"

1. ✅ Voice transcribed: "Hello, how are you..."
2. 🔍 No travel keywords detected
3. 💬 Handled by Gemini directly
4. 🎤 Gemini responds with voice
5. 📝 Response transcribed and shown
```

### Scenario 3: Multi-step Travel Planning
```
User: "I want to visit Bali"

1. 💬 Gemini: "Great choice! When are you planning to visit?"

User: "Next month, find me flights"

1. 🔍 Keyword detected: "flights"
2. 🧳 Query type: FLIGHT
3. 📤 "Next month, find me flights" → Backend
4. ⚙️ Backend extracts: destination=Bali, date=next month
5. ✈️ Shows flights in Flights tab
6. 🔄 Auto-switches to Flights tab

User: "Also show me hotels"

1. 🔍 Keyword detected: "hotels"
2. 🧳 Query type: HOTEL
3. 📤 "Also show me hotels" → Backend
4. 🏨 Shows hotels in Hotels tab
5. 🔄 Auto-switches to Hotels tab
```

## 🎨 Visual Feedback

When a travel query is detected:
1. Status shows: "Searching for flights..." (or jets/hotels/plan)
2. Backend processes the request
3. Results populate in the background
4. Tab automatically switches
5. Status shows: "Flight search complete!"
6. Returns to: "Ready - Click mic to talk"

## 🔧 Technical Implementation

### Voice Mode Component
```typescript
// Detects query type based on keywords
if (lowerText.includes('jet') || lowerText.includes('private')) {
  queryType = 'jet';
} else if (lowerText.includes('flight')) {
  queryType = 'flight';
}
// ... etc

// Calls backend
onTravelQuery(userText, queryType)
```

### Travel Assistant Component
```typescript
onTravelQuery={async (query, queryType) => {
  // Send to backend
  await sendMessage(query);

  // Auto-switch tab
  setTimeout(() => {
    setActiveTab(queryType === 'jet' ? 'jets' : queryType + 's');
  }, 1500);
}}
```

## 🎯 Keyword Priority

If multiple keywords are present, priority is:
1. **Jet** (highest priority - most specific)
2. **Flight**
3. **Hotel**
4. **Plan** (lowest priority - most general)

Example: "Find private jets with hotel" → Detected as JET query

## 🚀 Testing

Try these voice commands:

**✈️ Flights:**
- "Find flights from Delhi to Mumbai"
- "Show me direct flights to London"
- "I want to fly to Singapore next week"

**🛩️ Jets:**
- "Show me private jets to Dubai"
- "Find charter flights from New York"
- "I need a jet to Las Vegas"

**🏨 Hotels:**
- "Find hotels in Paris"
- "Show me accommodation in Tokyo"
- "Where can I stay in Bali"

**🗺️ Plans:**
- "Plan a 5-day trip to Italy"
- "Create an itinerary for Thailand"
- "I want to visit Japan, help me plan"

**💬 Basic Chat:**
- "Hello, how are you?"
- "What's the weather like?"
- "Tell me about Rome"

## 📊 Console Logs

Watch for these in the browser console (F12):

```
🧳 FLIGHT query detected, sending to backend: Find flights...
Searching for flights...
Flight search complete!
```

## 🎉 Benefits

1. **Seamless Experience**: Speak naturally, system routes intelligently
2. **No Manual Switching**: Tabs switch automatically
3. **Context Aware**: Remembers conversation context
4. **Visual Feedback**: Status updates show progress
5. **Dual Mode**: Chat + Voice work together
6. **Tool Integration**: Full access to all backend tools via voice

## 🔮 Future Enhancements

Potential improvements:
1. Speak results back to user (TTS of search results)
2. Confirmation before executing expensive searches
3. Multi-query support ("Find flights AND hotels")
4. Voice-based filtering ("Only show morning flights")
5. Follow-up questions ("Book the first one")

---

**Enjoy your voice-powered travel assistant! 🎤✈️**
