// PC Guide - Frontend JavaScript

// Global state
let allResults = [];
let currentFilter = "all";

// DOM elements
let searchBtn = document.getElementById("searchBtn");
let componentTypeSelect = document.getElementById("componentType");
let brandSelect = document.getElementById("brand");
let modelInput = document.getElementById("model");
let resultsSection = document.getElementById("resultsSection");
let loadingSection = document.getElementById("loadingSection");
let resultsGrid = document.getElementById("resultsGrid");
let filterBtns = document.querySelectorAll(".filter-btn");

// Navigation elements
let navLinks = document.querySelectorAll(".nav-link");
let contentSections = document.querySelectorAll(".content-section");

// Event listeners
searchBtn.addEventListener("click", handleSearch);
filterBtns.forEach(btn => btn.addEventListener("click", handleFilter));

// Navigation functionality
navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    let targetSection = link.dataset.section;
    
    // Update active nav link
    navLinks.forEach(navLink => navLink.classList.remove("active"));
    link.classList.add("active");
    
    // Show target section
    contentSections.forEach(section => {
      section.classList.remove("active");
      if (section.id === `${targetSection}-section`) {
        section.classList.add("active");
      }
    });
  });
});

// Handle search button click
async function handleSearch() {
  let componentType = componentTypeSelect.value;
  let brand = brandSelect.value;
  let model = modelInput.value.trim();

  // Validate required inputs
  if (!componentType || !brand) {
    showError("Please select both component type and brand");
    return;
  }

  // Show loading state
  setLoadingState(true);
  hideResults();
  hideError();

  try {
    // Build query parameters
    let params = new URLSearchParams({
      componentType,
      brand,
      ...(model && { model })
    });

    // Make API call
    let response = await fetch(`/api/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Display results
    allResults = [...data.videos, ...data.manuals];
    displayResults(allResults);
    showResults();

  } catch (error) {
    console.error("Search error:", error);
    showError(`Search failed: ${error.message}`);
  } finally {
    setLoadingState(false);
  }
}

// Display search results in cards
function displayResults(results) {
  if (results.length === 0) {
    resultsGrid.innerHTML = `
      <div class="no-results">
        <h3>No results found</h3>
        <p>Try adjusting your search criteria or check your spelling.</p>
      </div>
    `;
    return;
  }

  // Generate cards HTML
  let cardsHTML = "";
  for (let i = 0; i < results.length; i++) {
    cardsHTML += createResultCard(results[i]);
  }
  resultsGrid.innerHTML = cardsHTML;

  // Add click handlers to cards
  let cards = document.querySelectorAll(".result-card");
  for (let i = 0; i < cards.length; i++) {
    cards[i].addEventListener("click", () => {
      let url = cards[i].dataset.url;
      if (url) {
        window.open(url, "_blank");
      }
    });
  }
}

// Create HTML for a single result card
function createResultCard(result) {
  let typeIcon = getTypeIcon(result.type);
  let typeClass = result.type;
  let sourceText = result.source || "Unknown";
  
  let additionalInfo = "";
  
  // Add video-specific information
  if (result.type === "video") {
    if (result.duration && result.duration !== "Unknown") {
      additionalInfo += `<div class="card-info">⏱️ ${result.duration}</div>`;
    }
    if (result.viewCount && result.viewCount !== "Unknown") {
      additionalInfo += `<div class="card-info">👁️ ${result.viewCount} views</div>`;
    }
    if (result.channelTitle) {
      additionalInfo += `<div class="card-info">📺 ${result.channelTitle}</div>`;
    }
  }

  return `
    <div class="result-card" data-url="${result.url}">
      <div class="card-header">
        <div class="card-title">${result.title}</div>
        <span class="card-type ${typeClass}">${typeIcon} ${result.type}</span>
      </div>
      ${result.description ? `<div class="card-description">${result.description}</div>` : ""}
      <div class="card-source">Source: ${sourceText}</div>
      ${additionalInfo}
      <a href="${result.url}" class="card-link" target="_blank" onclick="event.stopPropagation()">
        🔗 Open ${result.type === "video" ? "Video" : "Link"}
      </a>
    </div>
  `;
}

// Get emoji icon for content type
function getTypeIcon(type) {
  switch (type) {
    case "video": return "🎥";
    case "forum": return "💬";
    default: return "📄";
  }
}

// Handle filter button clicks
function handleFilter(event) {
  let filter = event.target.dataset.filter;
  
  // Update active filter button
  for (let i = 0; i < filterBtns.length; i++) {
    filterBtns[i].classList.remove("active");
  }
  event.target.classList.add("active");
  
  currentFilter = filter;
  
  // Filter results based on type
  let filteredResults = [];
  if (filter === "all") {
    filteredResults = allResults;
  } else {
    for (let i = 0; i < allResults.length; i++) {
      if (allResults[i].type === filter) {
        filteredResults.push(allResults[i]);
      }
    }
  }
  
  displayResults(filteredResults);
}

// Set loading state for search button and loading section
function setLoadingState(isLoading) {
  let btnText = searchBtn.querySelector(".btn-text");
  let spinner = searchBtn.querySelector(".loading-spinner");
  
  if (isLoading) {
    searchBtn.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "inline";
    loadingSection.style.display = "block";
  } else {
    searchBtn.disabled = false;
    btnText.style.display = "inline";
    spinner.style.display = "none";
    loadingSection.style.display = "none";
  }
}

// Show/hide results section
function showResults() {
  resultsSection.style.display = "block";
}

function hideResults() {
  resultsSection.style.display = "none";
}

// Display error message as a toast notification
function showError(message) {
  hideError();
  
  let errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `
    <div class="error-content">
      <span class="error-icon">⚠️</span>
      <span class="error-text">${message}</span>
      <button class="error-close" onclick="hideError()">×</button>
    </div>
  `;
  
  // Style the error message
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ffebee;
    color: #d32f2f;
    padding: 15px 20px;
    border-radius: 10px;
    border: 2px solid #d32f2f;
    z-index: 1000;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  
  document.body.appendChild(errorDiv);
  
  // Auto-hide after 5 seconds
  setTimeout(hideError, 5000);
}

// Hide error message
function hideError() {
  let existingError = document.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }
}

// CSS styles for error messages and additional UI elements
let errorStyles = `
  .error-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .error-icon {
    font-size: 1.2em;
  }
  
  .error-text {
    flex: 1;
    font-weight: 500;
  }
  
  .error-close {
    background: none;
    border: none;
    color: #d32f2f;
    font-size: 1.5em;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .error-close:hover {
    background: rgba(211, 50, 47, 0.1);
    border-radius: 50%;
  }
  
  .no-results {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    color: #666;
  }
  
  .no-results h3 {
    margin-bottom: 10px;
    color: #333;
  }
  
  .card-description {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 15px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .card-info {
    color: #666;
    font-size: 0.85rem;
    margin-bottom: 5px;
  }
`;

// Inject error styles into document head
let styleSheet = document.createElement("style");
styleSheet.textContent = errorStyles;
document.head.appendChild(styleSheet);

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("PC Guide initialized");
  
  // Add helpful placeholder text for model input
  modelInput.addEventListener("focus", () => {
    if (!modelInput.value) {
      modelInput.placeholder = "e.g., Ryzen 5 5600X, RTX 4070, 850W...";
    }
  });
  
  modelInput.addEventListener("blur", () => {
    if (!modelInput.value) {
      modelInput.placeholder = "e.g., Ryzen 5 5600X, RTX 4070...";
    }
  });
}); 