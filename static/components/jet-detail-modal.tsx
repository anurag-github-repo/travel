// In static/components/jet-detail-modal.tsx

"use client";

import Image from "next/image";
import { X } from "lucide-react";
import type { Aircraft } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JetDetailModalProps {
  jet: Aircraft | null;
  onClose: () => void;
}

export default function JetDetailModal({ jet, onClose }: JetDetailModalProps) {
  // If no jet is selected, render nothing
  if (!jet) {
    return null;
  }

  const { name, overview, features, specifications, gallery_images } = jet;

  return (
    // The Modal Overlay
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in-0"
      onClick={onClose} // Close modal when clicking the overlay
    >
      {/* The Modal Content */}
      <div
        className="bg-card text-card-foreground rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the content
      >
        {/* Modal Header with Close Button */}
        <header className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{name}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </header>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Main Image & Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              {gallery_images?.[0] && (
                <Image
                  src={gallery_images[0]}
                  alt={`Main image of ${name}`}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <p className="text-muted-foreground">{overview}</p>
          </div>

          {/* Specifications */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">
              Specifications
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
              {Object.entries(specifications).map(([key, value]) => (
                <div key={key}>
                  <p className="text-muted-foreground">{key}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b pb-2">
              Key Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, i) => (
                <Badge key={i} variant="secondary" className="text-sm">
                  {feature}
                </Badge>
              ))}
            </div>
          </section>

          {/* Gallery */}
          {gallery_images.length > 1 && (
            <section>
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                Gallery
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {gallery_images.slice(1).map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-md overflow-hidden bg-muted">
                    <Image
                      src={img}
                      alt={`Gallery image ${i + 1} of ${name}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}