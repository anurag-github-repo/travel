"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star } from "lucide-react";
import Image from "next/image";
import type { Hotel } from "@/lib/types";
import { formatPrice } from "@/lib/helpers";

interface HotelsPanelProps {
  hotels: Hotel[];
}

export default function HotelsPanel({ hotels }: HotelsPanelProps) {
  if (hotels.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <div className="text-5xl">🏨</div>
          <h3 className="text-lg font-semibold">No hotels yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ask me about hotels and I&apos;ll find the best accommodations for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hotels.map((hotel, idx) => (
        <Card
          key={idx}
          className="overflow-hidden hover:shadow-lg transition-shadow animate-slide-in"
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="relative h-48 w-full bg-muted">
            {hotel.image_url && !hotel.image_url.includes("placeholder") ? (
              <Image
                src={hotel.image_url}
                alt={hotel.name || "Hotel"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                🏨
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            <h3 className="font-semibold text-base line-clamp-2">{hotel.name}</h3>

            {hotel.location_text && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {hotel.location_text}
              </p>
            )}

            {hotel.rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.floor(hotel.rating) }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm ml-1">{hotel.rating}/5</span>
              </div>
            )}

            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary">
                {formatPrice(hotel.price_per_night)}
              </span>
              <span className="text-xs text-muted-foreground">/ night</span>
            </div>

            {hotel.link && (
              <Button asChild className="w-full gap-2">
                <a href={hotel.link} target="_blank" rel="noopener noreferrer">
                  View Details
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
