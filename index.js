import express from "express";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Use CORS package for simplicity
app.use(cors({
  origin: "https://talrn-react-frontend.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const otpStore = new Map();

// Send OTP
app.post("/api/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

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

    await sgMail.send(msg);
    res.json({ message: "OTP sent successfully!" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Verify OTP
app.post("/api/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = otpStore.get(email);

    if (!record) return res.status(400).json({ message: "No OTP found for this email" });
    if (record.expires < Date.now()) return res.status(400).json({ message: "OTP expired" });
    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    otpStore.delete(email);
    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/", (req, res) => res.send("Backend running!"));

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
