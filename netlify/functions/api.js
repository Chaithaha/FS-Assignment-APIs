import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import serverless from "serverless-http";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || "3000";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cors({
  origin: "*"
}));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../../public")));

app.get("/api/search", async (request, response) => {
  try {
    let componentType = request.query.componentType;
    let brand = request.query.brand;
    let model = request.query.model;

    if (!componentType || !brand) {
      return response.status(400).json({
        error: "Component type and brand are required"
      });
    }

    let searchQuery = model 
      ? brand + " " + model + " " + componentType + " installation guide manual"
      : brand + " " + componentType + " installation guide manual";

    console.log("Searching for: " + searchQuery);

    let youtubeResults = await searchYouTube(searchQuery);
    let redditResults = await searchReddit(searchQuery);

    let results = {
      videos: youtubeResults,
      manuals: redditResults,
      query: searchQuery,
      timestamp: new Date().toISOString()
    };

    response.json(results);

  } catch (error) {
    console.error("Search error:", error);
    response.status(500).json({
      error: "Failed to search for manuals"
    });
  }
});

async function searchYouTube(query) {
  let YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  try {
    let searchParams = {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 10,
      order: "relevance",
      videoDuration: "medium",
      publishedAfter: "2020-01-01T00:00:00Z",
      key: YOUTUBE_API_KEY
    };

    let response = await axios.get("https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams(searchParams));
    let data = response.data;
    
    if (!data.items) {
      return [];
    }

    let videoIds = data.items.map(item => item.id.videoId);
    let videoDetails = await getYouTubeVideoDetails(videoIds);

    return data.items.map((item, index) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : item.snippet.thumbnails.default.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      url: "https://www.youtube.com/watch?v=" + item.id.videoId,
      type: "video",
      source: "YouTube",
      duration: videoDetails[index] ? videoDetails[index].duration : "Unknown",
      viewCount: videoDetails[index] ? videoDetails[index].viewCount : "Unknown"
    }));

  } catch (error) {
    console.error("YouTube API error:", error);
    return [];
  }
}

async function getYouTubeVideoDetails(videoIds) {
  if (!videoIds.length) return [];

  try {
    let YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    let params = {
      part: "contentDetails,statistics",
      id: videoIds.join(","),
      key: YOUTUBE_API_KEY
    };

    let response = await axios.get("https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams(params));
    let data = response.data;

    return data.items.map(item => ({
      duration: formatDuration(item.contentDetails.duration),
      viewCount: formatNumber(item.statistics.viewCount)
    }));

  } catch (error) {
    console.error("YouTube video details error:", error);
    return videoIds.map(() => ({ duration: "Unknown", viewCount: "Unknown" }));
  }
}

async function searchReddit(query) {
  let REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
  let REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT;
  
  if (!REDDIT_CLIENT_ID) {
    return [];
  }

  try {
    let subreddits = [
      "buildapc",
      "pcmasterrace", 
      "techsupport",
      "hardware",
      "AMD",
      "intel",
      "nvidia"
    ];

    let allResults = [];

    for (let subreddit of subreddits) {
      let searchUrl = "https://www.reddit.com/r/" + subreddit + "/search.json?q=" + encodeURIComponent(query) + "&restrict_sr=on&sort=relevance&t=year&limit=5";
      
      let response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': REDDIT_USER_AGENT || 'PCManualFinder/1.0'
        }
      });

      if (response.status === 200) {
        let data = response.data;
        
        if (data.data && data.data.children) {
          let posts = data.data.children.map(post => ({
            id: post.data.id,
            title: post.data.title,
            description: post.data.selftext.substring(0, 200) + "...",
            url: "https://reddit.com" + post.data.permalink,
            type: "forum",
            source: "Reddit",
            thumbnail: post.data.thumbnail !== "self" ? post.data.thumbnail : null,
            score: post.data.score,
            comments: post.data.num_comments,
            subreddit: post.data.subreddit,
            created: new Date(post.data.created_utc * 1000).toLocaleDateString()
          }));
          
          allResults = allResults.concat(posts);
        }
      }
    }

    allResults.sort((a, b) => (b.score + b.comments) - (a.score + a.comments));
    
    return allResults.slice(0, 10);

  } catch (error) {
    console.error("Reddit API error:", error);
    return [];
  }
}

function formatDuration(duration) {
  let match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  let hours = (match[1] || "").replace("H", "");
  let minutes = (match[2] || "").replace("M", "");
  let seconds = (match[3] || "").replace("S", "");
  
  let result = "";
  if (hours) result += hours + ":";
  result += minutes.padStart(2, "0") + ":";
  result += seconds.padStart(2, "0");
  
  return result;
}

function formatNumber(num) {
  if (!num) return "Unknown";
  return parseInt(num).toLocaleString();
}

// Serve the main page
app.get("/", (request, response) => {
  response.sendFile(path.join(__dirname, "../../public", "index.html"));
});

// Export the serverless handler
export const handler = serverless(app);
