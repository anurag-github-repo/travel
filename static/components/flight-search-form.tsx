"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRightLeft,
  Calendar,
  Users,
  Repeat,
  UserPlus,
  Baby,
  Sun,
  Moon,
  Briefcase,
  Plane,
  Minus,
  Plus,
} from "lucide-react";
import AirportAutocomplete from "./airport-autocomplete";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { Context } from "@/lib/types";

interface FlightSearchFormProps {
  onSearch: (searchData: Partial<Context>) => void;
  defaultValues?: Partial<Context>;
  onLocationChange?: (origin: string, destination: string, searchType: "flight" | "jet") => void;
  isQuickForm?: boolean;
}

export default function FlightSearchForm({
  onSearch,
  defaultValues,
  onLocationChange,
  isQuickForm = false,
}: FlightSearchFormProps) {
  // Collapse by default on mobile, but always expand for quick form
  const [isExpanded, setIsExpanded] = useState(() => {
    if (isQuickForm) return true; // Always expand quick form
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768; // Collapsed on mobile, expanded on desktop
    }
    return false; // Default to collapsed during SSR
  });
  const [activeTab, setActiveTab] = useState<"flights" | "jets">("flights");
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">(
    defaultValues?.roundTrip === true ? "roundTrip" : "oneWay"
  );
  const [jetTripType, setJetTripType] = useState<"oneWay" | "roundTrip">(
    "oneWay"
  );

  const [departureCode, setDepartureCode] = useState("");
  const [departureCity, setDepartureCity] = useState(
    defaultValues?.origin || ""
  );
  const [arrivalCode, setArrivalCode] = useState("");
  const [arrivalCity, setArrivalCity] = useState(
    defaultValues?.destination || ""
  );
  const [departDate, setDepartDate] = useState(defaultValues?.departDate || "");
  const [returnDate, setReturnDate] = useState(defaultValues?.returnDate || "");

  const [adults, setAdults] = useState(
    defaultValues?.passengers ? Math.max(1, defaultValues.passengers) : 1
  );
  const [children, setChildren] = useState(0);
  const [travelClass, setTravelClass] = useState<string>(
    defaultValues?.travelClass || "economy"
  );
  const [timePreference, setTimePreference] = useState<"day" | "night" | "any">(
    "any"
  );
  const [stopPreference, setStopPreference] = useState<
    "any" | "nonstop" | "onestop"
  >("any");
  const [jetPassengers, setJetPassengers] = useState(2);

  // Auto-expand for quick form
  useEffect(() => {
    if (isQuickForm) {
      setIsExpanded(true);
    }
  }, [isQuickForm]);

  // Sync state with defaultValues when they change
  useEffect(() => {
    if (defaultValues?.origin) {
      setDepartureCity(defaultValues.origin);
    }
    if (defaultValues?.destination) {
      setArrivalCity(defaultValues.destination);
    }
  }, [defaultValues]);

  // Call onLocationChange whenever locations change
  useEffect(() => {
    if (departureCity && arrivalCity && onLocationChange) {
      const searchType = activeTab === "jets" ? "jet" : "flight";
      onLocationChange(departureCity, arrivalCity, searchType);
    }
  }, [departureCity, arrivalCity, activeTab, onLocationChange]);

  const handleSwapAirports = () => {
    const tempCode = departureCode;
    const tempCity = departureCity;
    setDepartureCode(arrivalCode);
    setDepartureCity(arrivalCity);
    setArrivalCode(tempCode);
    setArrivalCity(tempCity);
  };

  const toggleTripType = () => {
    setTripType((prev) => (prev === "oneWay" ? "roundTrip" : "oneWay"));
  };

  const toggleJetTripType = () => {
    setJetTripType((prev) => (prev === "oneWay" ? "roundTrip" : "oneWay"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "flights") {
      const totalPassengers = adults + children;
      const searchData: Partial<Context> = {
        searchType: "flight",
        origin: departureCity,
        destination: arrivalCity,
        departDate,
        returnDate: tripType === "roundTrip" ? returnDate : "",
        passengers: totalPassengers,
        roundTrip: tripType === "roundTrip",
        travelClass,
        timePreference,
        nonStopOnly: stopPreference === "nonstop",
      };
      onSearch(searchData);
    } else {
      const searchData: Partial<Context> = {
        searchType: "jet",
        origin: departureCity,
        destination: arrivalCity,
        departDate,
        returnDate: jetTripType === "roundTrip" ? returnDate : "",
        passengers: jetPassengers,
        roundTrip: jetTripType === "roundTrip",
      };
      onSearch(searchData);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-card border-b shadow-sm mt-2 md:mt-0 flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setActiveTab("flights")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "flights"
              ? "text-[#05B481] border-b-2 border-[#05B481] bg-[#05B481]/5"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Plane className="w-4 h-4" />
            Flights
          </div>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("jets")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "jets"
              ? "text-[#05B481] border-b-2 border-[#05B481] bg-[#05B481]/5"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Plane className="w-4 h-4 rotate-45" />
            Private Jets
          </div>
        </button>
      </div>

      {/* Compact Header */}
      <div className={`flex items-center justify-between transition-colors ${isQuickForm ? 'px-3 py-2' : 'px-3 md:px-4 py-3 md:py-3'}`}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (activeTab === "flights") {
              toggleTripType();
            } else {
              toggleJetTripType();
            }
          }}
          className={`flex items-center rounded-md bg-[#05B481] text-white hover:bg-[#049668] transition-colors flex-shrink-0 ${isQuickForm ? 'gap-1 px-2 py-1 text-xs' : 'gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm'} font-medium`}
        >
          <Repeat className={isQuickForm ? "w-3 h-3" : "w-3 h-3 md:w-4 md:h-4"} />
          <span className="whitespace-nowrap">
            {activeTab === "flights"
              ? tripType === "oneWay"
                ? "One Way"
                : "Round Trip"
              : jetTripType === "oneWay"
              ? "One Way"
              : "Round Trip"}
          </span>
        </button>

        <button
          type="button"
          className="p-1.5 md:p-2 hover:bg-accent rounded-md transition-colors flex-shrink-0"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Forms */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          className={`${isQuickForm ? 'px-3 pb-2 pt-1 space-y-2' : 'px-4 pb-4 pt-2 space-y-3 md:space-y-4'} animate-in slide-in-from-top-2 duration-200 max-h-[60vh] md:max-h-none overflow-y-auto custom-scrollbar`}
        >
          {/* FLIGHTS FORM */}
          {activeTab === "flights" && (
            <>
              {isQuickForm ? (
                /* QUICK FORM - Compact layout with 4 fields per row */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <AirportAutocomplete
                      value={departureCity}
                      onChange={(code, city) => {
                        setDepartureCode(code);
                        setDepartureCity(city);
                      }}
                      label="Leaving from"
                      placeholder="Select departure airport"
                      required
                      compact={true}
                    />

                    <AirportAutocomplete
                      value={arrivalCity}
                      onChange={(code, city) => {
                        setArrivalCode(code);
                        setArrivalCity(city);
                      }}
                      label="Going to"
                      placeholder="Select arrival airport"
                      required
                      compact={true}
                    />

                    <div className="relative">
                      <label className="block text-xs font-medium mb-1">
                        Departing on <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
                        <input
                          type="date"
                          value={departDate}
                          onChange={(e) => setDepartDate(e.target.value)}
                          min={today}
                          required
                          className="w-full h-8 pl-8 pr-2 rounded-md border bg-background text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05B481] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {tripType === "roundTrip" && (
                      <div className="relative">
                        <label className="block text-xs font-medium mb-1">
                          Returning on <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
                          <input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            min={departDate || today}
                            required={tripType === "roundTrip"}
                            className="w-full h-8 pl-8 pr-2 rounded-md border bg-background text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05B481] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="relative">
                      <label className="block text-xs font-medium mb-1">
                        Adults <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <UserPlus className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="number"
                          value={adults}
                          onChange={(e) =>
                            setAdults(Math.max(1, Number(e.target.value)))
                          }
                          min="1"
                          max="9"
                          required
                          className="pl-8 h-8 text-xs focus-visible:ring-[#05B481]"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium mb-1">
                        Children
                      </label>
                      <div className="relative">
                        <Baby className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          type="number"
                          value={children}
                          onChange={(e) =>
                            setChildren(Math.max(0, Number(e.target.value)))
                          }
                          min="0"
                          max="9"
                          className="pl-8 h-8 text-xs focus-visible:ring-[#05B481]"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium mb-1">
                        Stops
                      </label>
                      <div className="relative">
                        <Plane className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
                        <Select
                          value={stopPreference}
                          onValueChange={(value: "any" | "nonstop" | "onestop") =>
                            setStopPreference(value)
                          }
                        >
                          <SelectTrigger className="pl-8 h-8 text-xs focus:ring-[#05B481]">
                            <SelectValue placeholder="Any stops" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any Stops</SelectItem>
                            <SelectItem value="nonstop">Non-stop</SelectItem>
                            <SelectItem value="onestop">1 Stop Max</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-xs font-medium mb-1">
                        Class
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none z-10" />
                        <Select
                          value={travelClass}
                          onValueChange={setTravelClass}
                        >
                          <SelectTrigger className="pl-8 h-8 text-xs focus:ring-[#05B481]">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="economy">Economy</SelectItem>
                            <SelectItem value="premium_economy">
                              Premium Economy
                            </SelectItem>
                            <SelectItem value="business">Business</SelectItem>
                            <SelectItem value="first">First Class</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* REGULAR FORM - Original layout */
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-end">
                    <AirportAutocomplete
                      value={departureCity}
                      onChange={(code, city) => {
                        setDepartureCode(code);
                        setDepartureCity(city);
                      }}
                      label="Leaving from"
                      placeholder="Select departure airport"
                      required
                    />

                    <button
                      type="button"
                      onClick={handleSwapAirports}
                      className="hidden md:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center rounded-full border-2 border-[#05B481] hover:bg-[#05B481] hover:text-white transition-colors mb-0.5"
                      title="Swap airports"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <AirportAutocomplete
                      value={arrivalCity}
                      onChange={(code, city) => {
                        setArrivalCode(code);
                        setArrivalCity(city);
                      }}
                      label="Going to"
                      placeholder="Select arrival airport"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="block text-sm font-medium mb-1.5">
                        Departing on <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <input
                          type="date"
                          value={departDate}
                          onChange={(e) => setDepartDate(e.target.value)}
                          min={today}
                          required
                          className="w-full h-9 md:h-10 pl-10 pr-3 rounded-md border bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05B481] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {tripType === "roundTrip" && (
                      <div className="relative">
                        <label className="block text-sm font-medium mb-1.5">
                          Returning on <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                          <input
                            type="date"
                            value={returnDate}
                            onChange={(e) => setReturnDate(e.target.value)}
                            min={departDate || today}
                            required={tripType === "roundTrip"}
                            className="w-full h-9 md:h-10 pl-10 pr-3 rounded-md border bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05B481] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="relative">
                        <label className="block text-sm font-medium mb-1.5">
                          Adults <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="number"
                            value={adults}
                            onChange={(e) =>
                              setAdults(Math.max(1, Number(e.target.value)))
                            }
                            min="1"
                            max="9"
                            required
                            className="pl-10 focus-visible:ring-[#05B481]"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          12+ years
                        </p>
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium mb-1.5">
                          Children
                        </label>
                        <div className="relative">
                          <Baby className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="number"
                            value={children}
                            onChange={(e) =>
                              setChildren(Math.max(0, Number(e.target.value)))
                            }
                            min="0"
                            max="9"
                            className="pl-10 focus-visible:ring-[#05B481]"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          0-11 years
                        </p>
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium mb-1.5">
                          Stops
                        </label>
                        <div className="relative">
                          <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                          <Select
                            value={stopPreference}
                            onValueChange={(value: "any" | "nonstop" | "onestop") =>
                              setStopPreference(value)
                            }
                          >
                            <SelectTrigger className="pl-10 h-9 md:h-10 focus:ring-[#05B481]">
                              <SelectValue placeholder="Any stops" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="any">Any Stops</SelectItem>
                              <SelectItem value="nonstop">Non-stop</SelectItem>
                              <SelectItem value="onestop">1 Stop Max</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <label className="block text-sm font-medium mb-1.5">
                          Class
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                          <Select
                            value={travelClass}
                            onValueChange={setTravelClass}
                          >
                            <SelectTrigger className="pl-10 h-9 md:h-10 focus:ring-[#05B481]">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="economy">Economy</SelectItem>
                              <SelectItem value="premium_economy">
                                Premium Economy
                              </SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="first">First Class</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium mb-1.5">
                          Time Preference
                        </label>
                        <Select
                          value={timePreference}
                          onValueChange={(value: "day" | "night" | "any") =>
                            setTimePreference(value)
                          }
                        >
                          <SelectTrigger className="h-9 md:h-10 focus:ring-[#05B481]">
                            <SelectValue placeholder="Any time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Any Time
                              </div>
                            </SelectItem>
                            <SelectItem value="day">
                              <div className="flex items-center gap-2">
                                <Sun className="w-4 h-4 text-yellow-500" />
                                Day (6 AM - 6 PM)
                              </div>
                            </SelectItem>
                            <SelectItem value="night">
                              <div className="flex items-center gap-2">
                                <Moon className="w-4 h-4 text-blue-500" />
                                Night (6 PM - 6 AM)
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* JETS FORM */}
          {activeTab === "jets" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-end">
                <AirportAutocomplete
                  value={departureCity}
                  onChange={(code, city) => {
                    setDepartureCode(code);
                    setDepartureCity(city);
                  }}
                  label="Leaving from"
                  placeholder="Los Angeles Intl KLAX"
                  required
                />

                <button
                  type="button"
                  onClick={handleSwapAirports}
                  className="hidden md:flex w-9 h-9 md:w-10 md:h-10 items-center justify-center rounded-full border-2 border-[#05B481] hover:bg-[#05B481] hover:text-white transition-colors mb-0.5"
                  title="Swap airports"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </button>

                <AirportAutocomplete
                  value={arrivalCity}
                  onChange={(code, city) => {
                    setArrivalCode(code);
                    setArrivalCity(city);
                  }}
                  label="Going to"
                  placeholder="Chicago (Area)"
                  required
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">
                  Passengers
                </label>
                <div className="flex items-center gap-3 h-9 md:h-12 px-3 md:px-4 rounded-md border bg-background">
                  <button
                    type="button"
                    onClick={() =>
                      setJetPassengers(Math.max(1, jetPassengers - 1))
                    }
                    className="p-1 hover:bg-accent rounded transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="flex-1 text-center text-base font-medium">
                    {jetPassengers} Passenger{jetPassengers !== 1 ? "s" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setJetPassengers(Math.min(20, jetPassengers + 1))
                    }
                    className="p-1 hover:bg-accent rounded transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-sm font-medium mb-1.5">
                    Departure Date <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <input
                      type="date"
                      value={departDate}
                      onChange={(e) => setDepartDate(e.target.value)}
                      min={today}
                      required
                      className="w-full h-9 md:h-12 pl-10 pr-3 rounded-md border bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05B481] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                {jetTripType === "roundTrip" && (
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1.5">
                      Return Date <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        min={departDate || today}
                        required={jetTripType === "roundTrip"}
                        className="w-full h-9 md:h-12 pl-10 pr-3 rounded-md border bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05B481] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div className={`flex justify-end ${isQuickForm ? 'pt-1' : 'pt-2'}`}>
            <Button
              type="submit"
              className={`${isQuickForm ? 'w-full md:w-auto px-4 h-8 gap-1.5 text-xs' : 'w-full md:w-auto px-6 md:px-8 h-10 md:h-12 gap-2 text-sm md:text-base'} bg-[#05B481] hover:bg-[#049668] text-white font-semibold`}
            >
              <Search className={isQuickForm ? "w-3.5 h-3.5" : "w-5 h-5"} />
              Search
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
