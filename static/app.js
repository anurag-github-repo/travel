(() => {
  // UI Elements
  const chatMessagesEl = document.getElementById('chatMessages');
  const chatInputEl = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const flightsEl = document.getElementById('flights');
  const hotelsEl = document.getElementById('hotels');
  // Removed form elements - no longer needed
  const suggestionBtns = document.querySelectorAll('.suggestion-btn');
  
  // Context memory for agentic behavior
  const context = {
    origin: '',
    destination: '',
    departDate: '',
    returnDate: '',
    passengers: 1,
    roundTrip: true,
    lastQuery: '',
    extractedInfo: {}
  };
  
  // Map
  let map;
  let markers = [];
  let routeLine;
  let planeMarker;
  let planeTimer;
  const sessionId = (() => Math.random().toString(36).slice(2))();
  
  // Initialize map
  function initMap() {
    if (!map) {
      map = L.map('map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      map.setView([20.0, 78.0], 4);
    }
  }
  
  // Extract information from text using regex patterns
  function extractInfo(text) {
    const info = {};
    
    // Extract cities (common patterns)
    const cityPatterns = [
      /(?:from|leaving|departing|fly from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /(?:to|going to|arriving|fly to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /([A-Z][a-z]+)\s+to\s+([A-Z][a-z]+)/gi
    ];
    
    cityPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match[1] && !info.origin) info.origin = match[1];
        if (match[2] && !info.destination) info.destination = match[2];
      });
    });
    
    // Extract dates
    const datePatterns = [
      /(?:on|for|departing|leaving)\s+([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?)/gi,
      /(\d{1,2}\/\d{1,2}\/\d{4})/g,
      /(\d{4}-\d{2}-\d{2})/g
    ];
    
    datePatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      if (matches[0] && !info.departDate) info.departDate = matches[0][1];
      if (matches[1] && !info.returnDate) info.returnDate = matches[1][1];
    });
    
    // Extract passengers
    const passengerMatch = text.match(/(\d+)\s*(?:adults?|people|passengers?|friends?)/i);
    if (passengerMatch) info.passengers = parseInt(passengerMatch[1]);
    
    // Extract round trip
    if (/round\s+trip|return/i.test(text)) info.roundTrip = true;
    if (/one\s+way|single/i.test(text)) info.roundTrip = false;
    
    return info;
  }
  
  // Convert markdown-like formatting to HTML
  function formatMessage(text) {
    if (!text) return '';
    // Escape HTML first to prevent XSS
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Convert markdown formatting
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold **text**
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic *text* (but not **)
      .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>') // Code `text`
      .replace(/\n/g, '<br>'); // Line breaks
    
    return html;
  }
  
  // Add message with animation
  function addMsg(text, who) {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    if (who === 'bot') {
      div.innerHTML = formatMessage(text);
    } else {
      div.textContent = text; // User messages stay as plain text
    }
    chatMessagesEl.appendChild(div);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
  
  // Show loading indicator
  function showLoading() {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.id = 'loadingMsg';
    div.innerHTML = '<span class="loading"></span> Searching...';
    chatMessagesEl.appendChild(div);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }
  
  // Remove loading indicator
  function hideLoading() {
    const loading = document.getElementById('loadingMsg');
    if (loading) loading.remove();
  }
  
  // Hotel card - improved design
  function hotelCard(h, index) {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.animationDelay = `${index * 0.1}s`;
    const img = document.createElement('img');
    // Use data URI as fallback to avoid network requests
    const placeholderDataUri = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Ib3RlbCBJbWFnZTwvdGV4dD48L3N2Zz4=';
    
    // Configure image for better loading
    img.loading = 'lazy'; // Lazy load images
    img.alt = h.name || 'Hotel image';
    img.style.objectFit = 'cover';
    img.style.width = '100%';
    img.style.height = '200px';
    
    // Set initial image source
    if (h.image_url && h.image_url.trim() && !h.image_url.includes('placeholder')) {
      // Try to load the actual image
      // Don't set crossOrigin for Google images - they should work without it
      img.src = h.image_url;
      
      // Add loading state
      img.style.backgroundColor = '#f0f0f0';
      img.style.minHeight = '200px';
      
      img.onerror = function() {
        // Prevent infinite loop - only set once
        if (this.src !== placeholderDataUri && !this.src.startsWith('data:')) {
          console.log('Failed to load hotel image:', h.image_url);
          this.src = placeholderDataUri;
          this.onerror = null; // Remove error handler to prevent loops
        }
      };
      
      img.onload = function() {
        // Image loaded successfully
        this.style.backgroundColor = 'transparent';
      };
    } else {
      img.src = placeholderDataUri;
      img.onerror = null; // No error handler needed for data URI
    }
    
    div.appendChild(img);
    const content = document.createElement('div');
    content.className = 'card-content';
    const ratingStars = '⭐'.repeat(Math.floor(h.rating || 0));
    content.innerHTML = `
      <div class="card-title">${h.name || ''}</div>
      <div class="card-detail" style="color: #999; margin-bottom: 12px;">${h.location_text || ''}</div>
      ${h.rating ? `<div class="card-rating">${ratingStars} ${h.rating}/5</div>` : ''}
      <div class="card-detail" style="margin-top: 12px; font-size: 20px; font-weight: 600; color: #10b981;">${h.price_per_night || 'N/A'}<span style="font-size: 14px; font-weight: 400; color: #666;"> / night</span></div>
      <a href="${h.link || '#'}" target="_blank" class="card-link">View Details →</a>
    `;
    div.appendChild(content);
    return div;
  }
  
  // Flight card - redesigned to match reference
  function flightCard(f, index) {
    const div = document.createElement('div');
    div.className = 'flight-card';
    div.style.animationDelay = `${index * 0.05}s`;
    
    // Airline logo
    const logoDiv = document.createElement('div');
    logoDiv.className = 'flight-logo';
    if (f.airline_logo) {
      const img = document.createElement('img');
      img.src = f.airline_logo;
      img.alt = f.airline || '';
      img.onerror = () => {
        logoDiv.textContent = (f.airline || 'A')[0].toUpperCase();
        logoDiv.style.background = '#10b981';
        logoDiv.style.color = 'white';
        logoDiv.style.fontWeight = '600';
      };
      logoDiv.appendChild(img);
    } else {
      logoDiv.textContent = (f.airline || 'A')[0].toUpperCase();
      logoDiv.style.background = '#10b981';
      logoDiv.style.color = 'white';
      logoDiv.style.fontWeight = '600';
    }
    
    // Flight info section
    const infoDiv = document.createElement('div');
    infoDiv.className = 'flight-info';
    
    // Parse times better
    const parseTime = (timeStr) => {
      if (!timeStr) return { code: 'N/A', time: '' };
      const parts = timeStr.split(' ');
      if (parts.length >= 2) {
        return { code: parts[0], time: parts.slice(1).join(' ') };
      }
      return { code: timeStr, time: '' };
    };
    
    const depParsed = parseTime(f.departure_time);
    const arrParsed = parseTime(f.arrival_time);
    
    // Get date from context or use today
    let displayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    if (context.departDate) {
      try {
        const date = new Date(context.departDate);
        displayDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      } catch (e) {}
    }
    
    // Duration and date
    const durationDiv = document.createElement('div');
    durationDiv.className = 'flight-duration';
    durationDiv.innerHTML = `
      <div class="flight-duration-time">${f.duration || 'N/A'}</div>
      <div class="flight-duration-date">${displayDate}</div>
    `;
    
    // Times section
    const timesDiv = document.createElement('div');
    timesDiv.className = 'flight-times';
    
    const depTime = document.createElement('div');
    depTime.className = 'flight-time';
    depTime.innerHTML = `
      <div class="flight-time-code">${depParsed.code}</div>
      <div class="flight-time-hour">${depParsed.time}</div>
    `;
    
    const routeDiv = document.createElement('div');
    routeDiv.className = 'flight-route';
    routeDiv.innerHTML = `
      <div class="flight-route-line"></div>
      <div class="flight-route-label">${f.stops === 'Nonstop' ? 'Nonstop' : f.stops || '1+ stops'}</div>
    `;
    
    const arrTime = document.createElement('div');
    arrTime.className = 'flight-time';
    arrTime.innerHTML = `
      <div class="flight-time-code">${arrParsed.code}</div>
      <div class="flight-time-hour">${arrParsed.time}</div>
    `;
    
    timesDiv.appendChild(depTime);
    timesDiv.appendChild(routeDiv);
    timesDiv.appendChild(arrTime);
    
    // Price section
    const priceDiv = document.createElement('div');
    priceDiv.className = 'flight-price';
    priceDiv.innerHTML = `
      <div class="flight-price-amount">${f.price || 'N/A'}</div>
      <div class="flight-price-airline">${f.airline || ''}</div>
      <div class="flight-actions">
        ${f.booking_link ? `<a href="${f.booking_link}" target="_blank" class="flight-action-link">Book</a>` : ''}
        ${f.kayak_link ? `<a href="${f.kayak_link}" target="_blank" class="flight-action-link">Kayak</a>` : ''}
      </div>
    `;
    
    infoDiv.appendChild(durationDiv);
    infoDiv.appendChild(timesDiv);
    infoDiv.appendChild(priceDiv);
    
    div.appendChild(logoDiv);
    div.appendChild(infoDiv);
    
    return div;
  }
  
  // Map functions
  function ensureMap() {
    if (!map) initMap();
  }
  
  function clearMap() {
    if (!map) return;
    markers.forEach(m => m.remove());
    markers = [];
    if (routeLine) { routeLine.remove(); routeLine = null; }
    if (planeMarker) { planeMarker.remove(); planeMarker = null; }
    if (planeTimer) { clearInterval(planeTimer); planeTimer = null; }
  }
  
  function renderRoute(route) {
    if (!route) return;
    const from = route.from || {};
    const to = route.to || {};
    if (from.lat == null || from.lon == null || to.lat == null || to.lon == null) return;
    ensureMap();
    clearMap();
    
    const a = L.marker([from.lat, from.lon]).addTo(map).bindPopup(from.city || 'From');
    const b = L.marker([to.lat, to.lon]).addTo(map).bindPopup(to.city || 'To');
    markers.push(a, b);
    
    routeLine = L.polyline([[from.lat, from.lon], [to.lat, to.lon]], { 
      color: '#8b5cf6', 
      weight: 3,
      dashArray: '10, 10'
    }).addTo(map);
    
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    animatePlane([from.lat, from.lon], [to.lat, to.lon]);
  }
  
  function animatePlane(start, end) {
    const planeIcon = L.divIcon({
      className: 'plane-icon',
      html: '<div class="plane" style="font-size: 24px;">✈️</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    if (planeMarker) { planeMarker.remove(); }
    planeMarker = L.marker(start, { icon: planeIcon }).addTo(map);
    
    const lat1 = start[0], lon1 = start[1];
    const lat2 = end[0], lon2 = end[1];
    
    const distanceKm = haversineKm(lat1, lon1, lat2, lon2);
    const duration = Math.min(20, Math.max(8, 8 + 0.5 * (distanceKm / 1000)));
    const fps = 60;
    const totalSteps = Math.floor(duration * fps);
    let step = 0;
    
    if (planeTimer) { clearInterval(planeTimer); }
    planeTimer = setInterval(() => {
      step += 1;
      const t = Math.min(1, step / totalSteps);
      const eased = easeInOutCubic(t);
      const lat = lat1 + (lat2 - lat1) * eased;
      const lon = lon1 + (lon2 - lon1) * eased;
      planeMarker.setLatLng([lat, lon]);
      
      const bearing = Math.atan2(lon2 - lon1, lat2 - lat1) * 180 / Math.PI;
      const el = planeMarker.getElement();
      if (el) {
        const inner = el.querySelector('.plane');
        if (inner) inner.style.transform = `rotate(${bearing}deg)`;
      }
      
      if (t >= 1) {
        // Loop animation - restart from beginning
        step = 0;
      }
    }, 1000 / fps);
  }
  
  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (x) => x * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  }
  
  // Send chat message with context awareness
  async function sendChatMessage(message) {
    if (!message.trim()) return;
    
    addMsg(message, 'user');
    chatInputEl.value = '';
    showLoading();
    
    // Extract info and update context
    const extracted = extractInfo(message);
    Object.assign(context, extracted);
    context.lastQuery = message;
    
    try {
      const body = { session_id: sessionId, message: message };
      const r = await fetch(`/chat`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      });
      const j = await r.json();
      hideLoading();
      
      // Debug logging
      console.log('Response:', j);
      
      // Show bot response text - always show unless it's a clear duplicate question
      if (j) {
        if (j.text) {
          const text = j.text.trim();
          if (text) {
            // Only filter out duplicate questions when we have the context already
            const hasContext = context.destination && context.departDate;
            const isDuplicateQuestion = hasContext && (
              (text === "When would you like to travel?" || text === "When would you like to travel? When would you like to travel?") ||
              (text.includes("What dates would you like") && context.departDate && context.returnDate) ||
              (text.includes("What are your travel interests") && context.destination)
            );
            
            if (!isDuplicateQuestion) {
              addMsg(text, 'bot');
            }
          }
        } else if (j.tool_results && j.tool_results.length > 0) {
          // If we have tool results but no text, show a simple message
          addMsg('Searching for flights...', 'bot');
        }
      }
      
      // Render results
      const hotels = [];
      const flights = [];
      const searchResults = [];
      let route = null;
      let travelPlanText = '';
      let hasHotelRequest = false;
      let hasPlanRequest = false;
      let hasFlightRequest = false;
      let hasSearchRequest = false;
      
      // Detect what the user requested from the message
      const msgLower = message.toLowerCase();
      hasHotelRequest = /hotel|accommodation|stay|lodging/.test(msgLower);
      hasPlanRequest = /travel plan|plan|places to visit|things to do|activities|itinerary/.test(msgLower);
      hasFlightRequest = /flight|flights/.test(msgLower);
      hasSearchRequest = /restaurant|restaurants|cafe|cafes|best|find|search|where|what|which/.test(msgLower);
      
      (j.tool_results || []).forEach(tr => {
        if (tr.hotels && Array.isArray(tr.hotels)) hotels.push(...tr.hotels);
        if (tr.flights && Array.isArray(tr.flights)) flights.push(...tr.flights);
        if (tr.route && !route) route = tr.route;
        if (tr.name === 'generate_travel_plan' && tr.travel_plan) {
          travelPlanText = tr.travel_plan;
        }
        if (tr.name === 'search_web' && tr.search_results) {
          // Use structured search results if available
          if (Array.isArray(tr.search_results)) {
            searchResults.push(...tr.search_results);
          } else {
            // Fallback: Parse search results from the summary text
            const resultText = tr.result || '';
            const lines = resultText.split('\n').filter(l => l.trim());
            lines.forEach(line => {
              if (line.trim().startsWith('---')) return; // Skip header
              if (line.match(/^\d+\./)) {
                // Extract title, snippet, and link from formatted line
                const parts = line.split('\n');
                const titleLine = parts[0] || line;
                const snippetLine = parts[1] || '';
                const linkLine = parts[2] || '';
                
                const match = titleLine.match(/^\d+\.\s+(.+?)(?:\n|$)/);
                if (match) {
                  searchResults.push({
                    title: match[1].trim(),
                    snippet: snippetLine.trim(),
                    link: linkLine.trim()
                  });
                }
              }
            });
          }
        }
        // Also check tool name to detect requests
        if (tr.name === 'find_hotels') hasHotelRequest = true;
        if (tr.name === 'generate_travel_plan') hasPlanRequest = true;
        if (tr.name === 'find_flights') hasFlightRequest = true;
        if (tr.name === 'search_web') hasSearchRequest = true;
      });
      
      // Determine which tab to switch to based on user request priority
      let tabToSwitch = null;
      if (hasSearchRequest && (searchResults.length > 0 || hasSearchRequest)) {
        tabToSwitch = 'search';
      } else if (hasPlanRequest && travelPlanText) {
        tabToSwitch = 'plan';
      } else if (hasHotelRequest && hotels.length) {
        tabToSwitch = 'hotels';
      } else if (hasFlightRequest && flights.length) {
        tabToSwitch = 'flights';
      } else if (travelPlanText && !flights.length && !hotels.length) {
        tabToSwitch = 'plan';
      } else if (hotels.length && !flights.length) {
        tabToSwitch = 'hotels';
      } else if (flights.length) {
        tabToSwitch = 'flights';
      }
      
      if (flights.length) {
        flightsEl.innerHTML = '';
        flights.forEach((f, i) => flightsEl.appendChild(flightCard(f, i)));
      }
      if (hotels.length) {
        hotelsEl.innerHTML = '';
        hotels.forEach((h, i) => hotelsEl.appendChild(hotelCard(h, i)));
      }
      if (route) {
        renderRoute(route);
        // Update trip title
        const tripTitle = document.getElementById('tripTitle');
        if (tripTitle && route.from && route.to) {
          tripTitle.textContent = `${route.from.city || ''} to ${route.to.city || ''}`;
        }
        // Show map button
        toggleViewBtn.style.display = 'flex';
      }
      if (travelPlanText) {
        const planEl = document.getElementById('itinerary');
        if (planEl) {
          // Better formatting for travel plan
          let formatted = travelPlanText
            .replace(/\n\n+/g, '\n\n') // Normalize multiple newlines
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/### (.*?)(\n|$)/g, '<h3 style="color: #10b981; margin-top: 24px; margin-bottom: 12px; font-size: 18px;">$1</h3>') // H3
            .replace(/## (.*?)(\n|$)/g, '<h2 style="color: #10b981; margin-top: 28px; margin-bottom: 16px; font-size: 20px;">$1</h2>') // H2
            .replace(/# (.*?)(\n|$)/g, '<h1 style="color: #10b981; margin-top: 32px; margin-bottom: 20px; font-size: 24px;">$1</h1>') // H1
            .replace(/\n/g, '<br>'); // Line breaks
          planEl.innerHTML = formatted;
        }
      }
      
      // Also extract search results from bot's text response if we have search request but no structured results
      if (hasSearchRequest && searchResults.length === 0 && j.text) {
        const text = j.text;
        const lines = text.split('\n').filter(l => l.trim());
        lines.forEach(line => {
          // Look for bullet points with bold text (e.g., "**Burma Burma:** Known for...")
          const boldMatch = line.match(/^[\*\-\•]\s+\*\*(.+?)\*\*[:\-]?\s*(.*)/);
          if (boldMatch) {
            searchResults.push({
              title: boldMatch[1].trim(),
              snippet: boldMatch[2].trim(),
              link: ''
            });
          }
          // Also check numbered lists with bold
          const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*[:\-]?\s*(.*)/);
          if (numberedMatch) {
            searchResults.push({
              title: numberedMatch[1].trim(),
              snippet: numberedMatch[2].trim(),
              link: ''
            });
          }
        });
      }
      
      // Render search results
      if (hasSearchRequest && searchResults.length > 0 && searchResultsEl) {
        searchResultsEl.innerHTML = '';
        searchResults.forEach((result, i) => {
          const card = document.createElement('div');
          card.className = 'search-result-card';
          card.style.animationDelay = `${i * 0.1}s`;
          const link = result.link || result.displayed_link || '';
          const displayLink = link.replace(/^https?:\/\//, '').replace(/^www\./, '');
          card.innerHTML = `
            <div class="search-result-title">
              ${link ? `<a href="${link.startsWith('http') ? link : 'https://' + link}" target="_blank">${result.title || 'N/A'}</a>` : (result.title || 'N/A')}
            </div>
            ${result.snippet ? `<div class="search-result-snippet">${formatMessage(result.snippet)}</div>` : ''}
            ${displayLink ? `<a href="${link.startsWith('http') ? link : 'https://' + link}" target="_blank" class="search-result-link">${displayLink}</a>` : ''}
          `;
          searchResultsEl.appendChild(card);
        });
      }
      
      // Switch to the appropriate tab
      if (tabToSwitch) {
        const tabBtn = document.querySelector(`[data-tab="${tabToSwitch}"]`);
        if (tabBtn) {
          tabBtn.click();
        }
      }
      
      // Auto-trigger hotels and travel plan if we just got flights and have destination/dates
      if (flights.length > 0 && context.destination && context.departDate) {
        // Check if we need to search for hotels
        if (hotels.length === 0) {
          setTimeout(async () => {
            const hotelQuery = `Find hotels in ${context.destination} from ${context.departDate}${context.returnDate ? ` to ${context.returnDate}` : ''}`;
            await sendChatMessage(hotelQuery);
          }, 1500);
        }
        
        // Check if we need to generate travel plan
        if (!travelPlanText) {
          setTimeout(async () => {
            let days = 3;
            if (context.returnDate && context.departDate) {
              try {
                const dep = new Date(context.departDate);
                const ret = new Date(context.returnDate);
                days = Math.ceil((ret - dep) / (1000 * 60 * 60 * 24));
                if (days < 1) days = 3;
              } catch (e) {}
            }
            const planQuery = `Create a travel plan for ${context.destination} for ${days} days`;
            await sendChatMessage(planQuery);
          }, 3000);
        }
      }
    } catch (e) {
      hideLoading();
      addMsg('Sorry, I encountered an error. Please try again.', 'bot');
    }
  }
  
  // Event listeners
  chatSendBtn.addEventListener('click', () => sendChatMessage(chatInputEl.value));
  chatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMessage(chatInputEl.value);
  });
  
  suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sendChatMessage(btn.dataset.suggestion);
    });
  });
  
  // Removed form-related event listeners
  
  // Toggle between map and results
  const toggleViewBtn = document.getElementById('toggleView');
  const toggleViewText = document.getElementById('toggleViewText');
  const mapContainer = document.getElementById('mapContainer');
  const resultsSection = document.getElementById('resultsSection');
  let showingMap = false;
  
  toggleViewBtn.addEventListener('click', () => {
    showingMap = !showingMap;
    if (showingMap) {
      mapContainer.style.display = 'block';
      resultsSection.style.display = 'none';
      toggleViewText.textContent = 'Show results';
      ensureMap();
    } else {
      mapContainer.style.display = 'none';
      resultsSection.style.display = 'block';
      toggleViewText.textContent = 'Show map';
    }
  });
  
  document.getElementById('newSearch').addEventListener('click', (e) => {
    e.preventDefault();
    flightsEl.innerHTML = '';
    hotelsEl.innerHTML = '';
    const planEl = document.getElementById('itinerary');
    if (planEl) planEl.innerHTML = '';
    if (searchResultsEl) searchResultsEl.innerHTML = '';
    chatMessagesEl.innerHTML = '';
    clearMap();
    showingMap = false;
    mapContainer.style.display = 'none';
    resultsSection.style.display = 'block';
    toggleViewText.textContent = 'Show map';
    // Reset to flights tab
    document.querySelector('[data-tab="flights"]')?.click();
    Object.keys(context).forEach(k => {
      if (k === 'roundTrip') context[k] = true;
      else if (k === 'passengers') context[k] = 1;
      else context[k] = '';
    });
  });
  
  // Tab functionality
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = {
    'flights': document.getElementById('tab-flights'),
    'hotels': document.getElementById('tab-hotels'),
    'plan': document.getElementById('tab-plan'),
    'search': document.getElementById('tab-search')
  };
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Update active state
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show/hide content
      Object.values(tabContents).forEach(content => {
        if (content) content.style.display = 'none';
      });
      if (tabContents[tabName]) {
        tabContents[tabName].style.display = 'block';
      }
    });
  });
  
  // Auto-switch to relevant tab when results come in
  const originalRenderResults = () => {
    // This will be called after results are rendered
  };
  
  // Resize handle functionality
  const leftPanel = document.getElementById('leftPanel');
  const resizeHandle = document.getElementById('resizeHandle');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = leftPanel.offsetWidth;
    resizeHandle.classList.add('active');
    leftPanel.style.transition = 'none'; // Disable transitions during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    const diff = e.clientX - startX;
    const newWidth = startWidth + diff;
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.6; // Max 60% of window width
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      leftPanel.style.width = newWidth + 'px';
    }
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('active');
      leftPanel.style.transition = ''; // Re-enable transitions
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Save width to localStorage
      localStorage.setItem('leftPanelWidth', leftPanel.style.width);
    }
  });
  
  // Restore saved width on load
  const savedWidth = localStorage.getItem('leftPanelWidth');
  if (savedWidth) {
    leftPanel.style.width = savedWidth;
  }
  
  // Initialize
  initMap();
})();
