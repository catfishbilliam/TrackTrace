const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Removed the duplicate app.listen() call
app.use(express.static("public"));

app.get("/analyze", (req, res) => {
    try {
        const dataFiles = ["data0.json", "data1.json", "data2.json", "data3.json", "data4.json"];
        const data = [];

        console.log("Loading data files...");

        dataFiles.forEach((file) => {
            const filePath = path.join(__dirname, "data", file);
            const fileContent = fs.readFileSync(filePath, "utf8");
            const parsedData = JSON.parse(fileContent);
            console.log(`Loaded ${file}:`, parsedData.slice(0, 3)); 
            data.push(...parsedData);
        });

        console.log(`Total entries loaded: ${data.length}`);
        
        if (data.length > 0) {
            console.log("Sample data entries:", data.slice(0, 3)); 
        } else {
            console.warn("No data entries found.");
        }

        console.log("Data files loaded. Sending raw data to client...");
        res.json(data);
    } catch (error) {
        console.error("Error processing /analyze:", error);
        res.status(500).json({ error: "Failed to process data" });
    }
});

// Corrected app.listen() call
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
