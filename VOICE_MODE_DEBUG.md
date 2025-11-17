# Voice Mode Debugging Guide

## Recent Updates

I've added extensive logging and improved error handling to help diagnose issues. Here's what changed:

### Changes Made:

1. **Model Update**: Changed to `gemini-2.0-flash-exp` (more stable)
2. **Added Logging**: Console logs at every step
3. **Audio Detection**: Logs when actual audio is detected
4. **System Instructions**: Added AI personality for better responses
5. **Voice Change**: Using 'Puck' voice (more reliable)

## How to Test

### 1. Clear Browser Cache & Restart
```bash
# Stop the dev server (Ctrl+C)
cd static
npm run dev
```

### 2. Open Browser Console (F12)
You should see these logs in order:

#### On Page Load:
```
🔧 Initializing client with API key
✅ Client created
Initializing session with model: gemini-2.0-flash-exp
✅ Initialization complete
✅ Session opened successfully
```

#### When Recording:
```
🎤 Starting recording...
✅ Microphone access granted
📤 Sending audio chunk #10
📤 Sending audio chunk #20
...
```

#### When AI Responds:
```
📨 Message received: {serverContent: {...}}
📝 Your transcription: "hello"
🔊 Playing audio response
🤖 AI transcription: "Hello! How can I help you today?"
✅ Turn complete
```

## Common Issues & Solutions

### Issue 1: "Session opened successfully" but no response

**Check Console For:**
- Are you seeing "📤 Sending audio chunk" messages?
  - ✅ YES → Audio is being sent
  - ❌ NO → Microphone might not be working

**Solution:**
1. Check microphone permissions in browser
2. Try speaking louder
3. Check system microphone isn't muted

### Issue 2: No "📨 Message received" logs

**This means Gemini isn't responding. Possible causes:**

1. **API Key Issue**
   - Verify your API key is correct in `.env.local`
   - Check the key has Gemini API access enabled
   - Try generating a new key from [Google AI Studio](https://aistudio.google.com/app/apikey)

2. **Model Access**
   - The model might not be available in your region
   - Try changing the model in `voice-mode-panel.tsx` line 75:
   ```typescript
   const model = 'gemini-2.0-flash-exp'; // Try 'gemini-1.5-flash' if this doesn't work
   ```

3. **API Quota**
   - Check if you've exceeded your API quota
   - Visit [Google Cloud Console](https://console.cloud.google.com/)

### Issue 3: "Failed to send audio" errors

**Solution:**
- Session might have closed
- Click the reset button and try again
- Check internet connection

### Issue 4: ScriptProcessorNode deprecation warning

**This is just a warning, not an error.**
- The API still works fine
- Future versions will use AudioWorklet (more complex to implement)
- Ignore for now unless you see actual audio issues

## Testing Checklist

Try these steps in order:

1. ✅ Open Voice Mode tab
2. ✅ Check console for "✅ Session opened successfully"
3. ✅ Click red microphone button
4. ✅ Allow microphone access when prompted
5. ✅ Speak clearly: "Hello, can you hear me?"
6. ✅ Wait 2-3 seconds after speaking
7. ✅ Check console for:
   - "📤 Sending audio chunk" messages
   - "📝 Your transcription" with your text
   - "🤖 AI transcription" with AI response
8. ✅ Listen for audio response

## Advanced Debugging

### Check Network Tab (F12 → Network)
Look for WebSocket connection to Gemini:
- Filter by "WS" (WebSocket)
- Should see connection to `generativelanguage.googleapis.com`
- Status should be "101 Switching Protocols"

### Check Audio Context
In console, type:
```javascript
// Check if audio context is working
console.log(window.AudioContext)
```

Should return a function, not undefined.

## Still Not Working?

### Try Alternative Models

Edit `static/components/voice-mode-panel.tsx` line 75 and try these models:

```typescript
// Option 1: Latest experimental (current)
const model = 'gemini-2.0-flash-exp';

// Option 2: Stable version
const model = 'gemini-1.5-flash-latest';

// Option 3: Pro version (slower but more capable)
const model = 'gemini-1.5-pro-latest';
```

### Check API Key Permissions

Your API key needs these permissions:
1. Generative Language API enabled
2. Live API access (might need allowlist)

Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com

## Error Messages & Meanings

| Error | Meaning | Solution |
|-------|---------|----------|
| "Client not initialized" | API key not set | Check `.env.local` file |
| "Session promise error" | Failed to connect | Check API key and internet |
| "Failed to send audio" | Connection lost | Click reset and try again |
| "Disconnected: Unknown reason" | Server closed connection | Might be quota/permissions issue |

## Success Indicators

You'll know it's working when you see:
1. ✅ Session opens successfully
2. 📤 Audio chunks being sent
3. 📝 Your speech transcribed
4. 🤖 AI response transcribed
5. 🔊 Audio playing back
6. Conversation log showing your exchange

## Next Steps After It Works

Once voice mode is working, we can add:
1. Tool calling integration (search flights/jets via voice)
2. Tab switching based on voice commands
3. 3D orb visualization
4. Voice activity detection (auto-start/stop)

---

**Need more help?** Check the console logs and share them for detailed diagnosis.
