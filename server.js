const express = require("express");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

const app = express();

// Firebase Admin
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://service-nest-newsletter-default-rtdb.firebaseio.com"
});

const db = admin.database();

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "servicenestofficial@gmail.com",
    pass: "vxhp hkjy ktau cpon"
  }
});

// 🧠 WATCH FOR NEW USERS
db.ref("subscribers").on("child_added", async (snapshot) => {
  const data = snapshot.val();
  const email = data.email;

  console.log("New subscriber:", email);

  try {
    await transporter.sendMail({
      from: "Service Nest <yourgmail@gmail.com>",
      to: email,
      subject: "Welcome to Service Nest 🎉",

html: `
<div style="margin:0;padding:0;background:#f6f8fb;font-family:Arial,sans-serif;">

  <!-- Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

          <!-- Gradient Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:30px;text-align:center;color:#fff;">
              
              <img src="https://servicenest.gt.tc/icon.png" width="50" style="border-radius:8px;margin-bottom:10px;" />

              <h1 style="margin:0;font-size:24px;letter-spacing:0.5px;">
                Service Nest
              </h1>

              <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">
                Welcome to your trusted service platform
              </p>

            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;color:#111827;">

              <h2 style="margin-top:0;">Hi there 👋</h2>

              <p style="font-size:15px;line-height:1.6;color:#374151;">
                Thank you for subscribing to <b>Service Nest</b>. You are now part of our community.
                We’ll keep you updated with new services, offers, and important updates.
              </p>

              <p style="font-size:15px;line-height:1.6;color:#374151;">
                Stay connected — exciting things are coming 🚀
              </p>

              <!-- Button -->
              <div style="text-align:center;margin:30px 0;">
                <a href="https://servicenest.gt.tc/"
                   style="background:#111827;color:#fff;text-decoration:none;padding:12px 22px;
                   border-radius:8px;font-weight:bold;display:inline-block;">
                  Visit Website
                </a>
              </div>

              <p style="font-size:13px;color:#6b7280;">
                If you didn’t sign up for this, you can ignore this email.
              </p>

              <p style="margin-top:25px;font-size:14px;">
                — Team <b>Service Nest</b>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;color:#6b7280;">
              © ${new Date().getFullYear()} Service Nest. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</div>
`
    });

    console.log("Welcome email sent to:", email);

  } catch (error) {
    console.error("Email error:", error);
  }
});

app.listen(3000, () => console.log("Server running"));