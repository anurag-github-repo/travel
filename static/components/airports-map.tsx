"use client";

import { useEffect, useRef, useState } from "react";
import { airports } from "@/lib/airports-data";
import type { Route } from "@/lib/types";
import { haversineKm, easeInOutCubic } from "@/lib/helpers";

interface AirportsMapProps {
  route?: Route | null;
}

export default function AirportsMap({ route }: AirportsMapProps) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const routeMarkersRef = useRef<any[]>([]); // Separate ref for route markers
  const routeLineRef = useRef<any>(null);
  const planeMarkerRef = useRef<any>(null);
  const planeTimerRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string>("");
  const [mapReady, setMapReady] = useState(false);

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

        console.log("Initializing Airports Map...");

        // Initialize map with world view
        const map = L.map(mapContainerRef.current, {
          center: [20.0, 0.0], // Center of world
          zoom: 2,
          zoomControl: true,
          attributionControl: true,
          preferCanvas: true,
        });

        mapRef.current = map;

        // Add tile layer
        const tileLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            minZoom: 2,
          }
        );

        tileLayer.addTo(map);

        // Invalidate size after short delay
        setTimeout(() => {
          if (map && isMounted) {
            map.invalidateSize();
          }
        }, 100);

        // Add airport markers
        addAirportMarkers(L, map);

        setMapError("");
        setMapReady(true);
        console.log("✅ Map initialization complete");
      } catch (error) {
        console.error("Error initializing map:", error);
        setMapError("Failed to initialize map");
      }
    };

    const addAirportMarkers = (L: any, map: any) => {
      // Clear existing markers
      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch (e) {
          console.error("Error removing marker:", e);
        }
      });
      markersRef.current = [];

      // Airport coordinates (comprehensive list)
      const airportCoordinates: Record<string, { lat: number; lon: number }> = {
        // United States
        ATL: { lat: 33.6407, lon: -84.4277 },
        LAX: { lat: 33.9416, lon: -118.4085 },
        ORD: { lat: 41.9742, lon: -87.9073 },
        DFW: { lat: 32.8998, lon: -97.0403 },
        DEN: { lat: 39.8561, lon: -104.6737 },
        JFK: { lat: 40.6413, lon: -73.7781 },
        SFO: { lat: 37.6213, lon: -122.3790 },
        SEA: { lat: 47.4502, lon: -122.3088 },
        LAS: { lat: 36.0840, lon: -115.1537 },
        MCO: { lat: 28.4312, lon: -81.3081 },
        EWR: { lat: 40.6895, lon: -74.1745 },
        MIA: { lat: 25.7959, lon: -80.2870 },
        PHX: { lat: 33.4352, lon: -112.0101 },
        IAH: { lat: 29.9902, lon: -95.3368 },
        BOS: { lat: 42.3656, lon: -71.0096 },
        MSP: { lat: 44.8848, lon: -93.2223 },
        DTW: { lat: 42.2124, lon: -83.3534 },
        PHL: { lat: 39.8729, lon: -75.2437 },
        LGA: { lat: 40.7769, lon: -73.8740 },
        FLL: { lat: 26.0742, lon: -80.1506 },
        BWI: { lat: 39.1774, lon: -76.6684 },
        DCA: { lat: 38.8521, lon: -77.0377 },
        IAD: { lat: 38.9531, lon: -77.4565 },
        SAN: { lat: 32.7338, lon: -117.1933 },
        TPA: { lat: 27.9755, lon: -82.5332 },
        PDX: { lat: 45.5887, lon: -122.5975 },
        STL: { lat: 38.7487, lon: -90.3700 },
        HNL: { lat: 21.3187, lon: -157.9225 },
        AUS: { lat: 30.1945, lon: -97.6699 },
        MSY: { lat: 29.9934, lon: -90.2580 },
        SLC: { lat: 40.7899, lon: -111.9791 },
        CLT: { lat: 35.2144, lon: -80.9473 },

        // United Kingdom
        LHR: { lat: 51.4700, lon: -0.4543 },
        LGW: { lat: 51.1537, lon: -0.1821 },
        MAN: { lat: 53.3587, lon: -2.2730 },
        EDI: { lat: 55.9500, lon: -3.3725 },
        BHX: { lat: 52.4539, lon: -1.7480 },
        GLA: { lat: 55.8719, lon: -4.4331 },
        LTN: { lat: 51.8747, lon: -0.3683 },
        STN: { lat: 51.8850, lon: 0.2350 },
        LCY: { lat: 51.5048, lon: 0.0495 },

        // India
        DEL: { lat: 28.5562, lon: 77.1000 },
        BOM: { lat: 19.0896, lon: 72.8656 },
        BLR: { lat: 13.1979, lon: 77.7063 },
        HYD: { lat: 17.2403, lon: 78.4294 },
        MAA: { lat: 12.9941, lon: 80.1709 },
        CCU: { lat: 22.6547, lon: 88.4467 },
        COK: { lat: 10.1520, lon: 76.3919 },
        GOI: { lat: 15.3808, lon: 73.8314 },
        PNQ: { lat: 18.5821, lon: 73.9197 },
        AMD: { lat: 23.0772, lon: 72.6347 },
        JAI: { lat: 26.8242, lon: 75.8122 },
        IXC: { lat: 30.6735, lon: 76.7885 },
        LKO: { lat: 26.7606, lon: 80.8893 },
        TRV: { lat: 8.4821, lon: 76.9200 },
        GAU: { lat: 26.1061, lon: 91.5859 },
        IXB: { lat: 26.6812, lon: 88.3286 },
        NAG: { lat: 21.0922, lon: 79.0472 },
        VNS: { lat: 25.4524, lon: 82.8593 },
        SXR: { lat: 33.9871, lon: 74.7742 },

        // Europe
        CDG: { lat: 49.0097, lon: 2.5479 },
        ORY: { lat: 48.7234, lon: 2.3794 },
        FRA: { lat: 50.0379, lon: 8.5622 },
        MUC: { lat: 48.3538, lon: 11.7861 },
        AMS: { lat: 52.3105, lon: 4.7683 },
        MAD: { lat: 40.4839, lon: -3.5680 },
        BCN: { lat: 41.2974, lon: 2.0833 },
        FCO: { lat: 41.8003, lon: 12.2389 },
        MXP: { lat: 45.6301, lon: 8.7231 },
        IST: { lat: 41.2753, lon: 28.7519 },
        SAW: { lat: 40.8986, lon: 29.3092 },
        ZRH: { lat: 47.4582, lon: 8.5554 },
        VIE: { lat: 48.1103, lon: 16.5697 },
        CPH: { lat: 55.6181, lon: 12.6508 },
        ARN: { lat: 59.6519, lon: 17.9186 },
        OSL: { lat: 60.1939, lon: 11.1004 },
        HEL: { lat: 60.3172, lon: 24.9633 },
        DUB: { lat: 53.4213, lon: -6.2701 },
        LIS: { lat: 38.7742, lon: -9.1342 },
        ATH: { lat: 37.9364, lon: 23.9445 },
        PRG: { lat: 50.1008, lon: 14.2600 },
        WAW: { lat: 52.1657, lon: 20.9671 },
        BUD: { lat: 47.4298, lon: 19.2611 },
        BRU: { lat: 50.9014, lon: 4.4844 },

        // Middle East
        DXB: { lat: 25.2532, lon: 55.3657 },
        AUH: { lat: 24.4330, lon: 54.6511 },
        DOH: { lat: 25.2731, lon: 51.6080 },
        RUH: { lat: 24.9577, lon: 46.6988 },
        JED: { lat: 21.6796, lon: 39.1564 },
        TLV: { lat: 32.0114, lon: 34.8867 },
        CAI: { lat: 30.1219, lon: 31.4056 },
        AMM: { lat: 31.7226, lon: 35.9932 },
        KWI: { lat: 29.2267, lon: 47.9689 },
        BAH: { lat: 26.2708, lon: 50.6336 },
        MCT: { lat: 23.5933, lon: 58.2844 },

        // Asia Pacific
        HKG: { lat: 22.3080, lon: 113.9185 },
        SIN: { lat: 1.3644, lon: 103.9915 },
        ICN: { lat: 37.4602, lon: 126.4407 },
        NRT: { lat: 35.7653, lon: 140.3860 },
        HND: { lat: 35.5494, lon: 139.7798 },
        KIX: { lat: 34.4273, lon: 135.2440 },
        PEK: { lat: 40.0799, lon: 116.6031 },
        PVG: { lat: 31.1443, lon: 121.8083 },
        CAN: { lat: 23.3924, lon: 113.2988 },
        SZX: { lat: 22.6393, lon: 113.8107 },
        CTU: { lat: 30.5785, lon: 103.9470 },
        BKK: { lat: 13.6900, lon: 100.7501 },
        DMK: { lat: 13.9126, lon: 100.6069 },
        KUL: { lat: 2.7456, lon: 101.7072 },
        CGK: { lat: -6.1256, lon: 106.6559 },
        DPS: { lat: -8.7482, lon: 115.1671 },
        MNL: { lat: 14.5086, lon: 121.0194 },
        SYD: { lat: -33.9399, lon: 151.1753 },
        MEL: { lat: -37.6690, lon: 144.8410 },
        BNE: { lat: -27.3842, lon: 153.1175 },
        PER: { lat: -31.9403, lon: 115.9672 },
        AKL: { lat: -37.0082, lon: 174.7850 },
        TPE: { lat: 25.0777, lon: 121.2328 },
        HAN: { lat: 21.2212, lon: 105.8072 },
        SGN: { lat: 10.8188, lon: 106.6519 },
        RGN: { lat: 16.9073, lon: 96.1333 },
        CMB: { lat: 7.1808, lon: 79.8841 },
        KTM: { lat: 27.6966, lon: 85.3591 },
        DAC: { lat: 23.8433, lon: 90.3978 },
        ISB: { lat: 33.5651, lon: 73.0946 },
        LHE: { lat: 31.5214, lon: 74.4036 },
        KHI: { lat: 24.9065, lon: 67.1608 },

        // Africa
        JNB: { lat: -26.1367, lon: 28.2411 },
        CPT: { lat: -33.9715, lon: 18.6021 },
        LOS: { lat: 6.5774, lon: 3.3212 },
        ADD: { lat: 8.9779, lon: 38.7992 },
        NBO: { lat: -1.3192, lon: 36.9278 },
        ALG: { lat: 36.6910, lon: 3.2154 },
        CMN: { lat: 33.3675, lon: -7.5898 },
        TUN: { lat: 36.8510, lon: 10.2272 },
        ACC: { lat: 5.6052, lon: -0.1669 },
        DAR: { lat: -6.8781, lon: 39.2026 },

        // South America
        GRU: { lat: -23.4356, lon: -46.4731 },
        GIG: { lat: -22.8099, lon: -43.2505 },
        BSB: { lat: -15.8697, lon: -47.9208 },
        EZE: { lat: -34.8222, lon: -58.5358 },
        SCL: { lat: -33.3930, lon: -70.7858 },
        LIM: { lat: -12.0219, lon: -77.1143 },
        BOG: { lat: 4.7016, lon: -74.1469 },
        UIO: { lat: -0.1292, lon: -78.3575 },
        CCS: { lat: 10.6013, lon: -66.9911 },
        PTY: { lat: 9.0714, lon: -79.3834 },

        // Canada
        YYZ: { lat: 43.6777, lon: -79.6248 },
        YVR: { lat: 49.1967, lon: -123.1815 },
        YUL: { lat: 45.4657, lon: -73.7455 },
        YYC: { lat: 51.1315, lon: -114.0106 },
        YEG: { lat: 53.3097, lon: -113.5800 },
        YOW: { lat: 45.3225, lon: -75.6692 },

        // Mexico & Central America
        MEX: { lat: 19.4363, lon: -99.0721 },
        CUN: { lat: 21.0365, lon: -86.8771 },
        GDL: { lat: 20.5218, lon: -103.3106 },
        MTY: { lat: 25.7785, lon: -100.1074 },
        SJO: { lat: 9.9939, lon: -84.2088 },
        SAL: { lat: 13.4409, lon: -89.0556 },

        // Caribbean
        SJU: { lat: 18.4394, lon: -66.0018 },
        MBJ: { lat: 18.5037, lon: -77.9134 },
        NAS: { lat: 25.0390, lon: -77.4662 },
        PUJ: { lat: 18.5674, lon: -68.3634 },
        HAV: { lat: 22.9892, lon: -82.4091 },
      };

      // Add markers for airports with known coordinates
      airports.forEach((airport) => {
        const coords = airportCoordinates[airport.code];
        if (coords) {
          const marker = L.marker([coords.lat, coords.lon], {
            icon: L.divIcon({
              className: "airport-marker",
              html: `<div style="font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); pointer-events: auto;">✈️</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            }),
            zIndexOffset: 10,
          })
            .addTo(map)
            .bindPopup(`
              <div style="min-width: 150px;">
                <strong>${airport.code}</strong><br/>
                ${airport.city}, ${airport.country}<br/>
                <small>${airport.name}</small>
              </div>
            `);

          markersRef.current.push(marker);
        }
      });
    };

    initMap();

    return () => {
      isMounted = false;
      setMapReady(false);
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

  // Effect to handle route display
  useEffect(() => {
    console.log("=== Route Effect Triggered ===");
    console.log("Route:", route);
    console.log("Map exists:", !!mapRef.current);
    console.log("Map ready:", mapReady);

    if (!route || !mapRef.current || !mapReady) {
      console.log("Skipping route render - route:", !!route, "map:", !!mapRef.current, "ready:", mapReady);
      return;
    }

    console.log("Route data:", JSON.stringify(route, null, 2));

    const renderRoute = async () => {
      try {
        const L = (await import("leaflet")).default;
        const map = mapRef.current;

        const from = route.from;
        const to = route.to;

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

        console.log("✅ Rendering route:", from.city, "to", to.city);
        console.log("From coords:", from.lat, from.lon);
        console.log("To coords:", to.lat, to.lon);

        // Clear existing route markers
        routeMarkersRef.current.forEach((m) => {
          try {
            m.remove();
          } catch (e) {
            console.error("Error removing route marker:", e);
          }
        });
        routeMarkersRef.current = [];

        // Clear existing route line and plane
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

        // Add origin marker (green)
        const originMarker = L.marker([from.lat, from.lon], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="width:24px;height:24px;background:#01B783;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup(`<strong>${from.city}</strong><br/>Origin`);
        routeMarkersRef.current.push(originMarker);

        // Add destination marker (red)
        const destMarker = L.marker([to.lat, to.lon], {
          icon: L.divIcon({
            className: "custom-marker",
            html: '<div style="width:24px;height:24px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindPopup(`<strong>${to.city}</strong><br/>Destination`);
        routeMarkersRef.current.push(destMarker);

        // Add route polyline (dashed purple line)
        console.log("📍 Adding route line from", [from.lat, from.lon], "to", [to.lat, to.lon]);
        routeLineRef.current = L.polyline(
          [
            [from.lat, from.lon],
            [to.lat, to.lon],
          ],
          {
            color: "#8b5cf6",
            weight: 5,
            opacity: 1,
            dashArray: "15, 10",
            lineJoin: "round",
            lineCap: "round",
          }
        ).addTo(map);
        console.log("✅ Route line added successfully:", routeLineRef.current);

        // Fit map to show both points with padding
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
          padding: [80, 80],
          maxZoom: maxZoom,
        });

        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds, {
            padding: [80, 80],
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
  }, [route, mapReady]);


  const animatePlane = (
    L: any,
    map: any,
    start: [number, number],
    end: [number, number]
  ) => {
    const planeIcon = L.divIcon({
      className: "plane-icon",
      html: '<div class="plane" style="font-size: 28px; transform: rotate(0deg); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">✈️</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (planeMarkerRef.current) {
      planeMarkerRef.current.remove();
    }
    planeMarkerRef.current = L.marker(start, {
      icon: planeIcon,
      zIndexOffset: 2000,
    }).addTo(map);

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
