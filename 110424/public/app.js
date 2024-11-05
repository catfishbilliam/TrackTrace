let rawData = {}; 

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/analyze");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        rawData = await response.json(); 
        console.log("Fetched raw data:", rawData); 

        updateText(); 
    } catch (error) {
        console.error("Error fetching analysis data:", error);
        alert("Failed to fetch analysis data. Please check the server.");
    }
});

// Update text function
function updateText() {
    const selectedValue = document.getElementById("dataComparison").value;
    const mainContainer = document.getElementById("mainContainer");
    const chartContainer = document.getElementById("chartContainer");
    
    console.log("Selected value:", selectedValue);
    console.log("Raw data:", rawData);
    
    mainContainer.innerHTML = ""; // Clear previous content
    chartContainer.innerHTML = ""; // Clear previous chart

    // Ensure rawData is an array and has data
    if (!Array.isArray(rawData) || rawData.length === 0) {
        mainContainer.innerHTML = "<p>No data available. Please refresh or check your data source.</p>";
        return; // Exit if there's no data
    }

    // Dynamically create containers and sections based on selected value
    switch (selectedValue) {
        case "monthlyTrends":
            const monthlyTrends = calculateMonthlyTrends(rawData);
            renderMonthlyTrends(monthlyTrends);
            renderTopArtistsChart(calculateTopArtists(monthlyTrends));
            break;
        case "popularityOverTime":
            const { sortedTracks, trackPopularity } = calculateTrackPopularityOverTime(rawData);
            renderTopTracksChart(sortedTracks);
            renderTrackPopularityOverTime(trackPopularity);
            break;
        case "contentTrends":
            const contentTrends = calculateContentTrends(rawData);
            renderContentTrends(contentTrends);
            renderContentTrendsChart(
                Object.keys(contentTrends),
                Object.values(contentTrends).map(year => year.Music / (1000 * 60 * 60)),
                Object.values(contentTrends).map(year => year.Podcast / (1000 * 60 * 60))
            );
            break;
        case "timeOfDay":
            const timeOfDayData = calculateTimeOfDay(rawData);
            renderTimeOfDay(timeOfDayData);
            renderTimeOfDayChart(timeOfDayData.yearlyTotals);
            break;
        case "summary":
            const summaryData = calculateSummary(rawData);
            renderSummary(summaryData);
            break;
        default:
            mainContainer.innerHTML = "<p>Select a data type to display analysis.</p>";
            chartContainer.innerHTML = ""; // Clear chart when no selection
            break;
    }

    initializeCollapsible();
}

// Initialize collapsible functionality
function initializeCollapsible() {
    // Toggle container content
    document.querySelectorAll('.container-heading').forEach(function(containerHeading) {
        containerHeading.addEventListener('click', function() {
            const containerContent = this.nextElementSibling;
            containerContent.style.display = containerContent.style.display === 'none' ? 'block' : 'none';
        });
    });

    // Toggle section content
    document.querySelectorAll('.section-heading').forEach(function(sectionHeading) {
        sectionHeading.addEventListener('click', function() {
            const sectionContent = this.nextElementSibling;
            sectionContent.style.display = sectionContent.style.display === 'none' ? 'block' : 'none';
        });
    });

    // Toggle year content
    document.querySelectorAll('.year-heading').forEach(function(yearHeading) {
        yearHeading.addEventListener('click', function() {
            const yearContent = this.nextElementSibling;
            yearContent.style.display = yearContent.style.display === 'none' ? 'block' : 'none';
        });
    });

    // Toggle season content
    document.querySelectorAll('.season-heading').forEach(function(seasonHeading) {
        seasonHeading.addEventListener('click', function() {
            const seasonContent = this.nextElementSibling;
            seasonContent.style.display = seasonContent.style.display === 'none' ? 'block' : 'none';
        });
    });
}

// Calculate monthly listening trends
function calculateMonthlyTrends(data) {
    const trends = {};

    data.forEach((entry) => {
        if (entry.master_metadata_album_artist_name) {
            const { year, season } = getYearMonthSeason(entry.ts);
            const artist = entry.master_metadata_album_artist_name;

            // Initialize structure if it doesn't exist
            if (!trends[year]) trends[year] = { Winter: {}, Spring: {}, Summer: {}, Fall: {} };
            if (!trends[year][season][artist]) trends[year][season][artist] = 0;

            // Increment the listening time
            trends[year][season][artist] += entry.ms_played;
        }
    });

    console.log("Monthly Trends:", trends); // Log the monthly trends for debugging
    return trends;
}

// Calculate top artists and track their appearances
function calculateTopArtists(trends) {
    const artistData = {};

    // Aggregate listening time by artist across all seasons and years
    for (const year in trends) {
        for (const season in trends[year]) {
            for (const artist in trends[year][season]) {
                if (!artistData[artist]) {
                    artistData[artist] = Array(11).fill(0); // Fill with zeros for each year (2014 to 2024)
                }
                // Assuming year is a string like "2014", get index for artistData
                const yearIndex = parseInt(year) - 2014; // Adjust to start from 2014
                artistData[artist][yearIndex] += trends[year][season][artist];
            }
        }
    }

    // Sort artists by total listening time and take the top 5
    const sortedArtists = Object.entries(artistData)
        .map(([artist, data]) => ({
            artist,
            total: data.reduce((sum, current) => sum + current, 0),
            data,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    console.log("Top Artists:", sortedArtists); // Log the top artists for debugging
    return sortedArtists;
}

// Render chart for top artists over ten years
function renderTopArtistsChart(topArtists) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; // Clear any previous charts

    const canvas = document.createElement('canvas'); // Create a new canvas element
    chartContainer.appendChild(canvas); // Append it to the chartContainer

    const ctx = canvas.getContext('2d'); // Get the 2D context for the new canvas
    const labels = Array.from({ length: 11 }, (_, i) => 2014 + i); // Years from 2014 to 2024
    const datasets = topArtists.map(artist => ({
        label: artist.artist,
        data: artist.data.map(ms => ms / (1000 * 60 * 60)), // Convert ms to hours
        borderColor: getRandomColor(),
        fill: false,
    }));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets,
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top Artists Over the Years',
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)',
                    },
                },
            },
        },
    });
}

// Seasonal Trends by Year
function renderMonthlyTrends(trends) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Artists by Season per Year");

    const topArtists = calculateTopArtists(trends); 
    renderTopArtistsChart(topArtists); 

    for (const year in trends) {
        const yearContainer = document.createElement('div');
        yearContainer.className = 'year-container';

        const yearHeading = document.createElement('h2');
        yearHeading.className = 'year-heading';
        yearHeading.textContent = `${year}`;
        yearContainer.appendChild(yearHeading);

        const yearContent = document.createElement('div');
        yearContent.className = 'year-content';

        ["Winter", "Spring", "Summer", "Fall"].forEach((season) => {
            if (trends[year][season]) {
                const seasonContainer = document.createElement('div');
                seasonContainer.className = 'season-container';

                const seasonHeading = document.createElement('h3');
                seasonHeading.className = 'season-heading';
                seasonHeading.textContent = `${season}`;
                seasonContainer.appendChild(seasonHeading);

                const seasonContent = document.createElement('div');
                seasonContent.className = 'season-content';

                // Create an ordered list for the season
                const artistList = document.createElement("ol");
                const artistEntries = Object.entries(trends[year][season])
                    .sort(([, aTime], [, bTime]) => bTime - aTime)
                    .slice(0, 5);
                
                if (artistEntries.length === 0) {
                    const noDataMessage = document.createElement("li");
                    noDataMessage.innerText = "No data for this section.";
                    artistList.appendChild(noDataMessage);
                } else {
                    artistEntries.forEach(([artist, msPlayed]) => {
                        const artistItem = document.createElement("li");
                        artistItem.innerHTML = `<span class="artist-name">${artist}</span>: ${msToHoursMinutes(msPlayed)}`;
                        artistList.appendChild(artistItem);
                    });
                }

                seasonContent.appendChild(artistList);
                seasonContainer.appendChild(seasonContent);
                yearContent.appendChild(seasonContainer);
            }
        });

        yearContainer.appendChild(yearContent);
        container.appendChild(yearContainer);
    }

    mainContainer.appendChild(container);
}

// Render track popularity over time
function renderTrackPopularityOverTime(trackPopularity) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Tracks by Season per Year");

    for (const year in trackPopularity) {
        const yearContainer = document.createElement('div');
        yearContainer.className = 'year-container';

        const yearHeading = document.createElement('h2');
        yearHeading.className = 'year-heading';
        yearHeading.textContent = `${year}`;
        yearContainer.appendChild(yearHeading);

        const yearContent = document.createElement('div');
        yearContent.className = 'year-content';

        ["Winter", "Spring", "Summer", "Fall"].forEach((season) => {
            if (trackPopularity[year][season]) {
                const seasonContainer = document.createElement('div');
                seasonContainer.className = 'season-container';

                const seasonHeading = document.createElement('h3');
                seasonHeading.className = 'season-heading';
                seasonHeading.textContent = `${season}`;
                seasonContainer.appendChild(seasonHeading);

                const seasonContent = document.createElement('div');
                seasonContent.className = 'season-content';

                const trackList = document.createElement("ol");
                const trackEntries = Object.entries(trackPopularity[year][season])
                    .sort(([, aTime], [, bTime]) => bTime - aTime) 
                    .slice(0, 5);
                
                if (trackEntries.length === 0) {
                    const noDataMessage = document.createElement("li");
                    noDataMessage.innerText = "No data for this section.";
                    trackList.appendChild(noDataMessage);
                } else {
                    trackEntries.forEach(([trackWithArtist, msPlayed]) => {
                        const trackItem = document.createElement("li");
                        trackItem.innerHTML = `<span class="track-name">${trackWithArtist}</span>: ${msToHoursMinutes(msPlayed)}`;
                        trackList.appendChild(trackItem);
                    });
                }

                seasonContent.appendChild(trackList);
                seasonContainer.appendChild(seasonContent);
                yearContent.appendChild(seasonContainer);
            }
        });

        yearContainer.appendChild(yearContent);
        container.appendChild(yearContainer);
    }

    mainContainer.appendChild(container);
}

// Generate a random color for the chart
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Calculate top 10 tracks by total listening time over the years
function calculateTrackPopularityOverTime(data) {
    const trackData = {};
    const trackPopularity = {}; 

    console.log("Calculating track popularity over time..."); // Log the start of calculation

    data.forEach((entry) => {
        if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
            const { year, season } = getYearMonthSeason(entry.ts);
            const trackWithArtist = `${entry.master_metadata_track_name} by ${entry.master_metadata_album_artist_name}`;

            // Initialize trackData for years
            if (!trackData[trackWithArtist]) {
                trackData[trackWithArtist] = Array(11).fill(0); 
            }
            const yearIndex = year - 2014; 
            if (yearIndex >= 0 && yearIndex < trackData[trackWithArtist].length) {
                trackData[trackWithArtist][yearIndex] += entry.ms_played; 
            }

            // Initialize the track popularity structure for seasonal display
            if (!trackPopularity[year]) trackPopularity[year] = { Winter: {}, Spring: {}, Summer: {}, Fall: {} };
            if (!trackPopularity[year][season][trackWithArtist]) trackPopularity[year][season][trackWithArtist] = 0;
            trackPopularity[year][season][trackWithArtist] += entry.ms_played; 
        }
    });

    // Log track data and track popularity
    console.log("Track Data:", trackData); // Log track data
    console.log("Track Popularity:", trackPopularity); // Log track popularity data

    // Sort tracks by total listening time and take the top 10
    const sortedTracks = Object.entries(trackData)
        .map(([track, totals]) => ({
            track,
            totals: totals.map(ms => ms / (1000 * 60 * 60)), 
        }))
        .sort((a, b) => b.totals.reduce((sum, current) => sum + current, 0) - a.totals.reduce((sum, current) => sum + current, 0)) 
        .slice(0, 10); 

    console.log("Sorted Top Tracks:", sortedTracks); // Log the sorted top tracks

    return { sortedTracks, trackPopularity }; 
}

// Render chart for top tracks over time
function renderTopTracksChart(topTracks) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; 

    const canvas = document.createElement('canvas'); 
    chartContainer.appendChild(canvas); 

    const ctx = canvas.getContext('2d'); 
    const labels = Array.from({ length: 11 }, (_, i) => 2014 + i); 
    const datasets = topTracks.map(track => ({
        label: track.track,
        data: track.totals, 
        borderColor: getRandomColor(),
        fill: false,
    }));

    // Log datasets for debugging
    console.log("Top Tracks for Chart:", datasets); // Log datasets to be rendered

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels, 
            datasets: datasets, 
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top Songs Over Time', 
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)', 
                    },
                },
            },
        },
    });
}


// Calculate content trends by Music vs Podcasts
function calculateContentTrends(data) {
    const contentTrends = {};

    console.log("Calculating content trends..."); // Log the start of calculation

    data.forEach((entry) => {
        const { year } = getYearMonthSeason(entry.ts);
        const contentType = entry.episode_name ? "Podcast" : "Music";

        if (!contentTrends[year]) contentTrends[year] = { Music: 0, Podcast: 0 };
        contentTrends[year][contentType] += entry.ms_played;
    });

    // Log the totaled content trends for debugging
    console.log("Content Trends Totals:", contentTrends); 

    return contentTrends;
}

// Render content trends by yearly totals and create the chart
function renderContentTrends(contentTrends) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Music vs Podcasts by Year");

    const years = Object.keys(contentTrends);
    const musicData = years.map(year => contentTrends[year].Music / (1000 * 60 * 60)); 
    const podcastData = years.map(year => contentTrends[year].Podcast / (1000 * 60 * 60)); 

    console.log("Years for Chart:", years); // Log the years used for the chart
    console.log("Music Data for Chart:", musicData); // Log the music data for the chart
    console.log("Podcast Data for Chart:", podcastData); // Log the podcast data for the chart

    // Create the chart
    renderContentTrendsChart(years, musicData, podcastData);

    for (const year in contentTrends) {
        const yearContainer = document.createElement('div');
        yearContainer.className = 'year-container';

        const yearHeading = document.createElement('h2');
        yearHeading.className = 'year-heading';
        yearHeading.textContent = `${year}`;
        yearContainer.appendChild(yearHeading);

        const yearContent = document.createElement('div');
        yearContent.className = 'year-content';

        const yearData = contentTrends[year];

        // Create a paragraph for Music
        const musicItem = document.createElement("p");
        musicItem.innerHTML = `Music: <span class="music">${msToHoursMinutes(yearData.Music)}</span>`;
        yearContent.appendChild(musicItem);

        // Create a paragraph for Podcast
        const podcastItem = document.createElement("p");
        podcastItem.innerHTML = `Podcast: <span class="podcast">${msToHoursMinutes(yearData.Podcast)}</span>`;
        yearContent.appendChild(podcastItem);

        yearContainer.appendChild(yearContent);
        container.appendChild(yearContainer);
    }

    mainContainer.appendChild(container);
}

// Render chart for content trends (Music vs Podcasts)
function renderContentTrendsChart(years, musicData, podcastData) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; 

    const canvas = document.createElement('canvas'); 
    chartContainer.appendChild(canvas); 

    const ctx = canvas.getContext('2d'); 

    new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: years, 
            datasets: [
                {
                    label: 'Music',
                    data: musicData,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)', 
                },
                {
                    label: 'Podcast',
                    data: podcastData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Listening Time Comparison: Music vs Podcasts', 
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)', 
                    },
                },
            },
        },
    });
}


// Calculate listening time by time of day with overall, yearly, and seasonal totals
function calculateTimeOfDay(data) {
    const overallTotals = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    const yearlyTotals = {};

    console.log("Calculating listening time by time of day..."); // Log the start of calculation

    data.forEach((entry) => {
        const { year, season } = getYearMonthSeason(entry.ts);
        const hour = new Date(entry.ts).getHours();
        const period = getTimeOfDay(hour);

        overallTotals[period] += entry.ms_played;

        if (!yearlyTotals[year]) yearlyTotals[year] = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
        yearlyTotals[year][period] += entry.ms_played;

        if (!yearlyTotals[year][season]) yearlyTotals[year][season] = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
        yearlyTotals[year][season][period] += entry.ms_played;
    });

    // Log overall totals and yearly totals for debugging
    console.log("Overall Listening Time Totals:", overallTotals);
    console.log("Yearly Listening Time Totals:", yearlyTotals);

    return { overallTotals, yearlyTotals };
}

// Render time of day chart
function renderTimeOfDayChart(yearlyTotals) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; 

    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas); 

    const ctx = canvas.getContext('2d');

    const labels = Object.keys(yearlyTotals); 
    const dataMorning = Object.values(yearlyTotals).map(y => y.Morning / (1000 * 60 * 60)); 
    const dataAfternoon = Object.values(yearlyTotals).map(y => y.Afternoon / (1000 * 60 * 60));
    const dataEvening = Object.values(yearlyTotals).map(y => y.Evening / (1000 * 60 * 60));
    const dataNight = Object.values(yearlyTotals).map(y => y.Night / (1000 * 60 * 60));

    // Log the data prepared for the chart
    console.log("Time of Day Chart Data - Morning:", dataMorning);
    console.log("Time of Day Chart Data - Afternoon:", dataAfternoon);
    console.log("Time of Day Chart Data - Evening:", dataEvening);
    console.log("Time of Day Chart Data - Night:", dataNight);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Morning',
                    data: dataMorning,
                    borderColor: 'rgba(255, 206, 86, 1)',
                    fill: false,
                },
                {
                    label: 'Afternoon',
                    data: dataAfternoon,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                },
                {
                    label: 'Evening',
                    data: dataEvening,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    fill: false,
                },
                {
                    label: 'Night',
                    data: dataNight,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Listening Time by Time of Day',
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)',
                    },
                },
            },
        },
    });
}

// Render time of day listening data with collapsible sections
function renderTimeOfDay(timeOfDayData) {
    const mainContainer = document.getElementById("mainContainer");

    // Create a container for the overall totals and yearly data
    const timeOfDayContainer = document.createElement('div');
    timeOfDayContainer.className = 'time-of-day-container';

    // Overall Totals
    const overallData = {};
    Object.entries(timeOfDayData.overallTotals).forEach(([key, value]) => {
        overallData[key] = msToHoursMinutes(value);
    });

    const overallTotalsContainer = document.createElement('div');
    overallTotalsContainer.className = 'overall-totals';
    overallTotalsContainer.innerHTML = '<h2>Overall</h2>';
    Object.entries(overallData).forEach(([key, value]) => {
        const p = document.createElement('p');
        p.innerHTML = `${key}: ${value}`;
        overallTotalsContainer.appendChild(p);
    });
    timeOfDayContainer.appendChild(overallTotalsContainer);

    // Log the overall data for the collapsible section
    console.log("Overall Listening Time Data for Collapsible Section:", overallData);

    // By Year
    for (const year in timeOfDayData.yearlyTotals) {
        const yearContainer = document.createElement('div');
        yearContainer.className = 'year-container';

        const yearHeading = document.createElement('h2');
        yearHeading.className = 'year-heading';
        yearHeading.textContent = `Year ${year}`;
        yearContainer.appendChild(yearHeading);

        const yearContent = document.createElement('div');
        yearContent.className = 'year-content';

        const yearlyData = {};
        ["Morning", "Afternoon", "Evening", "Night"].forEach((period) => {
            yearlyData[period] = msToHoursMinutes(timeOfDayData.yearlyTotals[year][period]);
        });

        Object.entries(yearlyData).forEach(([period, value]) => {
            const periodItem = document.createElement("p");
            periodItem.innerHTML = `${period}: <span class="time-of-day">${value}</span>`;
            yearContent.appendChild(periodItem);
        });

        yearContainer.appendChild(yearContent);
        timeOfDayContainer.appendChild(yearContainer);
    }

    mainContainer.appendChild(timeOfDayContainer);

    // Call the chart rendering function
    renderTimeOfDayChart(timeOfDayData.yearlyTotals); 
}
// Summary Calculation
function calculateSummary(data) {
    
    if (!Array.isArray(data)) {
        console.error("Expected an array but received:", data);
        return {};
    }

    const totalListeningTime = { total: 0, byYear: {} };
    const artistData = {};
    const trackData = {};
    const albumData = {};
    const timeOfDayData = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };

    data.forEach((entry) => {
        const { year } = getYearMonthSeason(entry.ts);
        totalListeningTime.total += entry.ms_played;

        // Initialize year if it doesn't exist
        if (!totalListeningTime.byYear[year]) {
            totalListeningTime.byYear[year] = 0;
        }
        totalListeningTime.byYear[year] += entry.ms_played;

        // Top Artists
        if (entry.master_metadata_album_artist_name) {
            const artist = entry.master_metadata_album_artist_name;
            artistData[artist] = (artistData[artist] || 0) + entry.ms_played;
        }

        // Top Tracks
        if (entry.master_metadata_track_name) {
            const track = `${entry.master_metadata_track_name} by ${entry.master_metadata_album_artist_name}`;
            trackData[track] = (trackData[track] || 0) + entry.ms_played;
        }

      // Top Albums
const album = entry.master_metadata_album_album_name;
if (album) {  // Check if album is defined
    albumData[album] = (albumData[album] || 0) + entry.ms_played;
}


        // Time of Day
        const hour = new Date(entry.ts).getHours();
        const period = getTimeOfDay(hour);
        timeOfDayData[period] += entry.ms_played;
    });

    // Get top artists
    const topArtists = Object.entries(artistData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    // Get top tracks
    const topTracks = Object.entries(trackData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15);

    // Get favorite albums
    const favoriteAlbums = Object.entries(albumData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    return {
        totalListeningTime,
        topArtists,
        topTracks,
        timeOfDayData,
        favoriteAlbums
    };
}

// Render Summary
function renderSummary(summaryData) {
    const mainContainer = document.getElementById("mainContainer");

    // Clear previous summary data
    mainContainer.innerHTML = ""; 

    // Check if summaryData is valid
    if (!summaryData || Object.keys(summaryData).length === 0) {
        console.error("Invalid summary data:", summaryData);
        mainContainer.innerHTML = "<p>No summary data available.</p>";
        return;
    }

    // Total Listening Hours
    const totalHours = (summaryData.totalListeningTime.total / (1000 * 60 * 60)).toFixed(2);
    const totalHoursSection = document.createElement("div");
    totalHoursSection.className = "summary-section";
    totalHoursSection.innerHTML = `
        <h2>Total Listening Hours</h2>
        <p>${totalHours} hours</p>
    `;
    mainContainer.appendChild(totalHoursSection);

    // Yearly Breakdown
    const yearBreakdown = summaryData.totalListeningTime.byYear;
    const years = [];
    const hoursPerYear = [];
    const yearSection = document.createElement("div");
    yearSection.className = "summary-section";
    yearSection.innerHTML = `<h2>Yearly Breakdown</h2>`;
    for (let year = 2014; year <= 2024; year++) {
        const hours = (yearBreakdown[year] ? (yearBreakdown[year] / (1000 * 60 * 60)).toFixed(2) : 0);
        years.push(year);
        hoursPerYear.push(hours);
        const yearParagraph = document.createElement("p");
        yearParagraph.innerText = `${year}: ${hours} hours`;
        yearSection.appendChild(yearParagraph);
    }
    mainContainer.appendChild(yearSection);

    // Render the line chart for listening hours per year
    renderListeningHoursChart(years, hoursPerYear);

    // Top Artists
    const artistSection = document.createElement("div");
    artistSection.className = "summary-section";
    artistSection.innerHTML = `<h2>Top Artists</h2>`;
    summaryData.topArtists.forEach(([artist, hours]) => {
        const artistParagraph = document.createElement("p");
        artistParagraph.innerText = `${artist}: ${(hours / (1000 * 60 * 60)).toFixed(2)} hours`;
        artistSection.appendChild(artistParagraph);
        
        // Log top artist data
        console.log(`Top Artist Data: ${artist} - Hours: ${(hours / (1000 * 60 * 60)).toFixed(2)}`);
    });
    mainContainer.appendChild(artistSection);

    // Top Tracks
    const trackSection = document.createElement("div");
    trackSection.className = "summary-section";
    trackSection.innerHTML = `<h2>Top Tracks</h2>`;
    summaryData.topTracks.forEach(([track, hours]) => {
        const trackParagraph = document.createElement("p");
        trackParagraph.innerText = `${track}: ${(hours / (1000 * 60 * 60)).toFixed(2)} hours`;
        trackSection.appendChild(trackParagraph);
        
        // Log top track data
        console.log(`Top Track Data: ${track} - Hours: ${(hours / (1000 * 60 * 60)).toFixed(2)}`);
    });
    mainContainer.appendChild(trackSection);

    // Time of Day Listening Patterns
    const timeOfDaySection = document.createElement("div");
    timeOfDaySection.className = "summary-section";
    timeOfDaySection.innerHTML = `<h2>Listening Time by Time of Day</h2>`;
    Object.entries(summaryData.timeOfDayData).forEach(([period, ms]) => {
        const hours = (ms / (1000 * 60 * 60)).toFixed(2);
        const timeParagraph = document.createElement("p");
        timeParagraph.innerText = `${period}: ${hours} hours`;
        timeOfDaySection.appendChild(timeParagraph);
        
        // Log time of day data
        console.log(`Listening Time by ${period}: ${hours} hours`);
    });
    mainContainer.appendChild(timeOfDaySection);

    // Favorite Albums
    const albumSection = document.createElement("div");
    albumSection.className = "summary-section";
    albumSection.innerHTML = `<h2>Favorite Albums</h2>`;
    summaryData.favoriteAlbums.forEach(([album, hours]) => {
        const albumParagraph = document.createElement("p");
        albumParagraph.innerText = `${album}: ${(hours / (1000 * 60 * 60)).toFixed(2)} hours`;
        albumSection.appendChild(albumParagraph);
        
        // Log favorite album data
        console.log(`Favorite Album Data: ${album} - Hours: ${(hours / (1000 * 60 * 60)).toFixed(2)}`);
    });
    mainContainer.appendChild(albumSection);
}
// Render Listening Hours Chart
function renderListeningHoursChart(years, hoursPerYear) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; // Clear any previous charts

    const canvas = document.createElement('canvas'); // Create a new canvas element
    chartContainer.appendChild(canvas); // Append it to the chartContainer

    const ctx = canvas.getContext('2d'); // Get the 2D context for the new canvas

    new Chart(ctx, {
        type: 'line', // Use line chart
        data: {
            labels: years, // Years on x-axis
            datasets: [{
                label: 'Listening Hours',
                data: hoursPerYear, // Data points for y-axis
                borderColor: 'rgba(75, 192, 192, 1)', // Line color
                fill: false,
                tension: 0.1 // Smooth line
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Hours' // y-axis label
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Years' // x-axis label
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Total Listening Hours' 
                }
            }
        }
    });
}





// Create a collapsible section
function createCollapsibleSection(title, data) {
    const container = document.createElement("div");
    container.classList.add("collapsible-container");

    const header = document.createElement("h4");
    header.classList.add("collapsible-header");
    header.innerText = title;
    container.appendChild(header);

    const content = document.createElement("div");
    content.classList.add("collapsible-content");

    // Initially hide the content
    content.style.display = "none"; 

    for (const key in data) {
        const element = document.createElement("p");
        element.innerText = `${key}: ${data[key]}`;
        content.appendChild(element);
    }

    container.appendChild(content);
    
    // Add event listener to toggle collapse on header click
    header.addEventListener("click", () => {
        content.style.display = (content.style.display === "none" || content.style.display === "") ? "block" : "none";
    });

    return container;
}

// Create a collapsible container for a section with a title
function createCollapsibleContainer(title) {
    const container = document.createElement("div");
    container.classList.add("main-collapsible-container");

    const header = document.createElement("h3");
    header.classList.add("main-collapsible-header");
    header.innerText = title;
    container.appendChild(header);

    const content = document.createElement("div");
    content.classList.add("main-collapsible-content");

    // Initially hide the content
    content.style.display = "none"; 

    container.appendChild(content);

    // Add event listener to toggle collapse on header click
    header.addEventListener("click", () => {
        content.style.display = (content.style.display === "none" || content.style.display === "") ? "block" : "none";
    });

    return container;
}

// Helper functions
function getSeason(month) {
    return month <= 1 || month === 11 ? "Winter" : month <= 4 ? "Spring" : month <= 7 ? "Summer" : "Fall";
}

function getTimeOfDay(hour) {
    return hour < 6 ? "Night" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
}

function msToHoursMinutes(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

function getYearMonthSeason(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth();
    const season = month <= 1 || month === 11 ? "Winter" : month <= 4 ? "Spring" : month <= 7 ? "Summer" : "Fall";
    return { year, month, season };
}

