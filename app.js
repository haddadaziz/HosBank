const express = require("express");

const app = express();

const PORT = 3000;

 app.set("view engine", "ejs");

 app.set("views", "./src/views");

app.get("/", (req, res) => {
    res.render("home");
});

app.listen(PORT, () => {
    console.log(`HosBank running on http://localhost:${PORT}`);
});