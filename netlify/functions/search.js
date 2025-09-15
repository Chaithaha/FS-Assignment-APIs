const axios = require("axios");

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  try {
    const { componentType, brand, model } = event.queryStringParameters || {};

    if (!componentType || !brand) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Component type and brand are required"
        }),
      };
    }

    let searchQuery = model 
      ? `${brand} ${model} ${componentType} installation guide manual`
      : `${brand} ${componentType} installation guide manual`;

    console.log("Searching for:", searchQuery);

    // Search YouTube
    let youtubeResults = await searchYouTube(searchQuery);
    
    // Search Reddit
    let redditResults = await searchReddit(searchQuery);

    let results = {
      videos: youtubeResults,
      manuals: redditResults,
      query: searchQuery,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results),
    };

  } catch (error) {
    console.error("Search error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to search for manuals"
      }),
    };
  }
};

async function searchYouTube(query) {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
  
  if (!YOUTUBE_API_KEY) {
    return [];
  }

  try {
    const searchParams = {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: 10,
      order: "relevance",
      videoDuration: "medium",
      publishedAfter: "2020-01-01T00:00:00Z",
      key: YOUTUBE_API_KEY
    };

    const response = await axios.get("https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams(searchParams));
    const data = response.data;
    
    if (!data.items) {
      return [];
    }

    const videoIds = data.items.map(item => item.id.videoId);
    const videoDetails = await getYouTubeVideoDetails(videoIds);

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
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    const params = {
      part: "contentDetails,statistics",
      id: videoIds.join(","),
      key: YOUTUBE_API_KEY
    };

    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos?" + new URLSearchParams(params));
    const data = response.data;

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
  try {
    // Use a simpler Reddit search approach
    const subreddits = ["buildapc", "pcmasterrace", "techsupport"];
    let allResults = [];

    for (let subreddit of subreddits) {
      try {
        // Use the hot.json endpoint instead of search.json for better reliability
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`, {
          headers: {
            'User-Agent': 'PCManualFinder/1.0 (by /u/yourusername)',
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        if (response.status === 200 && response.data.data && response.data.data.children) {
          // Filter posts that contain keywords from our query
          const queryWords = query.toLowerCase().split(' ');
          const relevantPosts = response.data.data.children.filter(post => {
            const title = post.data.title.toLowerCase();
            const selftext = (post.data.selftext || '').toLowerCase();
            return queryWords.some(word => title.includes(word) || selftext.includes(word));
          });

          const posts = relevantPosts.slice(0, 3).map(post => ({
            id: post.data.id,
            title: post.data.title,
            description: (post.data.selftext || '').substring(0, 200) + "...",
            url: "https://reddit.com" + post.data.permalink,
            type: "forum",
            source: "Reddit",
            thumbnail: post.data.thumbnail !== "self" && post.data.thumbnail !== "default" ? post.data.thumbnail : null,
            score: post.data.score,
            comments: post.data.num_comments,
            subreddit: post.data.subreddit,
            created: new Date(post.data.created_utc * 1000).toLocaleDateString()
          }));
          
          allResults = allResults.concat(posts);
        }
      } catch (error) {
        console.error(`Reddit API error for ${subreddit}:`, error.message);
        // Continue with other subreddits even if one fails
      }
    }

    // If no relevant posts found, return some general posts
    if (allResults.length === 0) {
      try {
        const response = await axios.get('https://www.reddit.com/r/buildapc/hot.json?limit=5', {
          headers: {
            'User-Agent': 'PCManualFinder/1.0 (by /u/yourusername)',
            'Accept': 'application/json'
          },
          timeout: 5000
        });

        if (response.status === 200 && response.data.data && response.data.data.children) {
          allResults = response.data.data.children.slice(0, 3).map(post => ({
            id: post.data.id,
            title: post.data.title,
            description: (post.data.selftext || '').substring(0, 200) + "...",
            url: "https://reddit.com" + post.data.permalink,
            type: "forum",
            source: "Reddit",
            thumbnail: post.data.thumbnail !== "self" && post.data.thumbnail !== "default" ? post.data.thumbnail : null,
            score: post.data.score,
            comments: post.data.num_comments,
            subreddit: post.data.subreddit,
            created: new Date(post.data.created_utc * 1000).toLocaleDateString()
          }));
        }
      } catch (error) {
        console.error("Fallback Reddit API error:", error.message);
      }
    }

    allResults.sort((a, b) => (b.score + b.comments) - (a.score + a.comments));
    
    return allResults.slice(0, 8);

  } catch (error) {
    console.error("Reddit API error:", error);
    return [];
  }
}

function formatDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = (match[1] || "").replace("H", "");
  const minutes = (match[2] || "").replace("M", "");
  const seconds = (match[3] || "").replace("S", "");
  
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
