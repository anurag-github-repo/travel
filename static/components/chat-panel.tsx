"use client";

import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import FlightSearchForm from "@/components/flight-search-form";
import type { Message, Context, Flight } from "@/lib/types";
import { formatMessage, parseTime, formatPrice } from "@/lib/helpers";

interface ChatPanelProps {
  messages: Message[];
  chatEndRef: React.RefObject<HTMLDivElement>;
  showDetailsForm: boolean;
  context: Context;
  onContextUpdate: (context: Context) => void;
  onDetailsSubmit: (context: Context) => void;
  onDetailsSkip: () => void;
  onSearchFormSubmit: (searchData: Partial<Context>) => void;
}

export default function ChatPanel({
  messages,
  chatEndRef,
  showDetailsForm,
  context,
  onContextUpdate,
  onDetailsSubmit,
  onDetailsSkip,
  onSearchFormSubmit,
}: ChatPanelProps) {
  const handleDetailsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedContext = {
      ...context,
      origin: (formData.get("origin") as string) || context.origin,
      destination:
        (formData.get("destination") as string) || context.destination,
      departDate: formData.get("departureDate") as string,
      returnDate: (formData.get("returnDate") as string) || "",
      passengers: Number(formData.get("passengers")) || 1,
      travelClass: (formData.get("travelClass") as string) || "economy",
      nonStopOnly: formData.get("nonstopOnly") === "on",
    };
    onDetailsSubmit(updatedContext);
  };

   

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <FlightSearchForm
        onSearch={onSearchFormSubmit}
        defaultValues={context}
      />

      <div className="flex-1 overflow-auto custom-scrollbar p-4 space-y-4">
        {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`animate-slide-in ${
            msg.who === "user" ? "flex justify-end" : ""
          }`}
        >
          <div
            className={`max-w-[100%] md:max-w-[90%] sm:max-w-[95%] rounded-lg p-2 px-3 text-sm ${
              msg.who === "user"
                ? "bg-primary text-primary-foreground ml-auto"
                : "bg-muted"
            }`}
          >
            {msg.isLoading ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <span className="ml-2">Searching...</span>
              </div>
            ) : (
              <>
                <div
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                />
              </>
            )}
          </div>
        </div>
      ))}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}
