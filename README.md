# Positron

## What it is

Positron is a personal AI chat client. It is BYOK (bring your own key): the browser talks directly to
OpenRouter with your own API key. There is no backend, no environment variables and no serverless
functions. Your key and chat history are stored only in your browser's localStorage — this is meant
for personal use, not for shared or multi-user deployments.

## How to use

1. Open the app.
2. Click **Settings**.
3. Paste your OpenRouter API key (get one at https://openrouter.ai/keys).
4. Pick a model (default `openrouter/free`; e.g. `anthropic/claude-3.5-sonnet`, `openai/gpt-4o`).
5. Save, then start chatting. Enter sends, Shift+Enter adds a newline. **+ New** clears the thread.

## Deploy

This project is hosted on Lovable — hit Publish to deploy. To deploy your own copy, connect the
GitHub repo and build with any static host (Netlify, Cloudflare Pages, GitHub Pages, Vercel).
No environment variables needed.
