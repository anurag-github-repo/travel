# Voice Mode Integration

This document explains the Voice Mode feature that has been integrated into the Naveo AI Travel Assistant.

## Overview

Voice Mode allows users to interact with the travel assistant using natural voice conversations powered by Google's Gemini 2.5 Flash Native Audio API. The feature includes:

- Real-time voice input and output
- Live transcription of conversations
- Natural conversational AI responses
- Visual feedback with animated orb display
- Session management and reset capabilities

## Features

### Current Capabilities

1. **Voice Interaction**
   - Click the microphone button to start recording
   - Speak naturally to the AI assistant
   - AI responds with voice and text transcription
   - Click stop to pause recording

2. **Visual Feedback**
   - Animated orb that responds to voice input
   - Real-time transcription display
   - Conversation history log
   - Status indicators

3. **Session Management**
   - Reset button to start fresh conversations
   - Persistent session during interaction
   - Conversation log tracking

### Future Enhancements (To Be Implemented)

The Voice Mode currently uses Gemini's native audio API directly. To fully integrate with the existing backend tool system (flights search, jets search, hotels, etc.), the following enhancements are planned:

1. **Tool Integration**
   - Parse voice transcriptions for travel queries
   - Trigger backend API calls for flights, jets, and hotels
   - Display results in appropriate tabs
   - Speak back results to the user

2. **Cross-Tab Synchronization**
   - Voice queries that trigger flight searches should update the Flights tab
   - Jet queries should update the Jets tab
   - Hotel queries should update the Hotels tab

3. **Enhanced 3D Visualization**
   - Full 3D orb implementation with Three.js
   - Audio-reactive animations
   - Smooth transitions and effects

## Setup Instructions

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Configure API Key

**Option 1: In-App Configuration (Current)**
- Navigate to the Voice Mode tab
- Enter your Gemini API key when prompted
- The key is stored in the browser session only

**Option 2: Environment Variable (Alternative)**
- Create a `.env.local` file in the `static/` directory
- Add: `NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here`
- Restart the development server

### 3. Start the Application

```bash
cd static
npm run dev
```

Navigate to http://localhost:3000 and click on the "Voice Mode" tab.

## Architecture

### Frontend Components

1. **voice-mode-panel.tsx**
   - Main React component for the Voice Mode interface
   - Handles Gemini Live API integration
   - Manages audio input/output
   - Displays conversation log and controls

2. **audio-utils.ts**
   - Audio encoding/decoding utilities
   - PCM audio conversion
   - Base64 encoding helpers

3. **audio-analyser.ts**
   - Audio frequency analysis
   - Visual feedback data processing

### Integration Points

```
Voice Mode Panel
    ↓
Gemini Live API (Direct)
    ↓
Voice Transcription
    ↓
(Future) Backend API Integration
    ↓
Tool Calls (Flights, Jets, Hotels)
```

## Usage

1. Click the **Voice Mode** tab in the navigation
2. Enter your Gemini API key (first time only)
3. Click the **Connect** button
4. Click the large red **microphone** button to start recording
5. Speak your travel query naturally:
   - "Find flights from New York to London"
   - "Show me private jets to Dubai"
   - "I need a hotel in Paris"
6. AI will respond with voice and text
7. Click the **square** button to stop recording
8. Use the **reset** button to start a new conversation

## Technical Details

### Dependencies Added

- `@google/genai`: ^1.15.0 - Gemini API client
- `lit`: ^3.3.0 - Web components library
- `@lit/context`: ^1.1.5 - Lit context API
- `three`: ^0.176.0 - 3D graphics (for future enhancements)

### API Configuration

The Voice Mode uses:
- **Model**: `gemini-2.5-flash-native-audio-preview-09-2025`
- **Voice**: Zephyr (built-in voice)
- **Sample Rates**: 16kHz input, 24kHz output
- **Modalities**: Audio input and output with transcription

## Troubleshooting

### "Microphone access denied"
- Check browser permissions
- Allow microphone access when prompted
- Try HTTPS (required for some browsers)

### "API key invalid"
- Verify your API key is correct
- Check that the key has Gemini API access enabled
- Try generating a new key from Google AI Studio

### No audio output
- Check system volume
- Verify browser audio settings
- Try a different browser

### Connection errors
- Check internet connection
- Verify API key has sufficient quota
- Check browser console for detailed errors

## Future Development Tasks

1. **Backend Integration**
   - Add middleware to parse voice transcriptions
   - Route queries to appropriate tools (flights/jets/hotels)
   - Return results to voice mode for speaking

2. **Enhanced Visualization**
   - Implement full 3D orb with Three.js
   - Add audio-reactive materials and shaders
   - Smooth camera movements and transitions

3. **Improved UX**
   - Add loading states for tool calls
   - Show visual indicators when tools are being executed
   - Better error handling and user feedback

4. **Session Persistence**
   - Save conversation history
   - Allow resuming previous sessions
   - Export conversation logs

## Files Modified/Created

### Created:
- `static/components/voice-mode-panel.tsx`
- `static/lib/audio-utils.ts`
- `static/lib/audio-analyser.ts`
- `static/.env.local.example`
- `VOICE_MODE_README.md` (this file)

### Modified:
- `static/package.json` - Added dependencies
- `static/components/travel-assistant.tsx` - Added Voice Mode tab
- Updated mobile and desktop navigation

## License

The audio-orb components are based on Google's Gemini API samples and are licensed under Apache-2.0.
