"use client";

import { useParams } from "next/navigation";
import Image from "next/image";

export default function AircraftPage() {
  const { aircraft } = useParams();

  return (
    <div className="min-h-screen bg-white px-4 py-8 flex justify-center">
      <div className="w-full max-w-6xl">
        {/* HEADER */}
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-light text-gray-800 capitalize">
            {aircraft?.toString().replace(/-/g, " ")}
          </h1>
          <p className="mt-3 text-gray-500 text-sm leading-relaxed">
            The Piaggio P180 Avanti, by Italian manufacturer Piaggio Aero
            Company, is a light and stylish turboprop. The upgraded Avanti EVO
            variant can fly at 400 knots, at more than 40,000 feet, and has a
            1,500 nm range.
          </p>
        </header>

        {/* MAIN IMAGE (no video anymore) */}
        <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden mb-8 shadow-md">
          <Image
            src="https://images.prismic.io/privatefly/e936c1ae-8a61-4c3d-8337-765429af714b_Turboprops%402x.jpg?auto=compress,format"
            alt="Piaggio P180 Avanti"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* COMFORT & SIZE */}
        <section className="mb-8">
          <h2 className="text-xl font-light text-gray-800 mb-3">
            Comfort & Size
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            The spacious cabin seats seven passengers. There is baggage space
            for up to six small suitcases or 2–3 golf bags. True to Italian
            form, it is extremely stylish, with custom silk carpets and soft
            leather finishes. Plenty of natural light streams in through the
            windows and subtle LED lighting enhances the elegant interior.
          </p>
        </section>

        {/* SPECIFICATIONS */}
        <section className="mb-8">
          <h2 className="text-xl font-light text-gray-800 mb-4">
            Specification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 bg-gray-50 p-5 rounded-lg text-sm text-gray-700">
            <div>
              <p className="text-gray-400 uppercase text-xs">Manufacturer</p>
              <p>Piaggio</p>
              <p className="mt-3 text-gray-400 uppercase text-xs">Seats</p>
              <p>6</p>
              <p className="mt-3 text-gray-400 uppercase text-xs">
                Luggage Capacity
              </p>
              <p>35 cu.ft.</p>
            </div>

            <div>
              <p className="text-gray-400 uppercase text-xs">Model</p>
              <p>Piaggio P180 Avanti</p>
              <p className="mt-3 text-gray-400 uppercase text-xs">Speed</p>
              <p>285 kts</p>
              <p className="mt-3 text-gray-400 uppercase text-xs">
                Interior Height
              </p>
              <p>1.75 m</p>
            </div>

            <div>
              <p className="text-gray-400 uppercase text-xs">Classification</p>
              <p>Turboprop</p>
              <p className="mt-3 text-gray-400 uppercase text-xs">Range</p>
              <p>1500 nm</p>
              <p className="mt-3 text-gray-400 uppercase text-xs">
                Interior Width
              </p>
              <p>1.85 m</p>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section>
          <h2 className="text-xl font-light text-gray-800 mb-4">Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] rounded-md overflow-hidden bg-gray-100 shadow-sm"
              >
                <Image
                  src="https://images.prismic.io/privatefly/e936c1ae-8a61-4c3d-8337-765429af714b_Turboprops%402x.jpg?auto=compress,format"
                  alt="Aircraft gallery"
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
