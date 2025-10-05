import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const otpStore = new Map();

// Send OTP
app.post("/api/send-otp", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });

  // ✅ Log OTP to console for testing
  console.log(`Generated OTP for ${email}: ${otp}`);

  // Send via SendGrid (optional if you want real email)
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}`,
    html: `<p>Your OTP is <strong>${otp}</strong></p>`,
  };

  sgMail
    .send(msg)
    .then(() => res.json({ message: "OTP sent to email (check console if using fake email)" }))
    .catch((err) => res.status(500).json({ message: err.message }));
});

// Verify OTP
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record) return res.status(400).json({ message: "No OTP found for this email" });
  if (record.expires < Date.now()) return res.status(400).json({ message: "OTP expired" });
  if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

  otpStore.delete(email);
  res.json({ message: "OTP verified successfully" });
});

// Optional: test backend URL
app.get("/", (req, res) => res.send("Backend is running!"));

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
