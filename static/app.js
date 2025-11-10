(() => {
  // UI Elements
  const chatMessagesEl = document.getElementById('chatMessages');
  const chatContentEl = document.querySelector('.chat-content'); // The scrollable container
  const chatInputEl = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const flightsEl = document.getElementById('flights');
  const hotelsEl = document.getElementById('hotels');
  const searchResultsEl = document.getElementById('searchResults');
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
  
  // Map - Leaflet
  let map;
  let markers = [];
  let routeLine;
  let planeMarker;
  let planeTimer;
  const sessionId = (() => Math.random().toString(36).slice(2))();
  
  // Initialize Leaflet Map
  function initMap() {
    if (!map && document.getElementById('map')) {
      const mapEl = document.getElementById('map');
      
      // Clear any existing content
      mapEl.innerHTML = '';
      
      // Check if Leaflet is available
      if (typeof L !== 'undefined') {
        try {
          map = L.map('map', {
            preferCanvas: true,
            zoomControl: true
          });
          
          // Use OpenStreetMap tiles
          const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            subdomains: 'abc'
          });
          
          osmLayer.addTo(map);
          // Set initial view with reasonable zoom level
          map.setView([20.0, 78.0], 4);
          map.setMinZoom(2);
          map.setMaxZoom(18);
          
          // Important: Invalidate size after initialization to fix rendering issues
          map.whenReady(() => {
            setTimeout(() => {
              map.invalidateSize();
              console.log('Leaflet map initialized successfully');
            }, 100);
          });
          
          // Handle tile errors gracefully - try alternative provider
          osmLayer.on('tileerror', function() {
            console.warn('Tile loading error, trying alternative provider');
            try {
              const altLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
                subdomains: 'abc'
              });
              map.removeLayer(osmLayer);
              altLayer.addTo(map);
            } catch (e) {
              console.error('Alternative tile provider also failed:', e);
            }
          });
          
        } catch (e) {
          console.error('Error initializing Leaflet map:', e);
          mapEl.innerHTML = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:20px;text-align:center;"><div style="font-size:48px;margin-bottom:10px;">🗺️</div><p style="margin-bottom:5px;font-size:16px;font-weight:600;">Map Loading...</p></div>';
        }
      } else {
        // Leaflet not available - show placeholder
        mapEl.innerHTML = '<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:20px;text-align:center;"><div style="font-size:48px;margin-bottom:10px;">🗺️</div><p style="margin-bottom:5px;font-size:16px;font-weight:600;">Interactive Map</p><p style="font-size:12px;opacity:0.9;">Map will appear when route is available</p></div>';
      }
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
      .replace(/•\s/g, '• ') // Bullet points
      .replace(/\n/g, '<br>'); // Line breaks
    
    return html;
  }
  
  // Render flight table in chat message
  function renderFlightTable(flights) {
    if (!flights || flights.length === 0) return '';
    
    let tableHTML = '<div class="flight-table-wrapper"><table class="flight-table"><thead><tr><th>Airline</th><th>Departure</th><th>Arrival</th><th>Duration</th><th>Stops</th><th>Price</th></tr></thead><tbody>';
    
    flights.slice(0, 5).forEach(flight => {
      const depParsed = parseTime(flight.departure_time || '');
      const arrParsed = parseTime(flight.arrival_time || '');
      const logoHTML = flight.airline_logo 
        ? `<img src="${flight.airline_logo}" alt="${flight.airline || ''}" class="airline-logo-small" onerror="this.style.display='none'">`
        : '';
      
      tableHTML += `
        <tr>
          <td>
            <div class="airline-cell">
              ${logoHTML}
              <span>${flight.airline || 'N/A'}</span>
            </div>
          </td>
          <td>${depParsed.code || 'N/A'}<br><small>${depParsed.time || ''}</small></td>
          <td>${arrParsed.code || 'N/A'}<br><small>${arrParsed.time || ''}</small></td>
          <td>${flight.duration || 'N/A'}</td>
          <td>${flight.stops || 'N/A'}</td>
          <td><strong>${flight.price || 'N/A'}</strong></td>
        </tr>
      `;
    });
    
    tableHTML += '</tbody></table></div>';
    return tableHTML;
  }
  
  function parseTime(timeStr) {
    if (!timeStr) return { code: 'N/A', time: '' };
    const parts = timeStr.split(' ');
    if (parts.length >= 2) {
      return { code: parts[0], time: parts.slice(1).join(' ') };
    }
    return { code: timeStr, time: '' };
  }
  
  // Helper function to scroll to bottom - optimized for performance
  let lastScrollTime = 0;
  let scrollPending = false;
  
  function scrollToBottom(force = false) {
    // The scrollable container is .chat-content, not chatMessages
    const scrollContainer = chatContentEl || chatMessagesEl;
    if (!scrollContainer) return;
    
    // Throttle scroll calls to avoid lag (max once per 50ms)
    const now = Date.now();
    if (!force && now - lastScrollTime < 50) {
      if (!scrollPending) {
        scrollPending = true;
        requestAnimationFrame(() => {
          scrollPending = false;
          scrollToBottom(force);
        });
      }
      return;
    }
    lastScrollTime = now;
    
    // Check if already near bottom (within 100px) - don't scroll if user scrolled up
    const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
    if (!force && !isNearBottom) {
      // User has scrolled up, don't auto-scroll
      return;
    }
    
    // Use fast scroll (auto instead of smooth for better performance)
    try {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    } catch (e) {
      console.warn('Scroll failed:', e);
    }
  }
  
  // Add message with animation
  function addMsg(text, who, flights = null) {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    if (who === 'bot') {
      let content = formatMessage(text);
      // Add flight table if flights are provided
      if (flights && Array.isArray(flights) && flights.length > 0) {
        content += renderFlightTable(flights);
      }
      div.innerHTML = content;
    } else {
      div.textContent = text; // User messages stay as plain text
    }
    chatMessagesEl.appendChild(div);
    
    // Scroll to bottom after adding message (single call, optimized)
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }
  
  // Show loading indicator
  function showLoading() {
    const div = document.createElement('div');
    div.className = 'msg bot';
    div.id = 'loadingMsg';
    div.innerHTML = '<span class="loading"></span> Searching...';
    chatMessagesEl.appendChild(div);
    scrollToBottom();
  }
  
  // Remove loading indicator
  function hideLoading() {
    const loading = document.getElementById('loadingMsg');
    if (loading) loading.remove();
  }
  
  // Voice output (text-to-speech) for bot messages
  function speakText(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  }
  
  // Check if voice output is enabled
  let voiceOutputEnabled = localStorage.getItem('voiceOutput') !== 'false';
  
  // Helper to add message with optional voice output
  function addMsgWithVoice(text, who, flights = null) {
    addMsg(text, who, flights);
    if (who === 'bot' && voiceOutputEnabled && 'speechSynthesis' in window) {
      // Only speak short messages (not long flight tables)
      if (text && text.length < 200 && !flights) {
        setTimeout(() => speakText(text), 500);
      }
    }
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
    
    // Build booking links array
    const bookingLinks = [];
    if (f.booking_link) bookingLinks.push({ name: 'Google', url: f.booking_link });
    if (f.kayak_link) bookingLinks.push({ name: 'Kayak', url: f.kayak_link });
    if (f.skyscanner_link) bookingLinks.push({ name: 'Skyscanner', url: f.skyscanner_link });
    if (f.expedia_link) bookingLinks.push({ name: 'Expedia', url: f.expedia_link });
    if (f.booking_com_link) bookingLinks.push({ name: 'Booking.com', url: f.booking_com_link });
    if (f.momondo_link) bookingLinks.push({ name: 'Momondo', url: f.momondo_link });
    
    const linksHTML = bookingLinks.map(link => 
      `<a href="${link.url}" target="_blank" class="flight-action-link" title="${link.name}">${link.name}</a>`
    ).join('');
    
    priceDiv.innerHTML = `
      <div class="flight-price-amount">${f.price || 'N/A'}</div>
      <div class="flight-price-airline">${f.airline || ''}</div>
      <div class="flight-actions" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;">
        ${linksHTML}
      </div>
    `;
    
    infoDiv.appendChild(durationDiv);
    infoDiv.appendChild(timesDiv);
    infoDiv.appendChild(priceDiv);
    
    div.appendChild(logoDiv);
    div.appendChild(infoDiv);
    
    return div;
  }
  
  // Map functions - Leaflet
  function ensureMap() {
    if (!map) {
      initMap();
    } else {
      // Important: Invalidate size when map container becomes visible
      setTimeout(() => {
        if (map) {
          map.invalidateSize();
        }
      }, 100);
    }
  }
  
  function clearMap() {
    if (!map) return;
    // Clear markers
    markers.forEach(m => m.remove());
    markers = [];
    // Clear polyline
    if (routeLine) {
      routeLine.remove();
      routeLine = null;
    }
    // Clear plane marker
    if (planeMarker) {
      planeMarker.remove();
      planeMarker = null;
    }
    // Clear animation timer
    if (planeTimer) {
      clearInterval(planeTimer);
      planeTimer = null;
    }
  }
  
  function renderRoute(route) {
    if (!route) return;
    const from = route.from || {};
    const to = route.to || {};
    if (from.lat == null || from.lon == null || to.lat == null || to.lon == null) {
      console.warn('Route data incomplete:', route);
      return;
    }
    
    // Ensure map is initialized
    if (typeof L === 'undefined') {
      console.error('Leaflet library not loaded');
      return;
    }
    
    if (!map) {
      initMap();
      // Wait for map to initialize, then render route
      setTimeout(() => {
        if (map) {
          map.invalidateSize(); // Fix for hidden containers
          renderRoute(route);
        } else {
          console.error('Map failed to initialize');
        }
      }, 1000);
      return;
    }
    
    // Clear existing markers and routes
    clearMap();
    
    try {
      // Add origin marker
      const originMarker = L.marker([from.lat, from.lon], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="width:16px;height:16px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map).bindPopup(from.city || 'Origin');
      markers.push(originMarker);
      
      // Add destination marker
      const destMarker = L.marker([to.lat, to.lon], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="width:16px;height:16px;background:#ef4444;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map).bindPopup(to.city || 'Destination');
      markers.push(destMarker);
      
      // Add route polyline
      routeLine = L.polyline([[from.lat, from.lon], [to.lat, to.lon]], { 
        color: '#8b5cf6', 
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(map);
      
      // Fit map to show both points with proper zoom out
      const bounds = L.latLngBounds([[from.lat, from.lon], [to.lat, to.lon]]);
      
      // Calculate distance to determine appropriate padding
      const distanceKm = haversineKm(from.lat, from.lon, to.lat, to.lon);
      
      // Use larger padding to ensure proper zoom out (percentage of viewport)
      // Convert to pixel padding - use larger values for better zoom out
      const mapContainer = document.getElementById('map');
      const containerWidth = mapContainer ? mapContainer.offsetWidth : 800;
      const containerHeight = mapContainer ? mapContainer.offsetHeight : 600;
      
      // Use 20% padding on all sides for better zoom out
      const paddingPixels = [
        Math.max(100, containerHeight * 0.2), // Top/bottom padding
        Math.max(100, containerWidth * 0.2)   // Left/right padding
      ];
      
      // Adjust max zoom based on distance - lower for longer routes
      let maxZoom = 10; // Default max zoom
      if (distanceKm > 2000) {
        maxZoom = 6; // Very long routes - zoom out more
      } else if (distanceKm > 1000) {
        maxZoom = 8; // Long routes
      } else if (distanceKm > 500) {
        maxZoom = 9; // Medium-long routes
      } else if (distanceKm < 50) {
        maxZoom = 12; // Short routes can zoom in more
      }
      
      // Fit bounds with generous padding and lower max zoom
      map.fitBounds(bounds, { 
        padding: paddingPixels,
        maxZoom: maxZoom
      });
      
      // Important: Invalidate size after fitting bounds
      setTimeout(() => {
        map.invalidateSize();
        // Re-fit bounds after invalidation with same settings
        map.fitBounds(bounds, { 
          padding: paddingPixels,
          maxZoom: maxZoom
        });
        
        // Double-check: if zoom is still too high, force a lower zoom
        setTimeout(() => {
          if (map.getZoom() > maxZoom) {
            map.setZoom(maxZoom);
            map.panTo(bounds.getCenter());
          }
        }, 100);
      }, 200);
      
      // Animate plane along the route
      animatePlane([from.lat, from.lon], [to.lat, to.lon]);
      
      console.log('Route rendered successfully with Leaflet');
    } catch (e) {
      console.error('Error rendering route:', e);
    }
  }
  
  function animatePlane(start, end) {
    if (!map) return;
    
    // Create plane icon
    const planeIcon = L.divIcon({
      className: 'plane-icon',
      html: '<div class="plane" style="font-size: 24px; transform: rotate(0deg);">✈️</div>',
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
      
      // Calculate bearing (direction) towards destination
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2Rad);
      const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
      const bearing = Math.atan2(y, x) * 180 / Math.PI;
      
      // Update plane rotation
      const el = planeMarker.getElement();
      if (el) {
        const inner = el.querySelector('.plane');
        if (inner) {
          inner.style.transform = `rotate(${bearing}deg)`;
        }
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
    
    // Handle round trip updates
    const msgLower = message.toLowerCase();
    if (msgLower.includes('round trip') || msgLower.includes('roundtrip') || (msgLower.includes('return') && msgLower.includes('date'))) {
      context.roundTrip = true;
    } else if (msgLower.includes('one way') || msgLower.includes('one-way') || msgLower.includes('single')) {
      context.roundTrip = false;
      context.returnDate = '';
    }
    
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
      let flightsForChat = [];
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
              // Check if we have flights to display in chat
              (j.tool_results || []).forEach(tr => {
                if (tr.flights && Array.isArray(tr.flights)) {
                  flightsForChat = tr.flights;
                }
              });
              
              // Filter out flight summary text if we have structured flights
              let filteredText = text;
              if (flightsForChat.length > 0) {
                // Remove flight summary patterns (numbered lists, "--- Flights ---" headers, etc.)
                // Split by lines and filter out flight list lines
                const lines = filteredText.split('\n');
                let foundFlightList = false;
                const filteredLines = lines.filter(line => {
                  const trimmed = line.trim();
                  
                  // If we've already found the flight list, skip everything after
                  if (foundFlightList) return false;
                  
                  // Check if this line starts a flight list
                  if (/^---\s*Flights?\s*\(.*?\)\s*---/i.test(trimmed)) {
                    foundFlightList = true;
                    return false;
                  }
                  if (/^Here are (some|the) (direct )?flight options? for you:?/i.test(trimmed)) {
                    foundFlightList = true;
                    return false;
                  }
                  if (/^\d+\.\s*[A-Za-z\s]+\s*\|.*?(dep|Departs|arr|Arrives)/i.test(trimmed)) {
                    foundFlightList = true;
                    return false;
                  }
                  if (/^\d+\.\s*[A-Za-z\s]+\s*\|\s*Flight\s+\d+/i.test(trimmed)) {
                    foundFlightList = true;
                    return false;
                  }
                  if (/Do any of these flights work for you/i.test(trimmed)) {
                    foundFlightList = true;
                    return false;
                  }
                  
                  return true;
                });
                
                filteredText = filteredLines.join('\n').trim();
                
                // If text is now empty or just whitespace, use a default message
                if (!filteredText || filteredText.length < 10) {
                  filteredText = "Great! I found flight options for you. ✈️";
                }
              }
              
              addMsgWithVoice(filteredText, 'bot', flightsForChat.length > 0 ? flightsForChat : null);
            }
          }
        } else if (j.tool_results && j.tool_results.length > 0) {
          // If we have tool results but no text, show a simple message
          (j.tool_results || []).forEach(tr => {
            if (tr.flights && Array.isArray(tr.flights)) {
              flightsForChat = tr.flights;
            }
          });
          if (flightsForChat.length > 0) {
            addMsgWithVoice('Great! I found flight options for you. ✈️', 'bot', flightsForChat);
          } else {
            addMsgWithVoice('Searching...', 'bot', null);
          }
        }
      }
      
      // Render results
      const hotels = [];
      const flights = [];
      const searchResults = [];
      let route = null;
      let travelPlanText = '';
      let travelPlanImages = {};
      let hasHotelRequest = false;
      let hasPlanRequest = false;
      let hasFlightRequest = false;
      let hasSearchRequest = false;
      
      // Detect what the user requested from the message
      const msgLower = message.toLowerCase();
      hasHotelRequest = /hotel|accommodation|stay|lodging|find hotels|show hotels|search hotels/.test(msgLower);
      hasPlanRequest = /travel plan|plan|places to visit|things to do|activities|itinerary/.test(msgLower);
      hasFlightRequest = /flight|flights|find flights|show flights|search flights/.test(msgLower);
      hasSearchRequest = /restaurant|restaurants|cafe|cafes|best|find|search|where|what|which/.test(msgLower);
      
      (j.tool_results || []).forEach(tr => {
        if (tr.hotels && Array.isArray(tr.hotels)) hotels.push(...tr.hotels);
        if (tr.flights && Array.isArray(tr.flights)) flights.push(...tr.flights);
        if (tr.route && !route) route = tr.route;
        if (tr.name === 'generate_travel_plan' && tr.travel_plan) {
          travelPlanText = tr.travel_plan;
          if (tr.travel_plan_images) {
            travelPlanImages = tr.travel_plan_images;
          }
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
      // Priority: explicit requests first, then by data availability
      if (hasSearchRequest && (searchResults.length > 0 || hasSearchRequest)) {
        tabToSwitch = 'search';
      } else if (hasHotelRequest && hotels.length > 0) {
        tabToSwitch = 'hotels';  // Explicit hotel request - switch to hotels tab
      } else if (hasPlanRequest && travelPlanText) {
        tabToSwitch = 'plan';
      } else if (hasFlightRequest && flights.length > 0) {
        tabToSwitch = 'flights';
      } else if (hotels.length > 0 && !flights.length) {
        tabToSwitch = 'hotels';  // If we have hotels and no flights, show hotels
      } else if (travelPlanText && !flights.length && !hotels.length) {
        tabToSwitch = 'plan';
      } else if (flights.length > 0) {
        tabToSwitch = 'flights';
      }
      
      if (flights.length) {
        flightsEl.innerHTML = '';
        flights.forEach((f, i) => flightsEl.appendChild(flightCard(f, i)));
      }
      if (hotels.length) {
        hotelsEl.innerHTML = '';
        hotels.forEach((h, i) => hotelsEl.appendChild(hotelCard(h, i)));
        // If we have hotels and user asked for hotels, ensure we switch to hotels tab
        if (hasHotelRequest && !tabToSwitch) {
          tabToSwitch = 'hotels';
        }
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
          // Better formatting for travel plan with images
          let formatted = travelPlanText
            .replace(/\n\n+/g, '\n\n') // Normalize multiple newlines
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/### (.*?)(\n|$)/g, '<h3 style="color: #10b981; margin-top: 24px; margin-bottom: 12px; font-size: 18px;">$1</h3>') // H3
            .replace(/## (.*?)(\n|$)/g, '<h2 style="color: #10b981; margin-top: 28px; margin-bottom: 16px; font-size: 20px;">$1</h2>') // H2
            .replace(/# (.*?)(\n|$)/g, '<h1 style="color: #10b981; margin-top: 32px; margin-bottom: 20px; font-size: 24px;">$1</h1>') // H1
            .replace(/\n/g, '<br>'); // Line breaks
          
          // Add images if available
          let imagesHTML = '';
          if (Object.keys(travelPlanImages).length > 0) {
            imagesHTML = '<div style="margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 12px;">';
            for (const [place, imageUrl] of Object.entries(travelPlanImages)) {
              if (imageUrl) {
                imagesHTML += `
                  <div style="flex: 1; min-width: 200px; max-width: 300px;">
                    <img src="${imageUrl}" alt="${place}" 
                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                         onerror="this.style.display='none'"
                         loading="lazy">
                    <p style="margin-top: 8px; font-size: 14px; color: #666; text-align: center;">${place}</p>
                  </div>
                `;
              }
            }
            imagesHTML += '</div>';
          }
          
          planEl.innerHTML = imagesHTML + formatted;
        }
      }
      
      // Also extract search results from bot's text response if we have search request but no structured results
      if (hasSearchRequest && searchResults.length === 0 && j.text) {
        try {
          const text = j.text;
          const lines = text.split('\n').filter(l => l.trim());
          lines.forEach(line => {
            // Look for bullet points with bold text (e.g., "**Burma Burma:** Known for...")
            // Pattern: *   **Name:** Description
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
            // Pattern without bold: *   Name: Description (handles multiple spaces)
            const simpleMatch = line.match(/^[\*\-\•]\s+([A-Z][^:]+?):\s*(.*)/);
            if (simpleMatch && !boldMatch && !numberedMatch) {
              const title = simpleMatch[1].trim();
              const snippet = simpleMatch[2].trim();
              // Only add if it looks like a restaurant name (starts with capital, has description)
              if (title.length > 2 && snippet.length > 5) {
                searchResults.push({
                  title: title,
                  snippet: snippet,
                  link: ''
                });
              }
            }
          });
        } catch (e) {
          console.error('Error extracting search results from text:', e);
        }
      }
      
      // Render search results
      if (hasSearchRequest && searchResults.length > 0) {
        try {
          if (!searchResultsEl) {
            console.error('searchResultsEl not found');
            return;
          }
          searchResultsEl.innerHTML = '';
          searchResults.forEach((result, i) => {
            try {
              const card = document.createElement('div');
              card.className = 'search-result-card';
              card.style.animationDelay = `${i * 0.1}s`;
              const link = result.link || result.displayed_link || '';
              const displayLink = link ? link.replace(/^https?:\/\//, '').replace(/^www\./, '') : '';
              const title = result.title || 'N/A';
              const snippet = result.snippet || '';
              
              card.innerHTML = `
                <div class="search-result-title">
                  ${link ? `<a href="${link.startsWith('http') ? link : 'https://' + link}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}
                </div>
                ${snippet ? `<div class="search-result-snippet">${formatMessage(snippet)}</div>` : ''}
                ${displayLink ? `<a href="${link.startsWith('http') ? link : 'https://' + link}" target="_blank" rel="noopener noreferrer" class="search-result-link">${displayLink}</a>` : ''}
              `;
              searchResultsEl.appendChild(card);
            } catch (e) {
              console.error('Error rendering search result card:', e, result);
            }
          });
        } catch (e) {
          console.error('Error rendering search results:', e);
        }
      }
      
      // Switch to the appropriate tab
      if (tabToSwitch) {
        const tabBtn = document.querySelector(`[data-tab="${tabToSwitch}"]`);
        if (tabBtn) {
          tabBtn.click();
        }
      }
      
      // Final scroll to ensure all content is visible (single optimized call)
      requestAnimationFrame(() => {
        setTimeout(() => scrollToBottom(true), 200);
      });
      
      // Removed auto-trigger - only search when user explicitly asks
    } catch (e) {
      hideLoading();
      console.error('Error in sendChatMessage:', e);
      addMsgWithVoice('Sorry, I encountered an error. Please try again.', 'bot');
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
  
  // Dark mode toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
  }
  
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  });
  
  // Voice input functionality
  const voiceBtn = document.getElementById('voiceBtn');
  let recognition = null;
  let isRecording = false;
  
  // Check if browser supports speech recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      isRecording = true;
      voiceBtn.classList.add('recording');
      voiceBtn.title = 'Listening...';
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      chatInputEl.value = transcript;
      sendChatMessage(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceBtn.title = 'Voice input';
      if (event.error === 'no-speech') {
        addMsgWithVoice('No speech detected. Please try again.', 'bot');
      }
    };
    
    recognition.onend = () => {
      isRecording = false;
      voiceBtn.classList.remove('recording');
      voiceBtn.title = 'Voice input';
    };
    
    voiceBtn.addEventListener('click', () => {
      if (isRecording) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error starting recognition:', e);
          addMsgWithVoice('Voice input is not available. Please use text input.', 'bot');
        }
      }
    });
  } else {
    // Hide voice button if not supported
    voiceBtn.style.display = 'none';
  }
  
  // Ensure map initializes when container is visible (mapContainer already declared above)
  // This fixes the Leaflet issue where map doesn't render properly in hidden containers
  const mapObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const mapContainerEl = document.getElementById('mapContainer');
        if (mapContainerEl && mapContainerEl.style.display !== 'none') {
          // Wait for Leaflet to load if needed
          if (typeof L !== 'undefined') {
            if (!map) {
              setTimeout(() => {
                initMap();
                // Important: Invalidate size after container becomes visible
                if (map) {
                  setTimeout(() => map.invalidateSize(), 200);
                }
              }, 100);
            } else {
              // Map exists but container just became visible - invalidate size
              setTimeout(() => {
                map.invalidateSize();
              }, 200);
            }
          } else {
            // Wait for Leaflet script to load
            const checkLeaflet = setInterval(() => {
              if (typeof L !== 'undefined') {
                clearInterval(checkLeaflet);
                setTimeout(() => {
                  initMap();
                  if (map) {
                    setTimeout(() => map.invalidateSize(), 200);
                  }
                }, 100);
              }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkLeaflet), 5000);
          }
        }
      }
    });
  });
  const mapContainerEl = document.getElementById('mapContainer');
  if (mapContainerEl) {
    mapObserver.observe(mapContainerEl, { attributes: true, attributeFilter: ['style'] });
  }
  
  // Auto-scroll observer - watch for new messages and scroll automatically (optimized)
  let scrollTimeout = null;
  const scrollObserver = new MutationObserver((mutations) => {
    // Only scroll if new content was added
    let shouldScroll = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        // Check if it's a message node, not just attribute changes
        for (let node of mutation.addedNodes) {
          if (node.nodeType === 1 && (node.classList.contains('msg') || node.querySelector('.msg'))) {
            shouldScroll = true;
            break;
          }
        }
      }
    });
    
    if (shouldScroll) {
      // Debounce scroll to avoid excessive calls (longer delay for better performance)
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  });
  
  if (chatMessagesEl) {
    scrollObserver.observe(chatMessagesEl, {
      childList: true,
      subtree: false, // Only watch direct children, not deep subtree
      attributes: false
    });
  }
  
  // Initialize with greeting message
  if (chatMessagesEl && chatMessagesEl.children.length === 0) {
    addMsg('Hi there! I am Naveo AI agent. How can I help you plan your trip today? ✈️', 'bot');
  }
  
  // Initialize map
  initMap();
})();
