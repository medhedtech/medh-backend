const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { ENV_VARS } = require("./config/envVars");
const fileUpload = require("express-fileupload");
const cron = require("node-cron");

// Import routes
const router = require("./routes");
const connectDB = require("./config/db");
const { statusUpdater } = require("./cronjob/inactive-meetings");

const app = express();

app.use(express.static("public"));
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "128mb", extended: true }));
app.use(express.json());
app.use(fileUpload());
connectDB();

// Routes
app.use("/api/v1", router);
app.use((req, res) => {
  res.status(404).json({ message: "Invalid route" });
});

// Schedule the job to run every minute
cron.schedule("* * * * *", () => {
  console.log("Running scheduled job...");
  statusUpdater();
});

// Start server
const PORT = ENV_VARS.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
