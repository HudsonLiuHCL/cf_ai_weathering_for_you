🌦️ cf_ai_weathering_for_you – Trip Weather Planner

Frontend: https://878615ad.trip-weather-planner.pages.dev

Backend (API): https://cf-ai-weathering-for-you.haozeliu.workers.dev

✨ Overview

Trip Weather Planner is an AI-powered web app that helps travelers plan their trips with:

Multi-day weather forecasts

AI-generated summaries

Smart packing lists

It’s built entirely on Cloudflare Workers AI (Llama 3.3) and Open-Meteo APIs, deployed using Cloudflare Pages + Workers.

🧠 Features
Feature	Description
🤖 AI Integration	Uses @cf/meta/llama-3.3-70b-instruct to summarize forecasts & suggest packing items
🌤 Real Weather Data	Fetches daily forecasts from Open-Meteo
🧳 Smart Packing	AI adapts suggestions to temperature, wind, rain, or snow
🗺 Geocoding	Supports city names or ZIP codes (via Open-Meteo Geocoding API)
⚙️ Edge Deployment	Runs globally on Cloudflare’s network with instant scaling
⚡ Workflow

User Input (Frontend)
The user enters a location and trip length (1–10 days).

Backend (Worker)

Geocodes the location

Fetches a multi-day forecast

Sends a formatted prompt to Cloudflare Workers AI

Returns an AI summary + packing list (with fallback logic if AI fails)

AI Response (Frontend)
Displays a weather overview, daily cards, and an interactive packing list.

🚀 Deployment
Prerequisites

Cloudflare account

Wrangler CLI

Node 18+

Steps
# Clone
git clone https://github.com/yourname/cf_ai_weathering_for_you
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

🖼 Screenshots

Landing Page


Weather Forecast View


Packing List (AI-Generated)


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