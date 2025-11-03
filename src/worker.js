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
        JSON.stringify({ status: 'ok', message: 'Weather AI Worker is running' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Main weather endpoint
    if (url.pathname === '/weather' && request.method === 'POST') {
      try {
        const { location } = await request.json();

        if (!location || location.trim() === '') {
          return new Response(
            JSON.stringify({ error: 'Location is required' }),
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

        // Step 2: Fetch weather data
        const weatherData = await fetchWeather(geoData.latitude, geoData.longitude);
        if (!weatherData) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch weather data' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Step 3: Generate AI response
        const aiResponse = await generateWeatherReport(
          env,
          geoData.name,
          weatherData
        );

        return new Response(
          JSON.stringify(aiResponse),
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
 * Fetch current weather from Open-Meteo Weather API
 */
async function fetchWeather(lat, lon) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,windspeed_10m,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`;
  
  try {
    const response = await fetch(weatherUrl);
    const data = await response.json();

    if (data.current) {
      return {
        temperature: data.current.temperature_2m,
        windspeed: data.current.windspeed_10m,
        weathercode: data.current.weathercode,
      };
    }
    return null;
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

/**
 * Generate weather summary and outfit recommendation using Llama 3.3 via Workers AI
 */
async function generateWeatherReport(env, locationName, weatherData) {
  const weatherDescription = getWeatherDescription(weatherData.weathercode);
  
  const prompt = `You are a friendly personal weather assistant.
Given today's weather data, provide a brief summary and suggest an appropriate outfit.

Location: ${locationName}
Temperature: ${weatherData.temperature}°F
Wind Speed: ${weatherData.windspeed} mph
Weather Condition: ${weatherDescription}

Provide your response in exactly this format:
Summary: [One sentence about the weather]
Outfit: [One sentence suggesting what to wear]

Keep it concise and friendly.`;

  try {
    const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: 'You are a helpful weather assistant that provides concise weather summaries and outfit recommendations.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    // Parse the AI response
    const aiText = response.response || '';
    const lines = aiText.split('\n').filter(line => line.trim());
    
    let summary = '';
    let outfit = '';
    
    for (const line of lines) {
      if (line.toLowerCase().startsWith('summary:')) {
        summary = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().startsWith('outfit:')) {
        outfit = line.substring(line.indexOf(':') + 1).trim();
      }
    }

    // Fallback if parsing fails
    if (!summary || !outfit) {
      summary = `${weatherDescription} with temperatures around ${weatherData.temperature}°F and winds at ${weatherData.windspeed} mph.`;
      outfit = getDefaultOutfitSuggestion(weatherData.temperature, weatherData.weathercode);
    }

    return { summary, outfit };
  } catch (error) {
    console.error('AI generation error:', error);
    // Fallback response
    return {
      summary: `${weatherDescription} with temperatures around ${weatherData.temperature}°F and winds at ${weatherData.windspeed} mph.`,
      outfit: getDefaultOutfitSuggestion(weatherData.temperature, weatherData.weathercode),
    };
  }
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

/**
 * Provide a default outfit suggestion based on temperature and weather code
 */
function getDefaultOutfitSuggestion(temp, code) {
  let suggestion = '';
  
  if (temp < 32) {
    suggestion = 'Heavy coat, warm layers, gloves, and a hat';
  } else if (temp < 50) {
    suggestion = 'Jacket or sweater, long pants';
  } else if (temp < 65) {
    suggestion = 'Light jacket or cardigan';
  } else if (temp < 75) {
    suggestion = 'T-shirt and jeans or light pants';
  } else {
    suggestion = 'T-shirt and shorts, stay cool!';
  }

  // Add weather-specific accessories
  if (code >= 61 && code <= 82) {
    suggestion += ' — bring an umbrella';
  } else if (code >= 71 && code <= 86) {
    suggestion += ' — snow boots recommended';
  } else if (code <= 1) {
    suggestion += ' — bring sunglasses';
  }

  return suggestion;
}