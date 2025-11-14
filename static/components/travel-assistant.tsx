"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Moon,
  Sun,
  Send,
  Mic,
  Volume2,
  VolumeX,
  Map as MapIcon,
  List,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatPanel from "@/components/chat-panel";
import FlightsPanel from "@/components/flights-panel";
import HotelsPanel from "@/components/hotels-panel";
import TravelPlanPanel from "@/components/travel-plan-panel";
import AirportsMap from "@/components/airports-map";
import Image from "next/image";
import type {
  Message,
  Context,
  Flight,
  Hotel,
  SearchResult,
  Route,
  APIResponse,
  Aircraft
} from "@/lib/types";
import { extractInfo } from "@/lib/helpers";
import JetsPanel from "./jets-panel";
import JetDetailModal from "@/components/jet-detail-modal"; 

export default function TravelAssistant() {
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [jets, setJets] = useState<Aircraft[]>([]);
   const [selectedJet, setSelectedJet] = useState<Aircraft | null>(null);
  const [context, setContext] = useState<Context>({
    origin: "",
    destination: "",
    departDate: "",
    returnDate: "",
    passengers: 1,
    roundTrip: true,
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
  const [route, setRoute] = useState<Route | null>(null);
  const [activeTab, setActiveTab] = useState("flights");
  const [showAirportsMap, setShowAirportsMap] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat");

  const [isRecording, setIsRecording] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [showDetailsForm, setShowDetailsForm] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef(Math.random().toString(36).slice(2));

  // Initialize voice output state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("voiceOutput");
    setVoiceOutputEnabled(saved !== "false");
  }, []);

  // Debug: Log route changes
  useEffect(() => {
    console.log("🗺️ Route state updated:", route);
    if (route) {
      console.log("Route details:", {
        from: `${route.from.city} (${route.from.lat}, ${route.from.lon})`,
        to: `${route.to.city} (${route.to.lat}, ${route.to.lon})`
      });
    }
  }, [route]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice input setup
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
      if (text.length > 200) return; // Don't speak long messages

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

    // Add user message
    setMessages((prev) => [...prev, { text, who: "user" }]);
    setInputValue("");

    // Extract info and update context
    const extracted = extractInfo(text);
    setContext((prev) => ({ ...prev, ...extracted, lastQuery: text }));

    // Show loading
    setMessages((prev) => [
      ...prev,
      { text: "Searching...", who: "bot", isLoading: true },
    ]);

    try {
      const response = await fetch(
        "http://localhost:8000/chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionIdRef.current,
            message: text,
          }),
        }
      );

      const data: APIResponse = await response.json();

      // Remove loading message
      setMessages((prev) => prev.filter((m) => !m.isLoading));

      // Process response
      let botText = data.text?.trim() || "";
      let flightsForChat: Flight[] = [];
      let newFlights: Flight[] = [];
      let newHotels: Hotel[] = [];
      let newSearchResults: SearchResult[] = [];
      let newRoute: Route | null = null;
      let newTravelPlan = "";
      let newTravelPlanImages: Record<string, string> = {};
      let newJets: Aircraft[] = [];
      // Process tool results
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

      // Update state
      if (newFlights.length > 0) {
        setFlights(newFlights);
        setActiveTab("flights");
        // Auto-switch to flights tab on mobile when flights are loaded
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("flights");
        }

        // Create route from context if not provided by API
        if (
          !newRoute &&
          (context.origin || extracted.origin) &&
          (context.destination || extracted.destination)
        ) {
          const { getCityCoordinates } = await import("@/lib/city-coordinates");
          const origin = extracted.origin || context.origin;
          const destination = extracted.destination || context.destination;

          console.log("Creating route for:", origin, "to", destination);

          const fromCoords = getCityCoordinates(origin);
          const toCoords = getCityCoordinates(destination);

          console.log("From coords:", fromCoords);
          console.log("To coords:", toCoords);

          if (fromCoords && toCoords) {
            newRoute = {
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
            console.log("Created route:", newRoute);
            setRoute(newRoute);
          } else {
            console.error("Could not find coordinates for cities");
          }
        }
      }
      if (newJets.length > 0) { // <--- ADD THIS ENTIRE BLOCK
        setJets(newJets);
        setActiveTab("jets");
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("jets");
        }
      }
      if (newHotels.length > 0) {
        setHotels(newHotels);
        if (text.toLowerCase().includes("hotel")) {
          setActiveTab("hotels");
          // Auto-switch to hotels tab on mobile when hotels are loaded
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setMobileTab("hotels");
          }
        }
      }
      if (newRoute) {
        console.log("Setting route from API response:", newRoute);
        setRoute(newRoute);
      }
      if (newTravelPlan) {
        setTravelPlan(newTravelPlan);
        setTravelPlanImages(newTravelPlanImages);
        setActiveTab("plan");
        // Auto-switch to plan tab on mobile when travel plan is loaded
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("plan");
        }
      }
      if (newSearchResults.length > 0) {
        setSearchResults(newSearchResults);
        setActiveTab("plan");
        // Auto-switch to plan tab on mobile when search results are loaded
        if (typeof window !== "undefined" && window.innerWidth < 768) {
          setMobileTab("plan");
        }
      }

      // Add bot message
      if (botText) {
        // Filter out duplicate flight summary if we have structured flights
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

         setMessages((prev) => [
          ...prev,
          { text: botText, who: "bot" },
        ]);
        speakText(botText);
      } else if (flightsForChat.length > 0) {
        const msg = "Great! I found flight options for you. ✈️";
        setMessages((prev) => [
          ...prev,
          { text: msg, who: "bot" },
        ]);
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

  const handleSearchFormSubmit = (searchData: Partial<Context>) => {
    // Update context with the search data
    setContext((prev) => ({ ...prev, ...searchData }));

    // Create a message from the search data
    const tripType = searchData.roundTrip ? "round-trip" : "one-way";
    const summaryParts = [
      `${tripType} flight from ${searchData.origin} to ${searchData.destination}`,
      searchData.departDate &&
      `Departure: ${new Date(searchData.departDate).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" }
      )}`,
      searchData.returnDate &&
      searchData.roundTrip &&
      `Return: ${new Date(searchData.returnDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}`,
      `${searchData.passengers} ${searchData.passengers === 1 ? "passenger" : "passengers"
      }`,
    ].filter(Boolean);

    const searchMessage = `Find ${summaryParts.join(", ")}`;
    sendMessage(searchMessage);
  };

  const suggestions = [
    "Find flights from Delhi to Mumbai",
    "Show me hotels in Goa",
    "Plan a 5-day trip to Kerala",
    "Best restaurants in Bangalore",
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
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
              onClick={() => {
                console.log("Map button clicked. Current route:", route);
                setShowAirportsMap(!showAirportsMap);
              }}
              className={`hidden md:flex ${showAirportsMap ? "text-primary" : ""
                }`}
              title={showAirportsMap ? "Hide Map" : "Show Map"}
            >
              {showAirportsMap ? (
                <List className="h-5 w-5" />
              ) : (
                <MapIcon className="h-5 w-5" />
              )}
            </Button>
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

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-b bg-card">
        <div className="grid grid-cols-5">
          <button
            className={`py-3 text-xs font-medium ${mobileTab === "chat"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
              }`}
            onClick={() => setMobileTab("chat")}
          >
            Chat
          </button>
          <button
            className={`py-3 text-xs font-medium ${mobileTab === "flights"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
              }`}
            onClick={() => setMobileTab("flights")}
          >
            Flights
          </button>
          <button
            className={`py-3 text-xs font-medium ${mobileTab === "hotels"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
              }`}
            onClick={() => setMobileTab("hotels")}
          >
            Hotels
          </button>
          <button
            className={`py-3 text-xs font-medium ${mobileTab === "plan"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
              }`}
            onClick={() => setMobileTab("plan")}
          >
            Plan
          </button>
          <button
            className={`py-3 text-xs font-medium ${mobileTab === "jets"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground"
              }`}
            onClick={() => setMobileTab("jets")}
          >
            Jets
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Side by side */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* Chat Panel */}
          <div className="w-[35%] border-r flex flex-col">
            <ChatPanel
              messages={messages}
              chatEndRef={chatEndRef}
              showDetailsForm={showDetailsForm}
              context={context}
              onContextUpdate={setContext}
              onSearchFormSubmit={handleSearchFormSubmit}
              onDetailsSubmit={(updatedContext) => {
                setContext(updatedContext);
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

            {/* Input Area */}
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

          {/* Results Panel */}
          <div className="w-[65%] flex flex-col overflow-hidden">
            {showAirportsMap ? (
              <div className="flex-1 w-full h-full">
                <AirportsMap route={route} />
              </div>
            ) : (
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
                </TabsList>
                <TabsContent
                  value="flights"
                  className="flex-1 overflow-auto mt-0"
                >
                  <FlightsPanel flights={flights} context={context} />
                </TabsContent>
                <TabsContent
                  value="hotels"
                  className="flex-1 overflow-auto mt-0"
                >
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
                {/* PASS THE onJetSelect PROP HERE */}
                <JetsPanel jets={jets} onJetSelect={setSelectedJet} />
              </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        {/* Mobile: Tabbed */}
        <div className="md:hidden flex-1 flex flex-col overflow-hidden">
          {mobileTab === "chat" && (
            <>
              <ChatPanel
                messages={messages}
                chatEndRef={chatEndRef}
                showDetailsForm={showDetailsForm}
                context={context}
                onContextUpdate={setContext}
                onSearchFormSubmit={handleSearchFormSubmit}
                onDetailsSubmit={(updatedContext) => {
                  setContext(updatedContext);
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
            </>
          )}
          {mobileTab === "flights" && (
            <div className="flex-1 overflow-auto">
              <FlightsPanel flights={flights} context={context} />
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
              {/* PASS THE onJetSelect PROP FOR MOBILE VIEW AS WELL */}
              <JetsPanel jets={jets} onJetSelect={setSelectedJet} />
            </div>
          )}
        </div>
      </div>
       <JetDetailModal 
        jet={selectedJet} 
        onClose={() => setSelectedJet(null)} 
      />
    </div>
  );
}
