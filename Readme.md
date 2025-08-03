# PC Guide - Component Finder

A web application that helps PC builders find installation guides and tutorials for their specific hardware components. Built with Node.js and Express on the backend, and vanilla JavaScript on the frontend, this tool searches both YouTube and Reddit to provide users with relevant video tutorials and community discussions for their PC parts.

The application features a clean, intuitive interface where users can select their component type (CPU, GPU, RAM, etc.), choose their brand (AMD, Intel, NVIDIA, etc.), and optionally specify their exact model. The search results include YouTube videos with duration and view count information, as well as Reddit posts from relevant PC building communities. The tool is particularly useful for first-time builders who need step-by-step guidance for installing specific components in their systems.

## Features

- **Component Search**: Search by component type, brand, and model
- **Video Integration**: Find YouTube tutorials with duration and view data
- **Community Resources**: Access Reddit discussions from PC building communities
- **Filter Results**: Filter between videos and forum posts
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Search**: Instant results from multiple sources

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **APIs**: YouTube Data API v3, Reddit API
- **Styling**: Custom CSS with responsive design

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - `YOUTUBE_API_KEY`: Your YouTube Data API key
   - `REDDIT_CLIENT_ID`: Your Reddit API client ID
   - `REDDIT_USER_AGENT`: Your Reddit user agent string
4. Run the server: `npm start`
5. Open `http://localhost:3000` in your browser

## Usage

1. Navigate to the "The Tool" section
2. Select your component type from the dropdown
3. Choose your brand
4. Optionally enter your specific model
5. Click "Search Guides" to find relevant tutorials and discussions
6. Use the filter buttons to view only videos or forum posts
7. Click on any result to open it in a new tab 