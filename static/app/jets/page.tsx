"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { jets, THEME_COLOR } from "@/lib/jets-data";

export default function JetsGalleryPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white px-6 py-12 md:px-16">
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-light text-gray-800">
          Our Fleet
        </h1>
        <p className="mt-3 text-gray-500">
          Choose the aircraft category that fits your trip. Click any card to
          view details.
        </p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
        {jets.map((jet) => (
          <div
            key={jet.id}
            onClick={() => router.push(`/jets/${jet.id}`)}
            className="cursor-pointer group flex flex-col bg-white h-[450px] rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all"
          >
            <div className="relative w-full h-56 bg-gray-100">
              <Image
                src={jet.imageUrl}
                alt={jet.title}
                fill
                className="object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            <div className="p-6 flex flex-col justify-between flex-1">
              <div>
                <h2 className="text-2xl font-light text-gray-800 mb-3 truncate">
                  {jet.title}
                </h2>
                <p className="text-gray-500 leading-relaxed mb-6 line-clamp-3">
                  {jet.copy}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 truncate">
                  See all {jet.count} {jet.title.toUpperCase()}
                </span>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-white"
                  >
                    <path
                      d="M8 5l8 7-8 7"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
