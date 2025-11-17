"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Moon, Sun, Send, Mic, Volume2, VolumeX } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatPanel from "@/components/chat-panel";
import FlightsPanel from "@/components/flights-panel";
import HotelsPanel from "@/components/hotels-panel";
import TravelPlanPanel from "@/components/travel-plan-panel";
import FlightSearchForm from "@/components/flight-search-form";
import Image from "next/image";
import type {
  Message,
  Context,
  Flight,
  Hotel,
  SearchResult,
  Route,
  APIResponse,
  Aircraft,
} from "@/lib/types";
import { extractInfo } from "@/lib/helpers";
import JetsPanel from "./jets-panel";
import JetDetailModal from "@/components/jet-detail-modal";
import VoiceModePanel from "@/components/voice-mode-panel";

export default function TravelAssistant() {
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [jets, setJets] = useState<Aircraft[]>([]);
  const [selectedJet, setSelectedJet] = useState<Aircraft | null>(null);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickFormKey, setQuickFormKey] = useState(0);
  const quickFormDefaultsRef = useRef<Partial<Context>>({});

  // Separate contexts for flights and jets
  const [flightContext, setFlightContext] = useState<Context>({
    origin: "",
    destination: "",
    departDate: "",
    returnDate: "",
    passengers: 1,
    roundTrip: false,
    lastQuery: "",
    extractedInfo: {},
    travelClass: "economy",
    nonStopOnly: false,
  });

  const [jetContext, setJetContext] = useState<Context>({
    origin: "",
    destination: "",
    departDate: "",
    returnDate: "",
    passengers: 1,
    roundTrip: false,
    lastQuery: "",
    extractedInfo: {},
    travelClass: "economy",
    nonStopOnly: false,
  });

  const [flights, setFlights] = useState<Flight[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [travelPlan, setTravelPlan] = useState("");
  const [travelPlanImages, setTravelPlanImages] = useState<
    Record<string, string>
  >({});

  // Separate routes for flights and jets
  const [flightRoute, setFlightRoute] = useState<Route | null>(null);
  const [jetRoute, setJetRoute] = useState<Route | null>(null);

  const [activeTab, setActiveTab] = useState("flights");
  const [mobileTab, setMobileTab] = useState("chat");
  const [flightsSearched, setFlightsSearched] = useState(false);
  const [jetsSearched, setJetsSearched] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    const saved = localStorage.getItem("voiceOutput");
    setVoiceOutputEnabled(saved !== "false");
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle flight location changes - create route immediately
  useEffect(() => {
    const updateFlightRoute = async () => {
      if (flightContext.origin && flightContext.destination) {
        // Clear flight search results when locations change
        setFlights([]);
        setFlightsSearched(false);

        // Create route for the new locations
        const { getCityCoordinates } = await import("@/lib/city-coordinates");
        const fromCoords = getCityCoordinates(flightContext.origin);
        const toCoords = getCityCoordinates(flightContext.destination);

        if (fromCoords && toCoords) {
          const newRoute: Route = {
            from: {
              city: flightContext.origin,
              lat: fromCoords.lat,
              lon: fromCoords.lon,
            },
            to: {
              city: flightContext.destination,
              lat: toCoords.lat,
              lon: toCoords.lon,
            },
          };
          setFlightRoute(newRoute);
        }
      } else {
        // If no complete route, clear route
        setFlightRoute(null);
      }
    };

    updateFlightRoute();
  }, [flightContext.origin, flightContext.destination]);

  // Handle jet location changes - create route immediately
  useEffect(() => {
    const updateJetRoute = async () => {
      if (jetContext.origin && jetContext.destination) {
        // Clear jet search results when locations change
        setJets([]);
        setJetsSearched(false);

        // Create route for the new locations
        const { getCityCoordinates } = await import("@/lib/city-coordinates");
        const fromCoords = getCityCoordinates(jetContext.origin);
        const toCoords = getCityCoordinates(jetContext.destination);

        if (fromCoords && toCoords) {
          const newRoute: Route = {
            from: {
              city: jetContext.origin,
              lat: fromCoords.lat,
              lon: fromCoords.lon,
            },
            to: {
              city: jetContext.destination,
              lat: toCoords.lat,
              lon: toCoords.lon,
            },
          };
          setJetRoute(newRoute);
        }
      } else {
        // If no complete route, clear route
        setJetRoute(null);
      }
    };

    updateJetRoute();
  }, [jetContext.origin, jetContext.destination]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsRecording(false);
      };

      recognitionRef.current.onerror = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const toggleVoiceOutput = () => {
    const newValue = !voiceOutputEnabled;
    setVoiceOutputEnabled(newValue);
    localStorage.setItem("voiceOutput", String(newValue));

    if (!newValue && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const speakText = useCallback(
    (text: string) => {
      if (
        typeof window === "undefined" ||
        !window.speechSynthesis ||
        !voiceOutputEnabled
      )
        return;
      if (text.length > 200) return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    },
    [voiceOutputEnabled]
  );

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    setMessages((prev) => [...prev, { text, who: "user" }]);
    setInputValue("");

    const extracted = extractInfo(text);

    // Determine if this is a jet or flight query based on keywords
    const isJetQuery =
      text.toLowerCase().includes("jet") ||
      text.toLowerCase().includes("private");

    // Update appropriate context based on query type
    if (isJetQuery) {
      setJetContext((prev) => ({ ...prev, ...extracted, lastQuery: text }));
    } else {
      setFlightContext((prev) => ({ ...prev, ...extracted, lastQuery: text }));
    }

    const hasLocation = extracted.origin || extracted.destination;
    const hasCompleteDetails = extracted.departDate || extracted.passengers > 1;

    if (hasLocation && !hasCompleteDetails && text.length < 50) {
      // Store extracted values for quick form (using ref for immediate update)
      // Don't read from state context as it hasn't updated yet (async)
      quickFormDefaultsRef.current = {
        origin: extracted.origin || "",
        destination: extracted.destination || "",
        departDate: extracted.departDate || "",
        returnDate: extracted.returnDate || "",
        passengers: extracted.passengers || 1,
        roundTrip: extracted.roundTrip || false,
        travelClass: extracted.travelClass || "economy",
        nonStopOnly: extracted.nonStopOnly || false,
        lastQuery: text,
        searchType: isJetQuery ? "jet" : "flight",
      };
      setQuickFormKey((prev) => prev + 1); // Force fresh mount
      setShowQuickForm(true);
      setMessages((prev) => [
        ...prev,
        {
          text: `I can help you search ${isJetQuery ? "jets" : "flights"} ${
            extracted.origin
              ? `from ${extracted.origin}`
              : extracted.destination
              ? `to ${extracted.destination}`
              : ""
          }. Please fill in the details below:`,
          who: "bot",
        },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      { text: "Searching...", who: "bot", isLoading: true },
    ]);

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: text,
        }),
      });

      const data: APIResponse = await response.json();

      setMessages((prev) => prev.filter((m) => !m.isLoading));

      let botText = data.text?.trim() || "";
      let flightsForChat: Flight[] = [];
      let newFlights: Flight[] = [];
      let newHotels: Hotel[] = [];
      let newSearchResults: SearchResult[] = [];
      let newRoute: Route | null = null;
      let newTravelPlan = "";
      let newTravelPlanImages: Record<string, string> = {};
      let newJets: Aircraft[] = [];

      data.tool_results?.forEach((tr) => {
        if (tr.flights) {
          newFlights = tr.flights;
          flightsForChat = tr.flights;
        }
        if (tr.jets) newJets = tr.jets;
        if (tr.hotels) newHotels = tr.hotels;
        if (tr.route) newRoute = tr.route;
        if (tr.travel_plan) {
          newTravelPlan = tr.travel_plan;
          if (tr.travel_plan_images) {
            newTravelPlanImages = tr.travel_plan_images;
          }
        }
        if (tr.search_results) {
          newSearchResults = Array.isArray(tr.search_results)
            ? tr.search_results
            : [];
        }
      });

      if (newFlights.length > 0) {
        setFlights(newFlights);
        setFlightsSearched(true);
        setActiveTab("flights");
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("flights");
        }

        // Update flight context with extracted info
        setFlightContext((prev) => ({
          ...prev,
          origin: extracted.origin || prev.origin,
          destination: extracted.destination || prev.destination,
        }));

        // Create flight route if not provided by API
        if (
          !newRoute &&
          (flightContext.origin || extracted.origin) &&
          (flightContext.destination || extracted.destination)
        ) {
          const { getCityCoordinates } = await import("@/lib/city-coordinates");
          const origin = extracted.origin || flightContext.origin;
          const destination =
            extracted.destination || flightContext.destination;

          const fromCoords = getCityCoordinates(origin);
          const toCoords = getCityCoordinates(destination);

          if (fromCoords && toCoords) {
            const createdRoute = {
              from: {
                city: origin,
                lat: fromCoords.lat,
                lon: fromCoords.lon,
              },
              to: {
                city: destination,
                lat: toCoords.lat,
                lon: toCoords.lon,
              },
            };
            setFlightRoute(createdRoute);
          }
        }
      }
      if (newJets.length > 0) {
        setJets(newJets);
        setJetsSearched(true);
        setActiveTab("jets");
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("jets");
        }

        // Update jet context with extracted info
        setJetContext((prev) => ({
          ...prev,
          origin: extracted.origin || prev.origin,
          destination: extracted.destination || prev.destination,
        }));
      }
      if (newHotels.length > 0) {
        setHotels(newHotels);
        if (text.toLowerCase().includes("hotel")) {
          setActiveTab("hotels");
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setMobileTab("hotels");
          }
        }
      }
      // Route is now handled automatically by useEffect when locations change
      if (newRoute) {
        console.log(
          "API provided route (will use auto-generated route instead):",
          newRoute
        );
      }
      if (newTravelPlan) {
        setTravelPlan(newTravelPlan);
        setTravelPlanImages(newTravelPlanImages);
        setActiveTab("plan");
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("plan");
        }
      }
      if (newSearchResults.length > 0) {
        setSearchResults(newSearchResults);
        setActiveTab("plan");
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("plan");
        }
      }

      if (botText) {
        if (flightsForChat.length > 0) {
          const lines = botText.split("\n");
          const filteredLines = lines.filter((line) => {
            const trimmed = line.trim();
            return !(
              /^---\s*Flights?\s*\(.*?\)\s*---/i.test(trimmed) ||
              /^Here are (some|the) (direct )?flight options? for you:?/i.test(
                trimmed
              ) ||
              /^\d+\.\s*[A-Za-z\s]+\s*\|.*?(dep|Departs|arr|Arrives)/i.test(
                trimmed
              )
            );
          });
          botText = filteredLines.join("\n").trim();
          if (!botText || botText.length < 10) {
            botText = "Great! I found flight options for you. ✈️";
          }
        }

        setMessages((prev) => [...prev, { text: botText, who: "bot" }]);
        speakText(botText);
      } else if (flightsForChat.length > 0) {
        const msg = "Great! I found flight options for you. ✈️";
        setMessages((prev) => [...prev, { text: msg, who: "bot" }]);
        speakText(msg);
      }
    } catch (error) {
      setMessages((prev) => prev.filter((m) => !m.isLoading));
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, I encountered an error. Please try again.",
          who: "bot",
        },
      ]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleLocationChange = useCallback(
    (origin: string, destination: string, searchType: "flight" | "jet") => {
      // Update the appropriate context immediately when locations change
      if (searchType === "jet") {
        setJetContext((prev) => ({
          ...prev,
          origin,
          destination,
        }));
      } else {
        setFlightContext((prev) => ({
          ...prev,
          origin,
          destination,
        }));
      }
    },
    []
  );

  const handleSearchFormSubmit = (searchData: Partial<Context>) => {
    setShowQuickForm(false);

    // Update the correct context based on search type
    if (searchData.searchType === "jet") {
      setJetContext((prev) => ({ ...prev, ...searchData }));
    } else {
      setFlightContext((prev) => ({ ...prev, ...searchData }));
    }

    const tripType = searchData.roundTrip ? "round-trip" : "one-way";

    if (searchData.searchType === "jet") {
      const summaryParts = [
        `${tripType} private jet from ${searchData.origin} to ${searchData.destination}`,
        searchData.departDate &&
          `Departure: ${new Date(searchData.departDate).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
          )}`,
        searchData.returnDate &&
          searchData.roundTrip &&
          `Return: ${new Date(searchData.returnDate).toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
            }
          )}`,
        `${searchData.passengers} ${
          searchData.passengers === 1 ? "passenger" : "passengers"
        }`,
      ].filter(Boolean);

      const searchMessage = `Find ${summaryParts.join(", ")}`;
      sendMessage(searchMessage);
    } else {
      const summaryParts = [
        `${tripType} flight from ${searchData.origin} to ${searchData.destination}`,
        searchData.departDate &&
          `Departure: ${new Date(searchData.departDate).toLocaleDateString(
            "en-US",
            { month: "long", day: "numeric", year: "numeric" }
          )}`,
        searchData.returnDate &&
          searchData.roundTrip &&
          `Return: ${new Date(searchData.returnDate).toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric",
            }
          )}`,
        `${searchData.passengers} ${
          searchData.passengers === 1 ? "passenger" : "passengers"
        }`,
        searchData.travelClass && `Class: ${searchData.travelClass}`,
      ].filter(Boolean);

      const searchMessage = `Find ${summaryParts.join(", ")}`;
      sendMessage(searchMessage);
    }
  };

  const suggestions = [
    "Find flights from Delhi to Mumbai",
    "Show me hotels in Goa",
    "Plan a 5-day trip to Kerala",
    "Best restaurants in Bangalore",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Naveo AI"
              width={160}
              height={44}
              className="h-12 w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleVoiceOutput}
              className={voiceOutputEnabled ? "text-primary" : ""}
            >
              {voiceOutputEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="md:hidden border-b bg-card">
        <div className="grid grid-cols-6">
          <button
            className={`py-3 text-xs font-medium ${
              mobileTab === "chat"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("chat")}
          >
            Chat
          </button>
          <button
            className={`py-3 text-xs font-medium ${
              mobileTab === "flights"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("flights")}
          >
            Flights
          </button>
          <button
            className={`py-3 text-xs font-medium ${
              mobileTab === "hotels"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("hotels")}
          >
            Hotels
          </button>
          <button
            className={`py-3 text-xs font-medium ${
              mobileTab === "plan"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("plan")}
          >
            Plan
          </button>
          <button
            className={`py-3 text-xs font-medium ${
              mobileTab === "jets"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("jets")}
          >
            Jets
          </button>
          <button
            className={`py-3 text-xs font-medium ${
              mobileTab === "voice"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setMobileTab("voice")}
          >
            Voice
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="w-[35%] border-r flex flex-col">
            <ChatPanel
              messages={messages}
              chatEndRef={chatEndRef}
              showDetailsForm={showDetailsForm}
              context={flightContext}
              onContextUpdate={setFlightContext}
              onSearchFormSubmit={handleSearchFormSubmit}
              onLocationChange={handleLocationChange}
              onDetailsSubmit={(updatedContext) => {
                setFlightContext(updatedContext);
                setShowDetailsForm(false);
                const summaryParts = [
                  `Route: ${updatedContext.origin} to ${updatedContext.destination}`,
                  updatedContext.departDate &&
                    `Departure date: ${updatedContext.departDate}`,
                  updatedContext.returnDate &&
                    `Return date: ${updatedContext.returnDate}`,
                  `Travellers: ${updatedContext.passengers}`,
                  `Travel class: ${updatedContext.travelClass}`,
                  updatedContext.nonStopOnly &&
                    "Preference: Nonstop flights only",
                ].filter(Boolean);
                const summaryMessage = `Here are my flight details:\n${summaryParts
                  .map((p) => `• ${p}`)
                  .join("\n")}\nPlease find the best flight options for me.`;
                sendMessage(summaryMessage);
              }}
              onDetailsSkip={() => {
                setShowDetailsForm(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    text: "No rush! Share your travel dates whenever you're ready and I'll take it from there.",
                    who: "bot",
                  },
                ]);
              }}
            />

            <div className="border-t p-4 bg-card/50">
              {messages.length === 0 && (
                <div className="mb-4 hidden md:flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me about flights, hotels, or travel plans..."
                  className="flex-1"
                />
                {recognitionRef.current && (
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={toggleVoiceInput}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
                <Button onClick={() => sendMessage()} size="icon">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="w-[65%] flex flex-col overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="mx-4 mt-4">
                <TabsTrigger value="flights">Flights</TabsTrigger>
                <TabsTrigger value="hotels">Hotels</TabsTrigger>
                <TabsTrigger value="plan">Travel Plan</TabsTrigger>
                <TabsTrigger value="jets">Jets</TabsTrigger>
                <TabsTrigger value="voice">Voice Mode</TabsTrigger>
              </TabsList>

              {showQuickForm && (
                <div className="mx-4 mt-2">
                  <FlightSearchForm
                    key={`quick-form-${quickFormKey}`}
                    onSearch={(searchData) => {
                      setShowQuickForm(false);
                      handleSearchFormSubmit(searchData);
                    }}
                    defaultValues={quickFormDefaultsRef.current}
                    onLocationChange={handleLocationChange}
                    isQuickForm={true}
                  />
                </div>
              )}

              <TabsContent
                value="flights"
                className="flex-1 overflow-auto mt-0"
              >
                <FlightsPanel
                  flights={flights}
                  context={flightContext}
                  route={flightRoute}
                  searched={flightsSearched}
                />
              </TabsContent>
              <TabsContent value="hotels" className="flex-1 overflow-auto mt-0">
                <HotelsPanel hotels={hotels} />
              </TabsContent>
              <TabsContent value="plan" className="flex-1 overflow-auto mt-0">
                <TravelPlanPanel
                  travelPlan={travelPlan}
                  travelPlanImages={travelPlanImages}
                  searchResults={searchResults}
                />
              </TabsContent>
              <TabsContent value="jets" className="flex-1 overflow-auto mt-0">
                <JetsPanel
                  jets={jets}
                  onJetSelect={setSelectedJet}
                  route={jetRoute}
                  searched={jetsSearched}
                />
              </TabsContent>
              <TabsContent value="voice" className="flex-1 overflow-hidden mt-0">
                <VoiceModePanel
                  onSendToChat={async (query) => {
                    // Just send to chat - existing backend will handle everything
                    await sendMessage(query);
                  }}
                  sessionId={sessionIdRef.current}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          {mobileTab === "chat" && (
            <>
              <ChatPanel
                messages={messages}
                chatEndRef={chatEndRef}
                showDetailsForm={showDetailsForm}
                context={flightContext}
                onContextUpdate={setFlightContext}
                onSearchFormSubmit={handleSearchFormSubmit}
                onLocationChange={handleLocationChange}
                hideMainForm={showQuickForm}
                onDetailsSubmit={(updatedContext) => {
                  setFlightContext(updatedContext);
                  setShowDetailsForm(false);
                  const summaryParts = [
                    `Route: ${updatedContext.origin} to ${updatedContext.destination}`,
                    updatedContext.departDate &&
                      `Departure date: ${updatedContext.departDate}`,
                    updatedContext.returnDate &&
                      `Return date: ${updatedContext.returnDate}`,
                    `Travellers: ${updatedContext.passengers}`,
                    `Travel class: ${updatedContext.travelClass}`,
                    updatedContext.nonStopOnly &&
                      "Preference: Nonstop flights only",
                  ].filter(Boolean);
                  const summaryMessage = `Here are my flight details:\n${summaryParts
                    .map((p) => `• ${p}`)
                    .join("\n")}\nPlease find the best flight options for me.`;
                  sendMessage(summaryMessage);
                }}
                onDetailsSkip={() => {
                  setShowDetailsForm(false);
                  setMessages((prev) => [
                    ...prev,
                    {
                      text: "No rush! Share your travel dates whenever you're ready and I'll take it from there.",
                      who: "bot",
                    },
                  ]);
                }}
              />
              {showQuickForm && (
                <div className="mx-4 mb-20 md:mb-4">
                  <FlightSearchForm
                    key={`quick-form-mobile-${quickFormKey}`}
                    onSearch={(searchData) => {
                      setShowQuickForm(false);
                      handleSearchFormSubmit(searchData);
                    }}
                    defaultValues={quickFormDefaultsRef.current}
                    onLocationChange={handleLocationChange}
                    isQuickForm={true}
                  />
                </div>
              )}
              <div className="border-t p-4 bg-card/50">
                {messages.length === 0 && (
                  <div className="mb-4 hidden md:flex flex-wrap gap-2">
                    {suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Ask me about flights, hotels, or travel plans..."
                    className="flex-1"
                  />
                  {recognitionRef.current && (
                    <Button
                      variant={isRecording ? "destructive" : "outline"}
                      size="icon"
                      onClick={toggleVoiceInput}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                  <Button onClick={() => sendMessage()} size="icon">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
          {mobileTab === "flights" && (
            <div className="flex-1 overflow-auto">
              <FlightsPanel
                flights={flights}
                context={flightContext}
                route={flightRoute}
                searched={flightsSearched}
              />
            </div>
          )}
          {mobileTab === "hotels" && (
            <div className="flex-1 overflow-auto">
              <HotelsPanel hotels={hotels} />
            </div>
          )}
          {mobileTab === "plan" && (
            <div className="flex-1 overflow-auto">
              <TravelPlanPanel
                travelPlan={travelPlan}
                travelPlanImages={travelPlanImages}
                searchResults={searchResults}
              />
            </div>
          )}
          {mobileTab === "jets" && (
            <div className="flex-1 overflow-auto">
              <JetsPanel
                jets={jets}
                onJetSelect={setSelectedJet}
                route={jetRoute}
                searched={jetsSearched}
              />
            </div>
          )}
          {mobileTab === "voice" && (
            <div className="flex-1 overflow-hidden">
              <VoiceModePanel
                onSendToChat={async (query) => {
                  // Just send to chat - existing backend will handle everything
                  await sendMessage(query);
                }}
                sessionId={sessionIdRef.current}
              />
            </div>
          )}
        </div>
      </div>
      <JetDetailModal jet={selectedJet} onClose={() => setSelectedJet(null)} />
    </div>
  );
}
