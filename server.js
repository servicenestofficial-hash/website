const express = require("express");
const http = require("http");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ========================
// BASIC MIDDLEWARE
// ========================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json());

// ========================
// SOCKET.IO
// ========================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ========================
// FIREBASE (UNCHANGED)
// ========================
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://service-nest-newsletter-default-rtdb.firebaseio.com"
});

const db = admin.database();

// ========================
// EMAIL (UNCHANGED)
// ========================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "servicenestofficial@gmail.com",
        pass: "vxhp hkjy ktau cpon"
    }
});

// ========================
// SUBSCRIBER WATCHER
// ========================
if (!global.subscriberListenerAdded) {
    db.ref("subscribers").on("child_added", async (snapshot) => {
        const data = snapshot.val();
        const email = data?.email;

        if (!email) return;

        console.log("New subscriber:", email);

        try {
            await transporter.sendMail({
                from: "Service Nest <servicenestofficial@gmail.com>",
                to: email,
                subject: "Welcome to Service Nest 🎉",
                html: "<h2>Welcome to Service Nest 🚀</h2>"
            });

            console.log("Email sent:", email);
        } catch (err) {
            console.error("Email error:", err.message);
        }
    });

    global.subscriberListenerAdded = true;
}

// ========================
// SERVICES API
// ========================

// GET
app.get("/api/services", async (req, res) => {
    const snapshot = await db.ref("services").once("value");
    const data = snapshot.val() || {};

    const services = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
    }));

    res.json(services);
});

// CREATE
app.post("/api/services", async (req, res) => {
    const newRef = db.ref("services").push();

    const service = {
        ...req.body,
        users: 0
    };

    await newRef.set(service);

    const snapshot = await db.ref("services").once("value");
    io.emit("servicesUpdated", snapshot.val());

    res.json({ id: newRef.key, ...service });
});

// UPDATE
app.put("/api/services/:id", async (req, res) => {
    await db.ref("services/" + req.params.id).update(req.body);

    const snapshot = await db.ref("services").once("value");
    io.emit("servicesUpdated", snapshot.val());

    res.json({ success: true });
});

// DELETE
app.delete("/api/services/:id", async (req, res) => {
    await db.ref("services/" + req.params.id).remove();

    const snapshot = await db.ref("services").once("value");
    io.emit("servicesUpdated", snapshot.val());

    res.json({ success: true });
});

// ========================
// SOCKET CONNECTION
// ========================
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// ========================
// SEND EMAIL API
// ========================
app.post("/api/send-email", async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        await transporter.sendMail({
            from: "Service Nest <servicenestofficial@gmail.com>",
            to,
            subject,
            html: `<p>${message}</p>`
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Email error:", err);
        res.status(500).json({ error: "Email failed" });
    }
});

// ========================
// RAILWAY START
// ========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
