🌦️ cf_ai_weathering_for_you – Trip Weather Planner

Frontend: https://878615ad.trip-weather-planner.pages.dev

Backend (API): https://cf-ai-weathering-for-you.haozeliu.workers.dev

## 🖼 Screenshots

**Landing Page**  
![Landing Page](./Screenshot%202025-11-03%20143248.png)

**Weather Forecast View**  
![Forecast View](./Screenshot%202025-11-03%20143436.png)

**Packing List (AI Generated)**  
![Packing List](./Screenshot%202025-11-03%20143446.png)

✨ Overview

Trip Weather Planner is an AI-powered web app that helps travelers plan their trips with:

Multi-day weather forecasts

AI-generated summaries

Smart packing lists

It’s built entirely on Cloudflare Workers AI (Llama 3.3) and Open-Meteo APIs, deployed using Cloudflare Pages + Workers

⚡ Workflow

User Input (Frontend)
The user enters a location and trip length (1–10 days) on the web app.

Backend (Cloudflare Worker)

Converts the location into latitude and longitude via the Open-Meteo Geocoding API

Retrieves a multi-day weather forecast

Sends a structured prompt to Cloudflare Workers AI (Llama 3.3)

Receives and returns an AI-generated trip summary and packing list, with rule-based fallback if AI fails

AI Response (Frontend)
Displays the weather summary, daily forecast cards, and an interactive packing checklist.

🚀 Deployment
Prerequisites

Cloudflare account

Wrangler CLI

Node 18+

Steps
# Clone
git clone https://github.com/HudsonLiuHCL/cf_ai_weathering_for_you.git

cd cf_ai_weathering_for_you

# Login
wrangler login

wrangler ai enable

# Deploy backend Worker
wrangler deploy

# Deploy frontend
wrangler pages deploy frontend --project-name=trip-weather-planner

🧩 API Example

Endpoint:
POST https://cf-ai-weathering-for-you.haozeliu.workers.dev/trip-weather

Body:

{ "location": "Austin, TX", "days": 7 }


Response:

{
  "location": "Austin",
  "days": 7,
  "summary": "Warm and sunny trip ahead with mild evenings.",
  "packingList": ["T-shirts", "Sunscreen", "Light jacket"],
  "dailyForecast": [
    { "date": "2025-11-04", "condition": "Clear sky", "high": 78, "low": 49 }
  ]
}




🧾 Tech Stack

Cloudflare Workers AI – Llama 3.3 70B for reasoning & generation

Open-Meteo API – Weather & geocoding data

Cloudflare Pages – Frontend hosting

Wrangler CLI – Deployment automation

HTML + CSS + JS – Simple, responsive UI

🧑‍💻 Author & AI Assistance

This project was partially AI-assisted.
Prompts used are documented in PROMPTS.md
.