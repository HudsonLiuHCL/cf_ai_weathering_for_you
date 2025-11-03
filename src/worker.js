// src/worker.js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Enable CORS for all requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Trip Weather Planner is running' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Main trip weather endpoint
    if (url.pathname === '/trip-weather' && request.method === 'POST') {
      try {
        const { location, days } = await request.json();

        if (!location || location.trim() === '') {
          return new Response(
            JSON.stringify({ error: 'Location is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate days (1-10)
        const numDays = parseInt(days) || 1;
        if (numDays < 1 || numDays > 10) {
          return new Response(
            JSON.stringify({ error: 'Days must be between 1 and 10' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 1: Geocode the location
        const geoData = await geocodeLocation(location.trim());
        if (!geoData) {
          return new Response(
            JSON.stringify({ error: 'Location not found. Please try a different city or ZIP code.' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 2: Fetch multi-day weather forecast
        const weatherForecast = await fetchMultiDayWeather(geoData.latitude, geoData.longitude, numDays);
        if (!weatherForecast) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch weather forecast' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 3: Generate AI trip planning response
        const aiResponse = await generateTripPlan(
          env,
          geoData.name,
          weatherForecast,
          numDays
        );

        return new Response(
          JSON.stringify({
            location: geoData.name,
            days: numDays,
            ...aiResponse
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error processing request:', error);
        return new Response(
          JSON.stringify({ error: 'Internal server error: ' + error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};

/**
 * Geocode a location string to lat/lon using Open-Meteo Geocoding API
 */
async function geocodeLocation(location) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  
  try {
    const response = await fetch(geoUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return {
        name: data.results[0].name,
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Fetch multi-day weather forecast from Open-Meteo Weather API
 */
async function fetchMultiDayWeather(lat, lon, days) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,windspeed_10m_max&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto&forecast_days=${days}`;
  
  try {
    const response = await fetch(weatherUrl);
    const data = await response.json();

    if (data.daily) {
      // Transform the data into a more usable format
      const forecast = [];
      for (let i = 0; i < days; i++) {
        forecast.push({
          date: data.daily.time[i],
          temp_max: data.daily.temperature_2m_max[i],
          temp_min: data.daily.temperature_2m_min[i],
          precipitation: data.daily.precipitation_sum[i],
          weathercode: data.daily.weathercode[i],
          windspeed_max: data.daily.windspeed_10m_max[i],
        });
      }
      return forecast;
    }
    return null;
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

/**
 * Generate trip plan with packing list using Llama 3.3 via Workers AI
 */
async function generateTripPlan(env, locationName, weatherForecast, numDays) {
  // Create a summary of the forecast
  let forecastSummary = `${numDays}-day forecast for ${locationName}:\n\n`;
  weatherForecast.forEach((day, index) => {
    const weatherDesc = getWeatherDescription(day.weathercode);
    forecastSummary += `Day ${index + 1} (${day.date}): ${weatherDesc}, High ${day.temp_max}°F, Low ${day.temp_min}°F, Wind ${day.windspeed_max} mph, Precipitation ${day.precipitation} mm\n`;
  });

  const prompt = `You are a helpful travel assistant planning a trip.

${forecastSummary}

Based on this ${numDays}-day weather forecast, provide:
1. A brief trip weather summary (2-3 sentences)
2. A comprehensive packing list with essential items

Format your response EXACTLY like this:
SUMMARY: [Your 2-3 sentence weather summary]

PACKING LIST:
- [Item 1]
- [Item 2]
- [Item 3]
(continue with all essential items)

Be specific and practical. Include clothing, accessories, and weather-specific items.`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'You are a helpful travel and weather planning assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    // Parse the AI response
    const aiText = response.response || '';
    
    // Extract summary and packing list
    let summary = '';
    let packingList = [];
    
    const summaryMatch = aiText.match(/SUMMARY:\s*(.+?)(?=PACKING LIST:|$)/is);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
    }
    
    const packingMatch = aiText.match(/PACKING LIST:\s*([\s\S]+)/i);
    if (packingMatch) {
      const packingText = packingMatch[1].trim();
      packingList = packingText
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]+\s*/, '').trim())
        .filter(item => item.length > 0);
    }

    // Fallback if parsing fails
    if (!summary || packingList.length === 0) {
      const fallback = generateFallbackPlan(weatherForecast, numDays);
      return fallback;
    }

    return {
      summary,
      packingList,
      dailyForecast: weatherForecast.map(day => ({
        date: day.date,
        condition: getWeatherDescription(day.weathercode),
        high: Math.round(day.temp_max),
        low: Math.round(day.temp_min),
        precipitation: day.precipitation,
      }))
    };
  } catch (error) {
    console.error('AI generation error:', error);
    return generateFallbackPlan(weatherForecast, numDays);
  }
}

/**
 * Generate fallback trip plan if AI fails
 */
function generateFallbackPlan(weatherForecast, numDays) {
  // Analyze the weather patterns
  const avgHigh = weatherForecast.reduce((sum, d) => sum + d.temp_max, 0) / numDays;
  const avgLow = weatherForecast.reduce((sum, d) => sum + d.temp_min, 0) / numDays;
  const totalPrecip = weatherForecast.reduce((sum, d) => sum + d.precipitation, 0);
  const hasRain = totalPrecip > 5;
  const hasSnow = weatherForecast.some(d => d.weathercode >= 71 && d.weathercode <= 77);
  
  // Generate summary
  let summary = `Expect temperatures ranging from ${Math.round(avgLow)}°F to ${Math.round(avgHigh)}°F over your ${numDays}-day trip. `;
  if (hasSnow) {
    summary += 'Snow is expected, so prepare for winter conditions. ';
  } else if (hasRain) {
    summary += 'Rain is likely, so pack accordingly. ';
  } else {
    summary += 'Mostly dry conditions expected. ';
  }
  summary += 'Check daily forecasts for specific conditions.';

  // Generate packing list
  const packingList = [];
  
  // Clothing based on temperature
  if (avgHigh > 75) {
    packingList.push('Lightweight, breathable clothing (t-shirts, shorts)', 'Sunglasses', 'Sunscreen (SPF 30+)', 'Hat or cap for sun protection');
  } else if (avgHigh > 60) {
    packingList.push('Light layers (long-sleeve shirts, light jacket)', 'Comfortable pants or jeans', 'Light sweater or cardigan');
  } else if (avgHigh > 40) {
    packingList.push('Warm jacket or coat', 'Long pants', 'Sweaters or hoodies', 'Closed-toe shoes');
  } else {
    packingList.push('Heavy winter coat', 'Warm layers (thermal underwear)', 'Warm pants', 'Gloves and warm hat', 'Insulated boots');
  }

  // Weather-specific items
  if (hasRain) {
    packingList.push('Rain jacket or waterproof coat', 'Umbrella', 'Waterproof shoes or boots');
  }
  
  if (hasSnow) {
    packingList.push('Snow boots with good traction', 'Waterproof gloves', 'Scarf', 'Hand warmers');
  }

  // General items
  packingList.push('Comfortable walking shoes', 'Extra socks and underwear', 'Toiletries', 'Phone charger', 'Reusable water bottle');

  return {
    summary,
    packingList,
    dailyForecast: weatherForecast.map(day => ({
      date: day.date,
      condition: getWeatherDescription(day.weathercode),
      high: Math.round(day.temp_max),
      low: Math.round(day.temp_min),
      precipitation: day.precipitation,
    }))
  };
}

/**
 * Convert WMO weather codes to human-readable descriptions
 */
function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy with rime',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return weatherCodes[code] || 'Unknown weather';
}