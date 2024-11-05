let rawData = {}; 

document.addEventListener("DOMContentLoaded", async () => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

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
    } finally {
        loadingOverlay.style.display = 'none'; 
    }
});

function updateText() {
    const selectedValue = document.getElementById("dataComparison").value;
    const mainContainer = document.getElementById("mainContainer");
    const chartContainer = document.getElementById("chartContainer");

    console.log("Selected value:", selectedValue);
    console.log("Raw data:", rawData);

    mainContainer.innerHTML = "";
    chartContainer.innerHTML = "";
    chartContainer.classList.remove('chart-container-expanded');

    if (!Array.isArray(rawData) || rawData.length === 0) {
        mainContainer.innerHTML = "<p>No data available. Please refresh or check your data source.</p>";
        return;
    }

    switch (selectedValue) {
        case "monthlyTrends":
            const monthlyTrends = calculateMonthlyTrends(rawData);
            renderMonthlyTrends(monthlyTrends);
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
            renderTimeOfDayChart(timeOfDayData.bubbleChartData);
            chartContainer.classList.add('chart-container-expanded');
            break;
        case "summary":
            const summaryData = calculateSummary(rawData);
            renderSummary(summaryData);

            const years = Object.keys(summaryData.totalListeningTime.byYear);
            const hoursPerYear = Object.values(summaryData.totalListeningTime.byYear).map(
                ms => (ms / (1000 * 60 * 60)).toFixed(2)
            );

            renderListeningHoursChart(years, hoursPerYear);
            break;
        default:
            mainContainer.innerHTML = "<p>Select a data type to display analysis.</p>";
            chartContainer.innerHTML = "";
            break;
    }

    initializeCollapsible();
}

function renderTrackPopularityOverTime(trackPopularity) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Tracks by Season per Year", true);

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

function initializeCollapsible() {
    document.querySelectorAll('.container-heading').forEach(function(containerHeading) {
        containerHeading.addEventListener('click', function() {
            const containerContent = this.nextElementSibling;
            containerContent.style.display = containerContent.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.section-heading').forEach(function(sectionHeading) {
        sectionHeading.addEventListener('click', function() {
            const sectionContent = this.nextElementSibling;
            sectionContent.style.display = sectionContent.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.year-heading').forEach(function(yearHeading) {
        yearHeading.addEventListener('click', function() {
            const yearContent = this.nextElementSibling;
            yearContent.style.display = yearContent.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.querySelectorAll('.season-heading').forEach(function(seasonHeading) {
        seasonHeading.addEventListener('click', function() {
            const seasonContent = this.nextElementSibling;
            seasonContent.style.display = seasonContent.style.display === 'none' ? 'block' : 'none';
        });
    });
}

function calculateMonthlyTrends(data) {
    const trends = {};

    data.forEach((entry) => {
        if (entry.master_metadata_album_artist_name) {
            const { year, season } = getYearMonthSeason(entry.ts);
            const artist = entry.master_metadata_album_artist_name;

            if (!trends[year]) trends[year] = { Winter: {}, Spring: {}, Summer: {}, Fall: {} };
            if (!trends[year][season][artist]) trends[year][season][artist] = 0;

            trends[year][season][artist] += entry.ms_played;
        }
    });

    console.log("Monthly Trends:", trends);
    return trends;
}

const seasonColors = {
    Winter: 'rgba(250, 128, 114, 0.8)',
    Spring: 'rgba(255, 160, 122, 0.8)',
    Summer: 'rgba(255, 218, 185, 0.8)',
    Fall: 'rgba(255, 127, 80, 0.8)',
};

function calculateSeasonalTopArtists(trends) {
    const bubbleData = [];

    for (const year in trends) {
        for (const season of ["Winter", "Spring", "Summer", "Fall"]) {
            if (trends[year][season]) {
                const topArtistEntry = Object.entries(trends[year][season])
                    .sort(([, aTime], [, bTime]) => bTime - aTime)[0];

                if (topArtistEntry) {
                    const [artist, msPlayed] = topArtistEntry;
                    bubbleData.push({
                        x: year,
                        y: msPlayed / (1000 * 60 * 60),
                        r: Math.sqrt(msPlayed) / 200,
                        artist,
                        season
                    });
                }
            }
        }
    }

    return bubbleData;
}

function renderTopArtistsChart(bubbleData) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = "";

    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    const radiusScaleFactor = 0.5;

    const dataset = {
        label: 'Top Seasonal Artists by Year',
        data: bubbleData.map(item => ({
            x: item.x,
            y: item.y,
            r: item.r * radiusScaleFactor,
            season: item.season,
            artist: item.artist
        })),
        backgroundColor: bubbleData.map(item => seasonColors[item.season]),
    };

    new Chart(ctx, {
        type: 'bubble',
        data: {
            datasets: [dataset],
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Year'
                    },
                    min: 2014,
                    max: 2024,
                    ticks: {
                        stepSize: 1,
                        callback: (value) => `${value}`
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const artist = context.raw.artist;
                            const time = context.raw.y.toFixed(2);
                            const season = context.raw.season;
                            return `${artist} (${season}): ${time} hours`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Top Artists by Season'
                }
            }
        }
    });
}

function renderMonthlyTrends(trends) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Artists by Season per Year", true);

    const bubbleData = calculateSeasonalTopArtists(trends);
    renderTopArtistsChart(bubbleData);

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

const colorPalette = [
    'rgba(0, 123, 255, 1)',
    'rgba(255, 87, 51, 1)',
    'rgba(40, 167, 69, 1)',
    'rgba(218, 165, 32, 1)',
    'rgba(102, 16, 242, 1)',
    'rgba(23, 162, 184, 1)',
    'rgba(108, 117, 125, 1)',
    'rgba(232, 62, 140, 1)',
    'rgba(255, 133, 27, 1)',
    'rgba(220, 53, 69, 1)'
];

function renderTrackPopularityOverTime(trackPopularity) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Tracks by Season per Year", true);

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

function calculateTrackPopularityOverTime(data) {
    const trackData = {};
    const trackPopularity = {};

    data.forEach((entry) => {
        if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
            const { year, season } = getYearMonthSeason(entry.ts);
            const trackWithArtist = `${entry.master_metadata_track_name} by ${entry.master_metadata_album_artist_name}`;

            if (!trackData[trackWithArtist]) {
                trackData[trackWithArtist] = Array(11).fill(0);
            }
            const yearIndex = year - 2014;
            if (yearIndex >= 0 && yearIndex < trackData[trackWithArtist].length) {
                trackData[trackWithArtist][yearIndex] += entry.ms_played;
            }

            if (!trackPopularity[year]) trackPopularity[year] = { Winter: {}, Spring: {}, Summer: {}, Fall: {} };
            if (!trackPopularity[year][season][trackWithArtist]) trackPopularity[year][season][trackWithArtist] = 0;
            trackPopularity[year][season][trackWithArtist] += entry.ms_played;
        }
    });

    const sortedTracks = Object.entries(trackData)
        .map(([track, totals]) => ({
            track,
            totals: totals.map(ms => ms / (1000 * 60 * 60)),
        }))
        .sort((a, b) => b.totals.reduce((sum, current) => sum + current, 0) - a.totals.reduce((sum, current) => sum + current, 0))
        .slice(0, 10);

    return { sortedTracks, trackPopularity };
}

function renderTopTracksChart(topTracks) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = "";

    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const labels = Array.from({ length: 11 }, (_, i) => 2014 + i);

    const datasets = topTracks.map((track, index) => ({
        label: track.track,
        data: track.totals,
        borderColor: colorPalette[index % colorPalette.length],
        backgroundColor: colorPalette[index % colorPalette.length].replace('1)', '0.2)'),
        fill: true,
        tension: 0.2
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
                    text: 'Top Ten Tracks of All Time',
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)',
                    },
                },
            },
            elements: {
                line: {
                    borderWidth: 1
                },
                point: {
                    radius: 0
                }
            }
        },
    });
}

function calculateContentTrends(data) {
    const contentTrends = {};

    data.forEach((entry) => {
        const { year } = getYearMonthSeason(entry.ts);
        const contentType = entry.episode_name ? "Podcast" : "Music";

        if (!contentTrends[year]) contentTrends[year] = { Music: 0, Podcast: 0 };
        contentTrends[year][contentType] += entry.ms_played;
    });

    return contentTrends;
}

function renderContentTrends(contentTrends) {
    const mainContainer = document.getElementById("mainContainer");
    const container = createCollapsibleContainer("Music vs Podcasts by Year", true);

    const years = Object.keys(contentTrends);
    const musicData = years.map(year => contentTrends[year].Music / (1000 * 60 * 60)); 
    const podcastData = years.map(year => contentTrends[year].Podcast / (1000 * 60 * 60)); 

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

        const musicItem = document.createElement("p");
        musicItem.innerHTML = `Music: <span class="music">${msToHoursMinutes(yearData.Music)}</span>`;
        yearContent.appendChild(musicItem);

        const podcastItem = document.createElement("p");
        podcastItem.innerHTML = `Podcast: <span class="podcast">${msToHoursMinutes(yearData.Podcast)}</span>`;
        yearContent.appendChild(podcastItem);

        yearContainer.appendChild(yearContent);
        container.appendChild(yearContainer);
    }

    mainContainer.appendChild(container);
}

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

function calculateTimeOfDay(data) {
    const overallTotals = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    const yearlyTotals = {};
    const artistPopularity = { Morning: {}, Afternoon: {}, Evening: {}, Night: {} };
    const bubbleChartData = [];

    for (let year = 2014; year <= 2024; year++) {
        yearlyTotals[year] = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    }

    data.forEach((entry) => {
        const { year } = getYearMonthSeason(entry.ts);
        const hour = new Date(entry.ts).getHours();
        const period = getTimeOfDay(hour);
        const artist = entry.master_metadata_album_artist_name;

        if (!artist || artist === "The Weeknd") {
            return; 
        }

        overallTotals[period] += entry.ms_played;

        if (year >= 2014 && year <= 2024) {
            yearlyTotals[year][period] += entry.ms_played;

            if (!artistPopularity[period][artist]) artistPopularity[period][artist] = 0;
            artistPopularity[period][artist] += entry.ms_played;
        }
    });

    for (const year in yearlyTotals) {
        for (const period of ["Morning", "Afternoon", "Evening", "Night"]) {
            const totalHours = yearlyTotals[year][period] / (1000 * 60 * 60);
            
            const topArtistEntry = Object.entries(artistPopularity[period])
                .filter(([artist]) => artistPopularity[period][artist] > 0)
                .sort(([, aTime], [, bTime]) => bTime - aTime)[0];

            if (topArtistEntry) {
                const [artist] = topArtistEntry;
                bubbleChartData.push({
                    year: parseInt(year),
                    period,
                    artist,
                    totalHours
                });
            }
        }
    }

    return { overallTotals, yearlyTotals, artistPopularity, bubbleChartData }; 
}

function renderTimeOfDayChart(bubbleChartData) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; 

    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas); 

    const ctx = canvas.getContext('2d');

    const colors = {
        Morning: 'rgba(255, 206, 86, 0.6)',
        Afternoon: 'rgba(75, 192, 192, 0.6)',
        Evening: 'rgba(153, 102, 255, 0.6)',
        Night: 'rgba(255, 99, 132, 0.6)'
    };

    const datasets = [];

    bubbleChartData.forEach(entry => {
        const bubbleData = {
            x: entry.year,
            y: entry.totalHours,
            r: Math.sqrt(entry.totalHours) * 3,
            artist: entry.artist
        };

        const period = entry.period;
        if (!datasets.find(ds => ds.label === period)) {
            datasets.push({
                label: period,
                data: [bubbleData],
                backgroundColor: colors[period],
                hoverBackgroundColor: colors[period].replace('0.6', '0.8'),
                tooltipLabel: []
            });
        } else {
            datasets.find(ds => ds.label === period).data.push(bubbleData);
        }
    });

    new Chart(ctx, {
        type: 'bubble',
        data: { datasets: datasets },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    },
                    ticks: {
                        callback: (value) => value.toString()
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const year = context.raw.x;
                            const time = context.raw.y.toFixed(2);
                            const period = context.dataset.label;
                            const artist = context.raw.artist;
                            return `${artist} (${period}) in ${year}: ${time} hours`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Artist Popularity by Time of Day'
                }
            }
        }
    });
}

function renderTimeOfDay(timeOfDayData) {
    const mainContainer = document.getElementById("mainContainer");
    mainContainer.innerHTML = ""; 

    const timeOfDayContainer = document.createElement('div');
    timeOfDayContainer.className = 'time-of-day-container';

    const overallTotalsContainer = document.createElement('div');
    overallTotalsContainer.className = 'overall-totals';
    overallTotalsContainer.innerHTML = '<h2>Overall Listening Time</h2>';
    Object.entries(timeOfDayData.overallTotals).forEach(([key, value]) => {
        const p = document.createElement('p');
        p.innerHTML = `${key}: ${msToHoursMinutes(value)}`;
        overallTotalsContainer.appendChild(p);
    });
    timeOfDayContainer.appendChild(overallTotalsContainer);

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

    renderTimeOfDayChart(timeOfDayData.bubbleChartData);
    renderArtistPopularityBubbleChart(timeOfDayData.bubbleChartData);
}

function renderArtistPopularityBubbleChart(bubbleChartData) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = ""; 

    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    if (!Array.isArray(bubbleChartData)) {
        console.error("bubbleChartData is not an array:", bubbleChartData);
        return;
    }

    const bubbleData = {
        datasets: [{
            label: 'Artist Popularity by Time of Day',
            data: bubbleChartData.map(entry => ({
                x: entry.period,
                y: entry.totalHours,
                r: Math.sqrt(entry.totalHours) * 7,
                artist: entry.artist
            })),
            backgroundColor: 'rgba(75, 192, 192, 0.3)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2
        }]
    };

    new Chart(ctx, {
        type: 'bubble',
        data: bubbleData,
        options: {
            scales: {
                x: {
                    type: 'category',
                    labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
                    title: {
                        display: true,
                        text: 'Time of Day'
                    },
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Time (hours)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const artist = context.raw.artist;
                            const time = context.raw.y.toFixed(2);
                            return `${artist}: ${time} hours`;
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Artist Popularity During Different Times of Day'
                }
            }
        }
    });
}

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

        if (!totalListeningTime.byYear[year]) {
            totalListeningTime.byYear[year] = 0;
        }
        totalListeningTime.byYear[year] += entry.ms_played;

        if (entry.master_metadata_album_artist_name) {
            const artist = entry.master_metadata_album_artist_name;
            artistData[artist] = (artistData[artist] || 0) + entry.ms_played;
        }

        if (entry.master_metadata_track_name) {
            const track = `${entry.master_metadata_track_name} by ${entry.master_metadata_album_artist_name}`;
            trackData[track] = (trackData[track] || 0) + entry.ms_played;
        }

        const album = entry.master_metadata_album_album_name;
        if (album) {
            albumData[album] = (albumData[album] || 0) + entry.ms_played;
        }

        const hour = new Date(entry.ts).getHours();
        const period = getTimeOfDay(hour);
        timeOfDayData[period] += entry.ms_played;
    });

    const topArtists = Object.entries(artistData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    const topTracks = Object.entries(trackData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15);

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

function renderSummary(summaryData) {
    const mainContainer = document.getElementById("mainContainer");

    mainContainer.innerHTML = ""; 

    const summaryContainer = document.createElement("div");
    summaryContainer.className = "summary-container";

    if (!summaryData || Object.keys(summaryData).length === 0) {
        console.error("Invalid summary data:", summaryData);
        mainContainer.innerHTML = "<p>No summary data available.</p>";
        return;
    }

    const totalHoursSection = document.createElement("div");
    totalHoursSection.className = "summary-section";
    totalHoursSection.innerHTML = `
        <h2>Total Listening Hours: ${(summaryData.totalListeningTime.total / (1000 * 60 * 60)).toFixed(2)} hours</h2>
    `;

    Object.entries(summaryData.totalListeningTime.byYear).forEach(([year, ms]) => {
        const yearParagraph = document.createElement("p");
        yearParagraph.innerHTML = `<strong class="bungee-inline">${year}:</strong> ${(ms / (1000 * 60 * 60)).toFixed(2)} hours`;
        totalHoursSection.appendChild(yearParagraph);
    });

    summaryContainer.appendChild(totalHoursSection);

    const artistSection = document.createElement("div");
    artistSection.className = "summary-section";
    artistSection.innerHTML = `<h2>Top 10 Artists of All-Time</h2>`;
    const artistList = document.createElement("ol");
    summaryData.topArtists.slice(0, 10).forEach(([artist, hours]) => {
        const artistItem = document.createElement("li");
        artistItem.innerHTML = `<strong>${artist}</strong>: ${(hours / (1000 * 60 * 60)).toFixed(2)} hours`;
        artistList.appendChild(artistItem);
    });
    artistSection.appendChild(artistList);
    summaryContainer.appendChild(artistSection);

    const trackSection = document.createElement("div");
    trackSection.className = "summary-section";
    trackSection.innerHTML = `<h2>Top 20 Tracks of All-Time</h2>`;
    const trackList = document.createElement("ol");
    summaryData.topTracks.slice(0, 20).forEach(([track, hours]) => {
        const trackItem = document.createElement("li");
        trackItem.innerHTML = `<strong>${track}</strong>: ${(hours / (1000 * 60 * 60)).toFixed(2)} hours`;
        trackList.appendChild(trackItem);
    });
    trackSection.appendChild(trackList);
    summaryContainer.appendChild(trackSection);

    const albumSection = document.createElement("div");
    albumSection.className = "summary-section";
    albumSection.innerHTML = `<h2>Top 10 Favorite Albums</h2>`;
    const albumList = document.createElement("ol");
    summaryData.favoriteAlbums.slice(0, 10).forEach(([album, hours]) => {
        const albumItem = document.createElement("li");
        albumItem.innerHTML = `<strong>${album}</strong>: ${(hours / (1000 * 60 * 60)).toFixed(2)} hours`;
        albumList.appendChild(albumItem);
    });
    albumSection.appendChild(albumList);
    summaryContainer.appendChild(albumSection);

    const timeOfDaySection = document.createElement("div");
    timeOfDaySection.className = "summary-section";
    timeOfDaySection.innerHTML = `<h2>Favorite Time to Listen to Music</h2>`;
    const timeOfDayList = document.createElement("ol");
    Object.entries(summaryData.timeOfDayData).forEach(([period, ms]) => {
        const periodItem = document.createElement("li");
        periodItem.innerHTML = `<strong>${period}</strong>: ${(ms / (1000 * 60 * 60)).toFixed(2)} hours`;
        timeOfDayList.appendChild(periodItem);
    });
    timeOfDaySection.appendChild(timeOfDayList);
    summaryContainer.appendChild(timeOfDaySection);

    mainContainer.appendChild(summaryContainer);
}

function renderListeningHoursChart(years, hoursPerYear) {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.innerHTML = "";

    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    if (!years || !hoursPerYear || years.length !== hoursPerYear.length) {
        console.error("Data for chart is invalid or mismatched.");
        return;
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Listening Hours',
                data: hoursPerYear,
                borderColor: 'rgba(75, 192, 192, 1)',
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Listening Hours'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Years'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Total Listening Hours Over Years' 
                }
            }
        }
    });
}

function createCollapsibleContainer(title, hideTitle = false) {
    const container = document.createElement("div");
    container.classList.add("main-collapsible-container");

    const header = document.createElement("h3");
    header.classList.add("main-collapsible-header");
    header.innerText = title;

    if (hideTitle) {
        header.style.display = "none";
    }

    container.appendChild(header);

    const content = document.createElement("div");
    content.classList.add("main-collapsible-content");
    content.style.display = "none";

    container.appendChild(content);

    header.addEventListener("click", () => {
        content.style.display = (content.style.display === "none" || content.style.display === "") ? "block" : "none";
    });

    return container;
}

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

