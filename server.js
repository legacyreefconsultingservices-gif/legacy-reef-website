// Serves the static site and sends inquiry emails server side.
// SMTP credentials live only in environment variables, never in the browser.
const path = require("path");
const fs = require("fs");
const express = require("express");
const nodemailer = require("nodemailer");

// Minimal .env loader (no extra dependency)
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

const BUSINESS_TYPES = ["Startup", "Small Business", "Medium Business", "Established Business", "Corporate", "Investor", "Other"];
const SERVICES = ["Business Planning", "Management Solutions", "Service Improvement", "Business Registration", "Compliance Guidance", "Financial & Investment Advisory", "Digital Transformation", "AI Transformation & Automation", "Training", "General Consultation"];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const oneLine = (s) => String(s || "").replace(/[\r\n]+/g, " ").trim();

// Simple in memory rate limit: 5 submissions per 15 minutes per IP
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 15 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 465,
    secure: (Number(SMTP_PORT) || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

app.post("/api/inquiry", async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot: pretend success to bots
  if (limited(req.ip)) return res.status(429).json({ ok: false, error: "Too many requests. Please try again later." });

  const d = {
    fullName: oneLine(b.fullName), businessName: oneLine(b.businessName), email: oneLine(b.email),
    phone: oneLine(b.phone), businessType: oneLine(b.businessType), service: oneLine(b.service),
    message: String(b.message || "").trim(),
  };
  const errors = {};
  if (d.fullName.length < 2 || d.fullName.length > 100) errors.fullName = "Enter your full name.";
  if (d.businessName.length > 150) errors.businessName = "Business name is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email) || d.email.length > 150) errors.email = "Enter a valid email address.";
  if (!/^[\d\s+()]{7,25}$/.test(d.phone)) errors.phone = "Enter a valid phone or WhatsApp number.";
  if (!BUSINESS_TYPES.includes(d.businessType)) errors.businessType = "Choose a business type.";
  if (!SERVICES.includes(d.service)) errors.service = "Choose a service.";
  if (d.message.length < 10 || d.message.length > 4000) errors.message = "Tell us a little about your business (10 to 4000 characters).";
  if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

  const t = getTransporter();
  if (!t) {
    console.error("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
    return res.status(503).json({ ok: false, error: "Our inquiry system is temporarily unavailable. Please email or call us directly." });
  }

  const rows = [["Name", d.fullName], ["Business", d.businessName || "Not provided"], ["Email", d.email], ["Phone / WhatsApp", d.phone], ["Business type", d.businessType], ["Service needed", d.service]];
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nMessage:\n${d.message}\n`;
  const html = `<table cellpadding="6" style="font-family:Arial,sans-serif;font-size:15px">${rows.map(([k, v]) => `<tr><td><strong>${esc(k)}</strong></td><td>${esc(v)}</td></tr>`).join("")}</table><p style="font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap"><strong>Message</strong><br>${esc(d.message)}</p>`;

  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: process.env.MAIL_TO || "legacyreefconsultingservices@gmail.com",
      replyTo: { name: d.fullName, address: d.email },
      subject: `New website inquiry: ${d.service} (${d.fullName})`,
      text, html,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Mail send failed:", err.message);
    res.status(502).json({ ok: false, error: "We could not send your inquiry. Please try again, or email or call us directly." });
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Legacy Reef site running on http://localhost:${port}`));
