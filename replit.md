# Caza del Tesoro - Treasure Hunt Game

## Overview
This is an interactive treasure hunt game built entirely with HTML only. No CSS or JavaScript - the interactivity is achieved through internal links and native HTML elements like `<details>` tags.

**Language:** Spanish  
**Created by:** L3HO  
**Purpose:** Educational HTML game demonstrating interactive web experiences using pure HTML

## Project Structure
```
.
├── index.html       # Main game file with all interactive sections
├── server.py        # Python HTTP server to serve the static HTML
├── README.md        # Simple project readme
└── replit.md        # This file
```

## How It Works
- The game uses anchor links (`#section-id`) to navigate between different story sections
- Players make choices by clicking links that take them to different parts of the page
- Hints are revealed using `<details>` and `<summary>` HTML elements
- The game tracks progress through the player's journey via URL fragments

## Game Features
- Multiple story paths (Beach, Forest, Abandoned Village)
- Interactive puzzles and riddles
- Hidden clues that can be revealed
- Various endings based on player choices
- Complete narrative loop with restart functionality

## Technical Setup
- **Server:** Python 3.11 with built-in HTTP server
- **Port:** 5000 (configured for Replit webview)
- **Cache Control:** Disabled for proper iframe rendering in Replit
- **Deployment:** Configured for autoscale deployment

## Running Locally
The workflow is already configured. The game runs automatically via the web-server workflow which starts `python server.py` on port 5000.

## Deployment
The project is configured for Replit's autoscale deployment, which is ideal for this stateless static website. To publish:
1. Click the "Deploy" button in Replit
2. The game will be available at your deployment URL

## Recent Changes
- **2025-11-14:** Initial project import and setup for Replit environment
  - Renamed Index.html to index.html (lowercase) for standard web server compatibility
  - Created Python HTTP server with cache control disabled for Replit iframe
  - Configured workflow on port 5000 with webview output
  - Set up deployment configuration for autoscale
