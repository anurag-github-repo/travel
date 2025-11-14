"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { jets, THEME_COLOR } from "@/lib/jets-data";

const aircraftByCategory = {
  turboprop: [
    { name: "Piaggio P180 Avanti", pax: 6, speed: "285 kts", range: "1500 nm" },
    {
      name: "Cessna C425 Corsair / Conquest I",
      pax: 7,
      speed: "240 kts",
      range: "1300 nm",
    },
    {
      name: "Cessna C421C Golden Eagle",
      pax: 8,
      speed: "205 kts",
      range: "1100 nm",
    },
    { name: "Diamond Twin Star", pax: 3, speed: "132 kts", range: "1129 nm" },
    { name: "Piaggio P180 Avanti", pax: 6, speed: "285 kts", range: "1500 nm" },
    {
      name: "Cessna C425 Corsair / Conquest I",
      pax: 7,
      speed: "240 kts",
      range: "1300 nm",
    },
    {
      name: "Cessna C421C Golden Eagle",
      pax: 8,
      speed: "205 kts",
      range: "1100 nm",
    },
    { name: "Diamond Twin Star", pax: 3, speed: "132 kts", range: "1129 nm" },
  ],
};

export default function CategoryPage() {
  const { slug } = useParams();
  const router = useRouter();
  const activeJets =
    aircraftByCategory[slug as keyof typeof aircraftByCategory] || [];

  return (
    <div className="min-h-screen bg-white px-6 py-12 md:px-16">
      {/* Tabs */}
      <nav className="max-w-6xl mx-auto mb-10 flex flex-wrap gap-3 border-b border-gray-200 pb-2">
        <button
          onClick={() => router.push("/jets")}
          className={`px-4 py-2 text-sm font-medium rounded ${
            !slug
              ? "bg-gray-100 text-gray-800"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          ALL
        </button>
        {jets.map((jet) => (
          <button
            key={jet.id}
            onClick={() => router.push(`/jets/${jet.id}`)}
            className={`px-4 py-2 text-sm font-medium rounded ${
              slug === jet.id
                ? "bg-gray-100 text-gray-800"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {jet.title.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl font-light text-gray-800 capitalize">{slug}</h1>
        <p className="mt-4 text-gray-500 max-w-3xl">
          Propeller Aircraft are the most economical choice for short to
          mid-range trips. While operating in and out of regional airports with
          short runways, propeller aircraft can cruise at speeds of 300 knots
          and non-stop ranges of about 1,500 miles.
        </p>
      </header>

      {/* Grid of aircraft */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {activeJets.map((a) => (
          <div
            key={a.name}
            onClick={() =>
              router.push(
                `/jets/${slug}/${a.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")}`
              )
            }
            className="cursor-pointer group rounded-lg shadow-sm hover:shadow-lg overflow-hidden bg-white transition"
          >
            <div className="relative h-40 bg-gray-100">
              <Image
                src={
                  jets.find((j) => j.id === slug)?.imageUrl ||
                  "https://images.prismic.io/privatefly/e936c1ae-8a61-4c3d-8337-765429af714b_Turboprops%402x.jpg?auto=compress,format"
                }
                alt={a.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-light text-gray-800">{a.name}</h3>
              <ul className="text-sm text-gray-600 space-y-1 mt-2">
                <li>👥 {a.pax} passengers</li>
                <li>✈️ Speed: {a.speed}</li>
                <li>🌍 Range: {a.range}</li>
              </ul>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
