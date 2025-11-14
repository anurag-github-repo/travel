"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRightLeft,
  Calendar,
  Users,
  Repeat,
} from "lucide-react";
import AirportAutocomplete from "./airport-autocomplete";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Context } from "@/lib/types";

interface FlightSearchFormProps {
  onSearch: (searchData: Partial<Context>) => void;
  defaultValues?: Partial<Context>;
}

export default function FlightSearchForm({
  onSearch,
  defaultValues,
}: FlightSearchFormProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">(
    defaultValues?.roundTrip === false ? "oneWay" : "roundTrip"
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
  const [passengers, setPassengers] = useState(defaultValues?.passengers || 1);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const searchData: Partial<Context> = {
      origin: departureCity,
      destination: arrivalCity,
      departDate,
      returnDate: tripType === "roundTrip" ? returnDate : "",
      passengers,
      roundTrip: tripType === "roundTrip",
    };

    onSearch(searchData);
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-card border-b shadow-sm mt-2 md:mt-0">
      {/* Compact Header - Always Visible */}
      <div
        className="flex items-center justify-between px-3 md:px-4 py-3 md:py-3 cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTripType();
          }}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          <Repeat className="w-3 h-3 md:w-4 md:h-4" />
          <span className="whitespace-nowrap">
            {tripType === "oneWay" ? "One Way" : "Round Trip"}
          </span>
        </button>

        <button
          type="button"
          className="p-1.5 md:p-2 hover:bg-accent rounded-md transition-colors flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Expanded Form */}
      {isExpanded && (
        <form
          onSubmit={handleSubmit}
          className="px-4 pb-4 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-200"
        >
          {/* Airport Selection Row */}
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
              className="hidden md:flex w-10 h-10 items-center justify-center rounded-full border border-border hover:bg-accent hover:border-primary transition-colors mb-0.5"
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

          {/* Date and Passenger Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            <div className="relative">
              <label className="block text-sm font-medium mb-1.5">
                Passengers
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="number"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                  min="1"
                  max="9"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Search Button Row */}
          <div className="flex justify-end">
            <Button
              type="submit"
              className="w-full md:w-auto px-8 h-11 gap-2 text-base"
            >
              <Search className="w-5 h-5" />
              Search Flights
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
