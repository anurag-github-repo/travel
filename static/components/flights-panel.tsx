"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Flight, Context, Route } from "@/lib/types";
import { formatPrice, parseTime } from "@/lib/helpers";
import Link from "next/link";
import dynamic from "next/dynamic";

const AirportsMap = dynamic(() => import("@/components/airports-map"), {
  ssr: false,
});

interface FlightsPanelProps {
  flights: Flight[];
  context: Context;
  route: Route | null;
  searched: boolean;
}

export default function FlightsPanel({
  flights,
  context,
  route,
  searched,
}: FlightsPanelProps) {
  // State 1: No search performed yet
  if (!searched) {
    return (
      <div className="h-full w-full">
        <AirportsMap route={route} />
      </div>
    );
  }

  // State 2 & 3: Search performed - show cards or empty state
  if (flights.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <div className="text-5xl">✈️</div>
          <h3 className="text-lg font-semibold">No flights found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Try searching with different dates or destinations
          </p>
        </div>
      </div>
    );
  }

  const displayDate = context.departDate
    ? new Date(context.departDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });

  return (
    <div className="p-4 space-y-4">
      {context.origin && context.destination && (
        <div className="mb-6">
          <h2 className="text-xl font-bold">
            {context.origin} to {context.destination}
          </h2>
          <p className="text-sm text-muted-foreground">
            {displayDate} • {context.passengers}{" "}
            {context.passengers === 1 ? "traveller" : "travellers"}
          </p>
        </div>
      )}

      {flights.map((flight, idx) => {
        const depParsed = parseTime(flight.departure_time);
        const arrParsed = parseTime(flight.arrival_time);

        const bookingLinks = [
          flight.booking_link && { name: "Google", url: flight.booking_link },
          flight.kayak_link && { name: "Kayak", url: flight.kayak_link },
          flight.skyscanner_link && {
            name: "Skyscanner",
            url: flight.skyscanner_link,
          },
          flight.expedia_link && { name: "Expedia", url: flight.expedia_link },
          flight.booking_com_link && {
            name: "Booking.com",
            url: flight.booking_com_link,
          },
          flight.momondo_link && { name: "Momondo", url: flight.momondo_link },
        ].filter(Boolean) as { name: string; url: string }[];

        return (
          <Card
            key={idx}
            className="p-3 md:p-6 hover:shadow-md transition-shadow animate-slide-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="flex flex-col md:flex-row gap-3 md:gap-6">
              {/* Airline Logo */}
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {flight.airline_logo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={flight.airline_logo}
                      alt={flight.airline}
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        target.parentElement!.textContent = (flight.airline ||
                          "A")[0].toUpperCase();
                        target.parentElement!.classList.add(
                          "bg-primary",
                          "text-primary-foreground",
                          "font-semibold",
                          "text-xl"
                        );
                      }}
                    />
                  </>
                ) : (
                  <span className="text-xl font-semibold">
                    {(flight.airline || "A")[0].toUpperCase()}
                  </span>
                )}
              </div>

              {/* Flight Info */}
              <div className="flex-1 space-y-2 md:space-y-4">
                {/* Duration and Date */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm md:text-base font-semibold">
                      {flight.duration || "N/A"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {displayDate}
                    </div>
                  </div>
                </div>

                {/* Times and Route */}
                <div className="flex items-center gap-2 md:gap-4">
                  {/* Departure */}
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold">
                      {depParsed.time}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {depParsed.code}
                    </div>
                  </div>

                  {/* Route Line */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-full h-0.5 bg-border relative">
                      <div className="absolute inset-0 bg-primary/20" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {flight.stops === "Nonstop"
                        ? "Nonstop"
                        : flight.stops || "1+ stops"}
                    </div>
                  </div>

                  {/* Arrival */}
                  <div className="text-center">
                    <div className="text-lg md:text-xl font-bold">
                      {arrParsed.time}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {arrParsed.code}
                    </div>
                  </div>
                </div>

                {/* Price and Airline */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <div>
                    <div className="text-lg md:text-xl font-bold text-primary">
                      {formatPrice(flight.price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {flight.airline}
                    </div>
                  </div>

                  {/* Booking Links */}
                  <div className="flex flex-wrap gap-1.5 md:gap-2 justify-start md:justify-end w-full md:w-auto">
                    {bookingLinks.map((link) => (
                      <Button
                        key={link.name}
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-1 text-xs h-8 px-2 md:px-3"
                      >
                        <Link
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1"
                        >
                          {link.name}
                          <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
