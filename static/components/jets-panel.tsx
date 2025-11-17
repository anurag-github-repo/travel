// In static/components/jets-panel.tsx

"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Users, ArrowRight, Gauge, BaggageClaim } from "lucide-react";
import Image from "next/image";
import type { Aircraft, Route } from "@/lib/types";
import dynamic from "next/dynamic";

const AirportsMap = dynamic(() => import("@/components/airports-map"), {
  ssr: false,
});

interface JetsPanelProps {
    jets: Aircraft[];
    onJetSelect: (jet: Aircraft) => void;
    route: Route | null;
    searched: boolean;
}

export default function JetsPanel({ jets, onJetSelect, route, searched }: JetsPanelProps) {
    // State 1: No search performed yet
    if (!searched) {
        return (
            <div className="h-full w-full">
                <AirportsMap route={route} />
            </div>
        );
    }

    // State 2 & 3: Search performed - show cards or empty state
    if (jets.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-8 text-center">
                <div className="space-y-3">
                    <div className="text-5xl">🛩️</div>
                    <h3 className="text-lg font-semibold">No jets found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Try searching with different routes to see available charter options
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jets.map((jet, idx) => (
                <Card
                    key={idx}
                    className="overflow-hidden hover:shadow-lg transition-shadow animate-slide-in flex flex-col"
                    style={{ animationDelay: `${idx * 100}ms` }}
                >
                    <div className="relative h-56 w-full bg-muted">
                        {jet.gallery_images && jet.gallery_images[0] ? (
                            <Image
                                src={jet.gallery_images[0]}
                                alt={jet.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">🛩️</div>
                        )}
                    </div>

                    <div className="p-4 space-y-4 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg line-clamp-2">{jet.name}</h3>

                        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                            {jet.overview}
                        </p>

                        <div className="p-4 space-y-4 flex-1 flex flex-col">
                           

                            <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                                <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Seats: {jet.specifications.Seats}</div>
                                <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /> Speed: {jet.specifications.Speed}</div>
                                <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-primary" /> Range: {jet.specifications.Range}</div>
                                <div className="flex items-center gap-2"><BaggageClaim className="w-4 h-4 text-primary" /> Luggage: {jet.specifications["Luggage Capacity"]}</div>
                            </div>
                        </div>

                        <Button
                            className="w-full gap-2 mt-2"
                            onClick={() => onJetSelect(jet)} // <--- Call the function passed in props
                        >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    );
}