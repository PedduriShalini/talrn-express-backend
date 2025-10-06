import express from "express";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();
const app = express();

// Check environment variables
if (!process.env.SENDGRID_API_KEY) {
  console.error("Error: SENDGRID_API_KEY is not set in environment variables!");
}
if (!process.env.FROM_EMAIL) {
  console.error("Error: FROM_EMAIL is not set in environment variables!");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Manual CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://talrn-react-frontend.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const PORT = process.env.PORT || 5000;
const otpStore = new Map();

// POST /api/send-otp
app.post("/api/send-otp", async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { email } = req.body;
    if (!email) {
      console.warn("No email provided in request");
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
    console.log(`Generated OTP for ${email}: ${otp}`);

    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}`,
      html: `<p>Your OTP is <strong>${otp}</strong></p>`,
    };

    // Send email and log detailed errors if something fails
    try {
      await sgMail.send(msg);
      console.log(`OTP email sent successfully to ${email}`);
      res.json({ message: "OTP sent successfully!" });
    } catch (err) {
      console.error("SendGrid error details:", err.response ? err.response.body : err);
      res.status(500).json({ message: "Internal Server Error" });
    }

  } catch (err) {
    console.error("Unexpected error in /api/send-otp:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
