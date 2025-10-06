import express from "express";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import cors from "cors";

dotenv.config();
const app = express();

// Check environment variables
if (!process.env.SENDGRID_API_KEY) {
  console.error("Error: SENDGRID_API_KEY is not set in environment variables!");
  process.exit(1);
}
if (!process.env.FROM_EMAIL) {
  console.error("Error: FROM_EMAIL is not set in environment variables!");
  process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Use CORS middleware
app.use(cors({
  origin: 'https://talrn-react-frontend.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
    console.log(`Generated OTP for ${email}: ${otp}`);

    const msg = {
      to: email,
      from: process.env.FROM_EMAIL,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}`,
      html: `<p>Your OTP is <strong>${otp}</strong></p><p>This code will expire in 5 minutes.</p>`,
    };

    try {
      await sgMail.send(msg);
      console.log(`OTP email sent successfully to ${email}`);
      res.json({ message: "OTP sent successfully!" });
    } catch (err) {
      console.error("SendGrid error details:", err.response ? err.response.body : err);
      res.status(500).json({ message: "Failed to send OTP email" });
    }
  } catch (err) {
    console.error("Unexpected error in /api/send-otp:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// POST /api/verify-otp
app.post("/api/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedData = otpStore.get(email);

    if (!storedData) {
      return res.status(400).json({ message: "No OTP found for this email" });
    }

    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is valid, remove it
    otpStore.delete(email);
    res.json({ message: "OTP verified successfully!", success: true });
  } catch (err) {
    console.error("Unexpected error in /api/verify-otp:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});