# Naveo AI - Travel Assistant

A modern AI-powered travel assistant built with Next.js, Tailwind CSS, and shadcn UI. This application helps users search for flights, hotels, and plan travel itineraries through a conversational interface.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn UI
- **Maps**: Leaflet.js
- **State Management**: React Hooks & Context
- **Theme**: next-themes (Dark/Light mode)

## Features

- 🤖 **AI-Powered Chat**: Natural language conversation for travel planning
- ✈️ **Flight Search**: Find and compare flights from multiple booking providers
- 🏨 **Hotel Search**: Discover accommodations with ratings and pricing
- 🗺️ **Interactive Maps**: Visualize travel routes with animated flight paths
- 🎙️ **Voice Integration**: Voice input and text-to-speech output
- 🌓 **Dark Mode**: Toggle between light and dark themes
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- 🔄 **Split-Panel Layout**: Simultaneous chat and results viewing on desktop
- 📊 **Travel Plans**: AI-generated itineraries with place recommendations

## Getting Started

### Prerequisites

- Node.js 18+ or higher
- npm or yarn package manager

### Installation

1. **Install dependencies**:
```bash
yarn install
# or
npm install
```

2. **Run the development server**:
```bash
yarn dev
# or
npm run dev
```

3. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
yarn build
yarn start
```

## Project Structure

```
travel/
├── app/
│   ├── globals.css       # Global styles and Tailwind configuration
│   ├── layout.tsx         # Root layout with theme provider
│   └── page.tsx           # Main page component
├── components/
│   ├── ui/                # shadcn UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   └── select.tsx
│   ├── travel-assistant.tsx   # Main container component
│   ├── chat-panel.tsx         # Chat interface
│   ├── flights-panel.tsx      # Flights results
│   ├── hotels-panel.tsx       # Hotels results
│   ├── travel-plan-panel.tsx  # Travel plans and search results
│   ├── leaflet-map.tsx        # Interactive map with route visualization
│   └── theme-provider.tsx     # Theme management
├── lib/
│   ├── types.ts           # TypeScript interfaces
│   ├── helpers.ts         # Utility functions
│   └── utils.ts           # Tailwind merge utility
├── public/
│   └── logo.png           # App logo
└── Original files preserved:
    ├── index.html (original)
    ├── app.js (original)
    └── styles.css (original)
```

## Key Components

### TravelAssistant
Main container component managing:
- Message state
- Flight, hotel, and travel plan data
- Voice input/output
- API communication
- Tab navigation
- Mobile/desktop layouts

### ChatPanel
Handles:
- Message display
- Flight details form
- User input
- Voice recording indicator
- Inline flight tables

### FlightsPanel, HotelsPanel, TravelPlanPanel
Display formatted results with:
- Card-based layouts
- Booking links
- Interactive elements
- Responsive grids

### LeafletMap
Provides:
- Interactive route visualization
- Animated flight paths
- Custom markers
- Dynamic zoom levels

## Features Breakdown

### AI Chat
- Context-aware conversations
- Automatic information extraction
- Dynamic form population
- Multi-turn dialogue support

### Flight Search
- Multiple booking provider links (Google, Kayak, Skyscanner, Expedia, Booking.com, Momondo)
- Detailed flight information
- Price comparison
- Inline and panel views

### Voice Features
- Speech recognition for input
- Text-to-speech for responses
- Toggle controls
- LocalStorage persistence

### Dark Mode
- System preference detection
- Manual toggle
- Persistent across sessions
- Smooth transitions

### Responsive Design
- Desktop: Split-panel layout
- Mobile: Tabbed navigation
- Adaptive components
- Touch-optimized

## API Integration

The app communicates with a backend API at:
```
https://x8f5h1m2-8000.inc1.devtunnels.ms/
```

API endpoints handle:
- Flight searches
- Hotel recommendations
- Travel plan generation
- Web searches
- Route information

## Customization

### Styling
- Edit `app/globals.css` for global styles
- Modify Tailwind theme in `tailwind.config.ts`
- Update color scheme in CSS variables

### Components
- All components use shadcn UI patterns
- Tailwind CSS for styling
- TypeScript for type safety

## Development

### Adding New Features
1. Create components in `components/`
2. Define types in `lib/types.ts`
3. Add utilities in `lib/helpers.ts`
4. Import in `TravelAssistant` or relevant component

### Debugging
- Check browser console for errors
- Use React DevTools for component inspection
- Monitor network tab for API calls

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Voice features require browser support for:
- Web Speech API
- Speech Synthesis API

## Notes

- The original vanilla JS files (`index.html`, `app.js`, `styles.css`) are preserved in the root directory
- All functionality from the original application has been migrated
- The UI design closely matches the original while leveraging modern React patterns
- Maps use dynamic imports to avoid SSR issues

## License

Proprietary - Naveo AI

## Support

For issues or questions, please contact the development team.
