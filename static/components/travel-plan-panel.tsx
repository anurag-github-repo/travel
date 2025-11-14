"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import type { SearchResult } from "@/lib/types";

interface TravelPlanPanelProps {
  travelPlan: string;
  travelPlanImages: Record<string, string>;
  searchResults: SearchResult[];
}

export default function TravelPlanPanel({
  travelPlan,
  travelPlanImages,
  searchResults,
}: TravelPlanPanelProps) {
  const formatTravelPlan = (text: string): string => {
    let formatted = text
      .replace(/\n\n+/g, "\n\n")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /### (.*?)(\n|$)/g,
        '<h3 class="text-primary text-base font-semibold mt-5 mb-2">$1</h3>'
      )
      .replace(
        /## (.*?)(\n|$)/g,
        '<h2 class="text-primary text-lg font-semibold mt-6 mb-3">$1</h2>'
      )
      .replace(
        /# (.*?)(\n|$)/g,
        '<h1 class="text-primary text-xl font-bold mt-7 mb-4">$1</h1>'
      )
      .replace(/\n/g, "<br>");

    return formatted;
  };

  const hasContent = travelPlan || searchResults.length > 0;

  if (!hasContent) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <div className="text-5xl">🗺️</div>
          <h3 className="text-lg font-semibold">No travel plan yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ask me to create a travel plan or search for places to visit
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Travel Plan Images */}
      {Object.keys(travelPlanImages).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(travelPlanImages).map(([place, imageUrl]) => (
            <div key={place} className="space-y-2">
              <div className="relative h-48 w-full rounded-lg overflow-hidden bg-muted">
                {imageUrl && (
                  <Image
                    src={imageUrl}
                    alt={place}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                )}
              </div>
              <p className="text-sm text-center text-muted-foreground">{place}</p>
            </div>
          ))}
        </div>
      )}

      {/* Travel Plan Text */}
      {travelPlan && (
        <div
          className="prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: formatTravelPlan(travelPlan) }}
        />
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          {!travelPlan && (
            <h2 className="text-xl font-bold text-primary mb-4">
              Recommendations
            </h2>
          )}
          {searchResults.map((result, idx) => (
            <Card
              key={idx}
              className="p-4 hover:shadow-md transition-shadow animate-slide-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="space-y-2">
                <h3 className="font-semibold text-base flex items-start justify-between gap-2">
                  <span>{result.title}</span>
                  {result.link && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      asChild
                    >
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </h3>
                {result.snippet && (
                  <p className="text-sm text-muted-foreground">{result.snippet}</p>
                )}
                {result.displayed_link && (
                  <p className="text-xs text-primary">{result.displayed_link}</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
