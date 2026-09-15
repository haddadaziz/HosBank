const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const authRoutes = require("./src/routes/authRoutes");
const clientRoutes = require("./src/routes/clientRoutes");
const advisorRoutes = require("./src/routes/advisorRoutes");
const adminRoutes = require("./src/routes/adminRoutes");

app.set("view engine", "ejs");
app.set("views", "./src/views");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
    res.render("home", { title: "HosBank | Une banque radicalement différente" });
});

app.use("/", authRoutes);
app.use("/client", clientRoutes);
app.use("/advisor", advisorRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
    res.status(404).send("Page non trouvée");
});

app.listen(PORT, () => {
    console.log(`HosBank running on http://localhost:${PORT}`);
});