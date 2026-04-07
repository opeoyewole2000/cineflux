# CineFlux 🎬

A cinematic movie streaming app built with React + Vite, TMDB, and Trakt.

## Features
- Browse trending, top rated, and new movies via TMDB
- Continue watching with progress bars per profile
- Watchlist and star ratings
- Up to 5 user profiles (stored locally)
- Trakt OAuth integration for watch history sync
- Search with live results

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up your API keys

Copy the example env file:
```bash
cp .env.example .env
```

Then fill in your keys:

**TMDB** (free):
1. Go to https://www.themoviedb.org/settings/api
2. Sign up and request an API key
3. Paste it as `VITE_TMDB_API_KEY`

**Trakt** (free):
1. Go to https://trakt.tv/oauth/applications/new
2. Create a new app — set Redirect URI to `http://localhost:5173/trakt/callback`
3. Paste Client ID and Secret into `.env`

### 3. Run locally
```bash
npm run dev
```

Open http://localhost:5173

## Deploy to Vercel (free)

1. Push this folder to a GitHub repo
2. Go to https://vercel.com and import the repo
3. Add your environment variables in the Vercel dashboard
4. Update `VITE_TRAKT_REDIRECT_URI` to your Vercel URL (e.g. `https://cineflux.vercel.app/trakt/callback`)
5. Also update the redirect URI in your Trakt app settings to match

## Project Structure

```
src/
  api/          # TMDB + Trakt API helpers
  components/   # Reusable UI (Layout, MovieCard, MovieModal)
  context/      # Global state (profiles, watchlist, ratings, progress)
  hooks/        # Custom React hooks
  pages/        # Route pages (Home, Browse, Watchlist, Account)
  styles/       # Global CSS
```

## Tech Stack
- React 18 + Vite
- React Router v6
- TMDB API (movie data + images)
- Trakt API (watch history OAuth)
- CSS Modules
- localStorage (profiles + user data)
