# AI Prompts for Weathering For You

## Main Weather Assistant Prompt

This is the core prompt template used to generate weather summaries and outfit recommendations with Llama 3.3 via Cloudflare Workers AI.

### System Prompt
You are a helpful weather assistant that provides concise weather summaries and outfit recommendations.

### User Prompt Template
You are a friendly personal weather assistant.
Given today's weather data, provide a brief summary and suggest an appropriate outfit.
Location: {locationName}
Temperature: {temperature}°F
Wind Speed: {windspeed} mph
Weather Condition: {weatherDescription}
Provide your response in exactly this format:
Summary: [One sentence about the weather]
Outfit: [One sentence suggesting what to wear]
Keep it concise and friendly.

### Template Variables

- **{locationName}**: The name of the city/location (e.g., "San Francisco")
- **{temperature}**: Current temperature in Fahrenheit
- **{windspeed}**: Current wind speed in mph
- **{weatherDescription}**: Human-readable weather condition (e.g., "Clear sky", "Moderate rain")

### Model Configuration
```javascript
{
  model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  max_tokens: 150,
  temperature: 0.7
}
```

### Expected Output Format
Summary: Sunny with highs around 78°F and light winds at 5 mph.
Outfit: T-shirt and shorts — bring sunglasses!

### Fallback Logic

If the AI response cannot be parsed or fails, the application uses rule-based fallback logic:

1. **Weather Summary**: Combines weather description, temperature, and wind speed
2. **Outfit Suggestion**: Based on temperature ranges:
   - < 32°F: Heavy coat, warm layers, gloves, and hat
   - 32-50°F: Jacket or sweater, long pants
   - 50-65°F: Light jacket or cardigan
   - 65-75°F: T-shirt and jeans or light pants
   - > 75°F: T-shirt and shorts

Additional accessories are suggested based on weather codes:
- Rain (61-82): "bring an umbrella"
- Snow (71-86): "snow boots recommended"
- Clear sky (0-1): "bring sunglasses"

## Weather Code Mappings

WMO Weather Codes used by Open-Meteo API:

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45, 48 | Foggy |
| 51, 53, 55 | Drizzle (light to dense) |
| 61, 63, 65 | Rain (slight to heavy) |
| 71, 73, 75 | Snow (slight to heavy) |
| 80, 81, 82 | Rain showers |
| 85, 86 | Snow showers |
| 95 | Thunderstorm |
| 96, 99 | Thunderstorm with hail |

## Prompt Engineering Notes

### Why This Prompt Works

1. **Clear Role Definition**: "friendly personal weather assistant" sets the tone
2. **Structured Input**: Weather data is presented in a clean, labeled format
3. **Explicit Format Request**: Asking for "Summary:" and "Outfit:" labels makes parsing reliable
4. **Constraint Setting**: "Keep it concise and friendly" prevents verbose responses
5. **Temperature Control**: 0.7 provides creative but consistent recommendations

### Tested Variations

**Original (Too Verbose)**:
Please analyze the following weather data and provide detailed insights...
❌ Resulted in 3-4 sentence responses that were too long

**Current (Optimal)**:
Provide your response in exactly this format:
Summary: [One sentence about the weather]
Outfit: [One sentence suggesting what to wear]
✅ Consistently produces concise, parseable responses

### Future Improvements

- Add seasonal context (summer/winter clothing preferences)
- Include activity-based recommendations (e.g., "for outdoor activities...")
- Personalization based on user preferences stored in KV
- Multi-day forecast summaries