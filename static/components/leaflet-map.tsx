"use client";

import { useEffect, useRef, useState } from "react";
import type { Route } from "@/lib/types";
import { haversineKm, easeInOutCubic } from "@/lib/helpers";

interface LeafletMapProps {
  route: Route | null;
}

export default function LeafletMap({ route }: LeafletMapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const planeMarkerRef = useRef<any>(null);
  const planeTimerRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string>("");

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    let isMounted = true;

    const initMap = async () => {
      try {
        // Dynamically import Leaflet
        const L = (await import("leaflet")).default;

        if (!mapContainerRef.current || !isMounted) return;

        // Clear existing map if any
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        // Clear container
        mapContainerRef.current.innerHTML = "";

        console.log("Initializing Leaflet map...");

        // Initialize map with explicit options
        const map = L.map(mapContainerRef.current, {
          center: [20.0, 78.0],
          zoom: 4,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true,
        });

        mapRef.current = map;

        // Add tile layer with error handling
        const tileLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            minZoom: 2,
          }
        );

        tileLayer.on("tileloadstart", () => {
          console.log("Tiles loading...");
        });

        tileLayer.on("load", () => {
          console.log("Tiles loaded successfully!");
        });

        tileLayer.on("tileerror", (error) => {
          console.error("Tile load error:", error);
        });

        tileLayer.addTo(map);

        // Invalidate size after short delay to ensure proper rendering
        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize();
            console.log("Map size invalidated");
          }
        }, 100);

        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize();
          }
        }, 500);

        setMapError("");
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError("Failed to initialize map");
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (planeTimerRef.current) {
        clearInterval(planeTimerRef.current);
        planeTimerRef.current = null;
      }
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log("Route effect triggered. Route:", route);
    console.log("Map ref exists:", !!mapRef.current);

    if (!route || !mapRef.current) {
      console.log("Skipping route render - no route or map");
      return;
    }

    const renderRoute = async () => {
      try {
        const L = (await import("leaflet")).default;
        const map = mapRef.current;

        const from = route.from;
        const to = route.to;

        console.log("Route from:", from);
        console.log("Route to:", to);

        if (
          !from ||
          !to ||
          from.lat == null ||
          from.lon == null ||
          to.lat == null ||
          to.lon == null
        ) {
          console.error("Invalid route coordinates:", { from, to });
          return;
        }

        console.log("Rendering route:", from.city, "to", to.city);

        // Clear existing markers and routes
        markersRef.current.forEach((m) => {
          try {
            m.remove();
          } catch (e) {
            console.error("Error removing marker:", e);
          }
        });
        markersRef.current = [];

        if (routeLineRef.current) {
          try {
            routeLineRef.current.remove();
          } catch (e) {
            console.error("Error removing route line:", e);
          }
          routeLineRef.current = null;
        }

        if (planeMarkerRef.current) {
          try {
            planeMarkerRef.current.remove();
          } catch (e) {
            console.error("Error removing plane marker:", e);
          }
          planeMarkerRef.current = null;
        }

        if (planeTimerRef.current) {
          clearInterval(planeTimerRef.current);
          planeTimerRef.current = null;
        }

        // Add origin marker
        const originMarker = L.marker([from.lat, from.lon], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="width:16px;height:16px;background:#01B783;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(map)
          .bindPopup(from.city || "Origin");
        markersRef.current.push(originMarker);

        // Add destination marker
        const destMarker = L.marker([to.lat, to.lon], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="width:16px;height:16px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(map)
          .bindPopup(to.city || "Destination");
        markersRef.current.push(destMarker);

        // Add route polyline
        routeLineRef.current = L.polyline(
          [
            [from.lat, from.lon],
            [to.lat, to.lon],
          ],
          {
            color: "#8b5cf6",
            weight: 3,
            opacity: 0.8,
            dashArray: "10, 10",
          }
        ).addTo(map);

        // Fit map to show both points
        const bounds = L.latLngBounds([
          [from.lat, from.lon],
          [to.lat, to.lon],
        ]);

        const distanceKm = haversineKm(from.lat, from.lon, to.lat, to.lon);

        let maxZoom = 10;
        if (distanceKm > 2000) {
          maxZoom = 6;
        } else if (distanceKm > 1000) {
          maxZoom = 8;
        } else if (distanceKm > 500) {
          maxZoom = 9;
        } else if (distanceKm < 50) {
          maxZoom = 12;
        }

        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: maxZoom,
        });

        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: maxZoom,
          });
        }, 200);

        // Animate plane
        animatePlane(L, map, [from.lat, from.lon], [to.lat, to.lon]);
      } catch (error) {
        console.error("Error rendering route:", error);
      }
    };

    renderRoute();
  }, [route]);

  const animatePlane = (
    L: any,
    map: any,
    start: [number, number],
    end: [number, number]
  ) => {
    const planeIcon = L.divIcon({
      className: "plane-icon",
      html: '<div class="plane" style="font-size: 24px; transform: rotate(0deg);">✈️</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    planeMarkerRef.current = L.marker(start, { icon: planeIcon }).addTo(map);

    const lat1 = start[0],
      lon1 = start[1];
    const lat2 = end[0],
      lon2 = end[1];

    const distanceKm = haversineKm(lat1, lon1, lat2, lon2);
    const duration = Math.min(20, Math.max(8, 8 + 0.5 * (distanceKm / 1000)));
    const fps = 60;
    const totalSteps = Math.floor(duration * fps);
    let step = 0;

    if (planeTimerRef.current) {
      clearInterval(planeTimerRef.current);
    }

    planeTimerRef.current = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / totalSteps);
      const eased = easeInOutCubic(t);
      const lat = lat1 + (lat2 - lat1) * eased;
      const lon = lon1 + (lon2 - lon1) * eased;
      planeMarkerRef.current.setLatLng([lat, lon]);

      // Calculate bearing
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const lat1Rad = (lat1 * Math.PI) / 180;
      const lat2Rad = (lat2 * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      const bearing = (Math.atan2(y, x) * 180) / Math.PI;

      // Update plane rotation
      const el = planeMarkerRef.current.getElement();
      if (el) {
        const inner = el.querySelector(".plane");
        if (inner) {
          inner.style.transform = `rotate(${bearing}deg)`;
        }
      }

      if (t >= 1) {
        step = 0; // Loop animation
      }
    }, 1000 / fps);
  };

  if (mapError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-destructive mb-2">Map Error</p>
          <p className="text-sm text-muted-foreground">{mapError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full bg-muted"
      style={{ minHeight: "400px" }}
    />
  );
}
