const express = require("express");
const http = require("http");
const cors = require("cors");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ========================
// MIDDLEWARE
// ========================
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// ========================
// SOCKET.IO
// ========================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// ========================
// FIREBASE
// ========================
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://service-nest-newsletter-default-rtdb.firebaseio.com"
});

const db = admin.database();

// ========================
// EMAIL TRANSPORTER
// ========================
// IMPORTANT:
// Add these variables in Railway:
//
// EMAIL_USER=yourgmail@gmail.com
// EMAIL_PASS=your_app_password
//
// NEVER hardcode passwords
// ========================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ========================
// TEST ROUTE
// ========================
app.get("/", (req, res) => {
    res.send("🚀 Service Nest Backend Running");
});

// ========================
// AUTO WELCOME EMAIL
// ========================
if (!global.subscriberListenerAdded) {

    db.ref("subscribers").on("child_added", async (snapshot) => {

        const data = snapshot.val();
        const email = data?.email;

        if (!email) return;

        console.log("📩 New subscriber:", email);

        try {

            await transporter.sendMail({
                from: `Service Nest <${process.env.EMAIL_USER}>`,
                to: email,
                subject: "Welcome to Service Nest 🎉",
                html: `
                    <div style="font-family:Arial;padding:20px;">
                        <h2>🚀 Welcome to Service Nest</h2>
                        <p>Thank you for subscribing.</p>
                        <p>We are excited to have you with us!</p>
                    </div>
                `
            });

            console.log("✅ Welcome email sent:", email);

        } catch (err) {

            console.error("❌ Welcome email error:", err.message);

        }

    });

    global.subscriberListenerAdded = true;
}

// ========================
// SEND EMAIL API
// ========================
app.post("/api/send-email", async (req, res) => {

    try {

        const { subject, message } = req.body;

        if (!subject || !message) {

            return res.status(400).json({
                success: false,
                error: "Subject and message required"
            });

        }

        // GET SUBSCRIBERS
        const snapshot = await db.ref("subscribers").once("value");

        const subscribers = snapshot.val() || {};

        const emails = Object.values(subscribers)
            .map(sub => sub.email)
            .filter(Boolean);

        if (emails.length === 0) {

            return res.json({
                success: false,
                error: "No subscribers found"
            });

        }

        // SEND EMAILS
        for (const email of emails) {

            await transporter.sendMail({
                from: `Service Nest <${process.env.EMAIL_USER}>`,
                to: email,
                subject,
                html: `
                    <div style="font-family:Arial;padding:20px;">
                        <h2>${subject}</h2>
                        <p>${message}</p>
                    </div>
                `
            });

            console.log("✅ Email sent to:", email);
        }

        res.json({
            success: true,
            sent: emails.length
        });

    } catch (err) {

        console.error("❌ Send email error:", err);

        res.status(500).json({
            success: false,
            error: err.message
        });

    }

});

// ========================
// SERVICES API
// ========================

// GET ALL SERVICES
app.get("/api/services", async (req, res) => {

    try {

        const snapshot = await db.ref("services").once("value");

        const data = snapshot.val() || {};

        const services = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
        }));

        res.json(services);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed to fetch services"
        });

    }

});

// CREATE SERVICE
app.post("/api/services", async (req, res) => {

    try {

        const newRef = db.ref("services").push();

        const service = {
            ...req.body,
            users: 0
        };

        await newRef.set(service);

        // REALTIME UPDATE
        const snapshot = await db.ref("services").once("value");

        io.emit("servicesUpdated", snapshot.val());

        res.json({
            id: newRef.key,
            ...service
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed to create service"
        });

    }

});

// UPDATE SERVICE
app.put("/api/services/:id", async (req, res) => {

    try {

        const id = req.params.id;

        await db.ref("services/" + id).update(req.body);

        // REALTIME UPDATE
        const snapshot = await db.ref("services").once("value");

        io.emit("servicesUpdated", snapshot.val());

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed to update service"
        });

    }

});

// DELETE SERVICE
app.delete("/api/services/:id", async (req, res) => {

    try {

        const id = req.params.id;

        await db.ref("services/" + id).remove();

        // REALTIME UPDATE
        const snapshot = await db.ref("services").once("value");

        io.emit("servicesUpdated", snapshot.val());

        res.json({
            success: true
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed to delete service"
        });

    }

});

// ========================
// SOCKET CONNECTION
// ========================
io.on("connection", (socket) => {

    console.log("🟢 User connected:", socket.id);

    socket.on("disconnect", () => {

        console.log("🔴 User disconnected:", socket.id);

    });

});

// ========================
// START SERVER
// ========================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(`🚀 Server running on port ${PORT}`);

});
