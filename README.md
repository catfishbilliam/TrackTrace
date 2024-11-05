# TrackTrace

TrackTrace is a web application that analyzes and visualizes your music listening habits over time. It provides insights into your favorite artists, tracks, and listening patterns by season, time of day, and more.

## Features

- **Monthly Trends**: Visualize your top artists by season and year.
- **Track Popularity Over Time**: See how your favorite tracks have changed over the years.
- **Content Trends**: Compare your listening time between music and podcasts.
- **Time of Day**: Analyze your listening habits by different times of the day.
- **Summary**: Get a comprehensive summary of your listening habits over the past ten years.

## Installation

1. **Clone the repository**:
    ```sh
    git clone https://github.com/YOUR_GITHUB_USERNAME/TrackTrace.git
    cd TrackTrace
    ```

2. **Install dependencies**:
    ```sh
    npm install
    ```

3. **Start the server**:
    ```sh
    node server.js
    ```

4. **Open your browser** and navigate to `http://localhost:3000`.

## Usage

1. **Upload your data**: Place your JSON data files in the `data` directory.
2. **Analyze your data**: The app will automatically load and analyze your data when you navigate to the app in your browser.
3. **Explore the insights**: Use the dropdown menu to select different types of analysis and explore your listening habits.

## Project Structure

- `public/`: Contains the static files for the frontend.
- `data/`: Directory where you place your JSON data files.
- `server.js`: The main server file that handles data loading and serving the frontend.
- `app.js`: Contains the frontend JavaScript for rendering charts and handling user interactions.
- `style.css`: Contains the CSS for styling the frontend.

## Dependencies

- **Express**: Web framework for Node.js.
- **Chart.js**: JavaScript library for creating charts.
- **Node.js**: JavaScript runtime for the server.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

