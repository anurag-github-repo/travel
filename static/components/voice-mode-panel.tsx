"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai';
import { Button } from "@/components/ui/button";
import { Mic, Square, RotateCcw, Loader2 } from "lucide-react";
import { createBlob, decode, decodeAudioData } from "@/lib/audio-utils";
import { Analyser } from "@/lib/audio-analyser";
import AudioVisualizer from "@/components/audio-visualizer";

interface ConversationEntry {
  speaker: 'You' | 'AI';
  text: string;
}

interface VoiceModePanelProps {
  onSendToChat?: (message: string) => Promise<void>;
  sessionId?: string;
}

export default function VoiceModePanel({ onSendToChat, sessionId }: VoiceModePanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [conversationLog, setConversationLog] = useState<ConversationEntry[]>([]);
  const [currentUserTranscription, setCurrentUserTranscription] = useState('');
  const [currentAiTranscription, setCurrentAiTranscription] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

  const isRecordingRef = useRef(false);
  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inputAnalyserRef = useRef<Analyser | null>(null);
  const outputAnalyserRef = useRef<Analyser | null>(null);
  const clientRef = useRef<GoogleGenAI | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationLog, currentUserTranscription, currentAiTranscription]);

  const initAudio = useCallback(() => {
    if (typeof window === 'undefined') return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
    outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

    inputNodeRef.current = inputAudioContextRef.current.createGain();
    outputNodeRef.current = outputAudioContextRef.current.createGain();

    outputNodeRef.current.connect(outputAudioContextRef.current.destination);
    nextStartTimeRef.current = outputAudioContextRef.current.currentTime;

    // Initialize analysers
    inputAnalyserRef.current = new Analyser(inputNodeRef.current);
    outputAnalyserRef.current = new Analyser(outputNodeRef.current);
  }, []);

  const initSession = useCallback(() => {
    if (!clientRef.current) {
      console.error('Client not initialized');
      return;
    }

    const model = 'gemini-2.5-flash-native-audio-preview-09-2025';

    console.log('Initializing session with model:', model);

    // Define tool for sending queries to chat
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'send_to_chat',
            description: 'Send a travel-related query to the chat system for searching flights, jets, hotels, or creating travel plans. Use this when user asks about booking, searching, or planning travel.',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The complete user query to send to chat'
                }
              },
              required: ['query']
            }
          }
        ]
      }
    ];

    try {
      sessionPromiseRef.current = clientRef.current.live.connect({
        model: model,
        tools: tools,
        callbacks: {
          onopen: () => {
            console.log('✅ Session opened successfully');
            setStatus('Connected - Ready to talk!');
            setError('');
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('📨 Message received:', message);

            // Handle tool calls from Gemini
            const toolCall = message.toolCall;
            if (toolCall && toolCall.functionCalls && toolCall.functionCalls.length > 0) {
              console.log('🔧 Tool call received:', toolCall);

              for (const fc of toolCall.functionCalls) {
                const functionName = fc.name;
                const args = fc.args;

                console.log(`⚙️ Executing tool: ${functionName}`, args);

                if (functionName === 'send_to_chat' && args.query && onSendToChat) {
                  setStatus('Sending to chat...');

                  try {
                    // Just send the query to chat - let existing backend handle it
                    await onSendToChat(args.query);

                    // Send success response back to Gemini
                    sessionPromiseRef.current?.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: fc.id,
                          name: functionName,
                          response: {
                            success: true,
                            message: 'Query sent to chat system. Results will appear in the appropriate tab.'
                          }
                        }]
                      });
                    });

                    setStatus('Search complete!');
                    setTimeout(() => setStatus('Ready - Click mic to talk'), 2000);
                  } catch (error) {
                    console.error('Tool execution error:', error);

                    // Send error response to Gemini
                    sessionPromiseRef.current?.then((session) => {
                      session.sendToolResponse({
                        functionResponses: [{
                          id: fc.id,
                          name: functionName,
                          response: {
                            success: false,
                            error: 'Failed to send query to chat'
                          }
                        }]
                      });
                    });
                  }
                }
              }

              return; // Don't process as regular message
            }

            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio && outputAudioContextRef.current && outputNodeRef.current) {
              console.log('🔊 Playing audio response');
              setStatus('AI is speaking...');
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputAudioContextRef.current.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                outputAudioContextRef.current,
                24000,
                1,
              );
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.inputTranscription) {
              console.log('📝 Your transcription:', message.serverContent.inputTranscription.text);
              setCurrentUserTranscription(prev => prev + message.serverContent.inputTranscription.text);
            }

            if (message.serverContent?.outputTranscription) {
              console.log('🤖 AI transcription:', message.serverContent.outputTranscription.text);
              setCurrentAiTranscription(prev => prev + message.serverContent.outputTranscription.text);
            }

            if (message.serverContent?.turnComplete) {
              console.log('✅ Turn complete');
              setStatus('Ready - Click mic to talk');

              const userText = currentUserTranscription.trim();
              const aiText = currentAiTranscription.trim();

              setConversationLog(prev => {
                const newLog = [...prev];
                if (userText) {
                  newLog.push({
                    speaker: 'You',
                    text: userText,
                  });
                }
                if (aiText) {
                  newLog.push({
                    speaker: 'AI',
                    text: aiText,
                  });
                }
                return newLog;
              });

              setCurrentUserTranscription('');
              setCurrentAiTranscription('');
            }

            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
              }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('❌ Session error:', e);
            setError(e.message || 'Connection error');
            setStatus('Error occurred');
          },
          onclose: (e: CloseEvent) => {
            console.log('🔌 Session closed:', e.reason);
            setStatus('Disconnected: ' + (e.reason || 'Unknown reason'));
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: {
            parts: [{
              text: `You are Naveo AI, a helpful travel assistant. Help users find flights, hotels, and plan trips.
              Keep responses concise and natural since this is a voice conversation.
              Always respond to user queries promptly and conversationally.`
            }]
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });

      sessionPromiseRef.current.catch((e) => {
        console.error('❌ Session promise error:', e);
        setError((e as Error).message || 'Failed to connect');
        setStatus('Connection failed');
      });
    } catch (e) {
      console.error('❌ Init session error:', e);
      setError((e as Error).message || 'Initialization failed');
      setStatus('Failed to initialize');
    }
  }, [currentUserTranscription, currentAiTranscription]);

  const startRecording = useCallback(async () => {
    if (isRecording || !inputAudioContextRef.current) {
      console.log('Cannot start recording - already recording or no audio context');
      return;
    }

    console.log('🎤 Starting recording...');
    inputAudioContextRef.current.resume();
    setStatus('Requesting microphone access...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      mediaStreamRef.current = stream;
      console.log('✅ Microphone access granted');
      setStatus('🔴 Recording... Speak now!');

      sourceNodeRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
      sourceNodeRef.current.connect(inputNodeRef.current!);

      const bufferSize = 4096;
      scriptProcessorNodeRef.current = inputAudioContextRef.current.createScriptProcessor(
        bufferSize,
        1,
        1,
      );

      let chunkCount = 0;
      let callbackSet = false;

      scriptProcessorNodeRef.current.onaudioprocess = (audioProcessingEvent) => {
        if (!callbackSet) {
          console.log('🎵 Audio processing callback is working!');
          callbackSet = true;
        }

        if (!isRecordingRef.current) {
          if (!callbackSet) {
            console.log('⏸️ Not recording (ref), skipping chunk');
          }
          return;
        }

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        chunkCount++;

        // Log every 10th chunk to avoid spam
        if (chunkCount % 10 === 0) {
          // Calculate audio level for debugging
          const maxLevel = Math.max(...Array.from(pcmData).map(Math.abs));
          console.log(`📤 Sending audio chunk #${chunkCount}, max level: ${maxLevel.toFixed(4)}`);
        }

        sessionPromiseRef.current?.then((session) => {
          session.sendRealtimeInput({ media: createBlob(pcmData) });
        }).catch((e) => {
          console.error('❌ Failed to send audio chunk:', e);
        });
      };

      console.log('✅ Audio processor connected and ready');

      sourceNodeRef.current.connect(scriptProcessorNodeRef.current);
      scriptProcessorNodeRef.current.connect(inputAudioContextRef.current.destination);

      console.log('🔗 Audio nodes connected');
      isRecordingRef.current = true;
      setIsRecording(true);
      console.log('🎙️ Recording state set to true');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setStatus(`Error: ${err.message}`);
      stopRecording();
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (!isRecording && !mediaStreamRef.current && !inputAudioContextRef.current) return;

    console.log('🛑 Stopping recording...');
    setStatus('Stopping recording...');
    isRecordingRef.current = false;
    setIsRecording(false);

    if (scriptProcessorNodeRef.current && sourceNodeRef.current && inputAudioContextRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      sourceNodeRef.current.disconnect();
    }

    scriptProcessorNodeRef.current = null;
    sourceNodeRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setStatus('Ready to talk - Click mic to start');
  }, [isRecording]);

  const reset = useCallback(() => {
    sessionPromiseRef.current?.then((session) => session.close());
    initSession();
    setStatus('Session cleared - Ready for a new conversation!');
    setConversationLog([]);
    setCurrentUserTranscription('');
    setCurrentAiTranscription('');
  }, [initSession]);

  const initClient = useCallback((key: string) => {
    console.log('🔧 Initializing client with API key');
    initAudio();
    clientRef.current = new GoogleGenAI({ apiKey: key });
    console.log('✅ Client created');
    initSession();
    setIsInitialized(true);
    console.log('✅ Initialization complete');
  }, [initAudio, initSession]);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      initClient(apiKey.trim());
    }
  };

  // Auto-initialize if API key is available from environment
  useEffect(() => {
    const envApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (envApiKey && !isInitialized) {
      initClient(envApiKey);
    }
  }, [initClient, isInitialized]);

  useEffect(() => {
    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      sessionPromiseRef.current?.then((session) => session.close());
    };
  }, []);

  if (!isInitialized) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Voice Mode</h2>
            <p className="text-muted-foreground">
              Enter your Google Gemini API key to start voice conversations
            </p>
          </div>
          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Gemini API Key"
                className="w-full px-4 py-2 border rounded-md"
                required
              />
              <p className="text-xs text-muted-foreground mt-2">
                Get your API key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
            <Button type="submit" className="w-full">
              Connect
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-gradient-to-br from-background via-background to-primary/5">
      {/* Conversation Log */}
      {(conversationLog.length > 0 || currentUserTranscription || currentAiTranscription) && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl max-h-[40vh] overflow-y-auto bg-black/50 backdrop-blur-md rounded-xl p-4 space-y-2 z-10">
          {conversationLog.map((entry, idx) => (
            <div
              key={idx}
              className={`text-sm leading-relaxed ${
                entry.speaker === 'You' ? 'text-blue-300' : 'text-green-300'
              }`}
            >
              <span className="font-bold">{entry.speaker}:</span> {entry.text}
            </div>
          ))}
          {currentUserTranscription && (
            <div className="text-sm leading-relaxed text-blue-300 opacity-70">
              <span className="font-bold">You:</span> {currentUserTranscription}
            </div>
          )}
          {currentAiTranscription && (
            <div className="text-sm leading-relaxed text-green-300 opacity-70">
              <span className="font-bold">AI:</span> {currentAiTranscription}
            </div>
          )}
          <div ref={conversationEndRef} />
        </div>
      )}

      {/* Audio Visualizer */}
      <div className="flex-1 flex items-center justify-center relative">
        <AudioVisualizer
          isRecording={isRecording}
          inputAnalyser={inputAnalyserRef.current?.analyser}
          outputAnalyser={outputAnalyserRef.current?.analyser}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Mic className={`w-16 h-16 ${isRecording ? 'text-red-500' : 'text-primary'} drop-shadow-lg`} />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={reset}
          disabled={isRecording}
          className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20"
        >
          <RotateCcw className="w-6 h-6" />
        </Button>

        {!isRecording ? (
          <Button
            size="icon"
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600"
          >
            <Mic className="w-8 h-8" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={stopRecording}
            className="w-20 h-20 rounded-full bg-gray-800 hover:bg-gray-900"
          >
            <Square className="w-8 h-8 fill-current" />
          </Button>
        )}
      </div>

      {/* Status */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center z-10">
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : (
          <div className="text-muted-foreground text-sm">{status}</div>
        )}
      </div>
    </div>
  );
}
