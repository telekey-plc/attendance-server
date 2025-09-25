const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 4000;

app.use(cors());

app.get("/api/attendance-report", (req, res) => {
	const reportPath = path.join(__dirname, "attendance_report.json");
	if (!fs.existsSync(reportPath))
		return res.status(404).send("Report not found!");
	const data = fs.readFileSync(reportPath, "utf8");
	res.json(JSON.parse(data));
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
