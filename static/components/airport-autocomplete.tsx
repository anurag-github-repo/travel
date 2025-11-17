"use client";

import { useState, useEffect, useRef } from "react";
import { searchAirports, type Airport } from "@/lib/airports-data";
import { Plane } from "lucide-react";

interface AirportAutocompleteProps {
  value: string;
  onChange: (code: string, city: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  compact?: boolean;
}

export default function AirportAutocomplete({
  value,
  onChange,
  placeholder = "Search airports...",
  label,
  required = false,
  compact = false,
}: AirportAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.length >= 2) {
      const results = searchAirports(val);
      setSuggestions(results);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setInputValue(`${airport.code} - ${airport.city}`);
    setShowSuggestions(false);
    onChange(airport.code, airport.city);
  };

  const handleFocus = () => {
    if (inputValue.length >= 2) {
      const results = searchAirports(inputValue);
      setSuggestions(results);
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className={`block font-medium ${compact ? 'text-xs mb-1' : 'text-sm mb-1.5'}`}>
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <div className="relative">
        <div className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none ${compact ? 'left-2' : 'left-3'}`}>
          <Plane className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? 'h-8 pl-8 pr-2 text-xs' : 'h-10 pl-10 pr-3 text-sm'}`}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((airport) => (
            <button
              key={airport.code}
              type="button"
              onClick={() => handleSelectAirport(airport)}
              className="w-full px-3 py-2.5 text-left hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border last:border-0 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">
                    {airport.code} - {airport.city}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {airport.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {airport.country}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
