import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import { nanoid } from "nanoid";
import admin from "firebase-admin";
import nodemailer from "nodemailer";

// Derive __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase config to get Project ID
const configPath = path.join(__dirname, "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (firebaseConfig.projectId) {
      process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
      process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
    }
  } catch (err) {
    console.error("Error reading firebase-applet-config.json:", err);
  }
}

// Initialize Firebase Admin (Only if not already initialized)
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, "service-account.json");
  if (fs.existsSync(serviceAccountPath)) {
    console.log("Initializing Firebase Admin with local service-account.json");
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId || serviceAccount.project_id,
      });
    } catch (err) {
      console.error("Failed to initialize Firebase Admin with service-account.json:", err);
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
    }
  } else {
    console.log("Initializing Firebase Admin with Application Default Credentials");
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  }
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json());
  app.use(cookieParser());

  console.log("Configuring Google OAuth with:");
  console.log("- Client ID:", process.env.GOOGLE_CLIENT_ID ? "PRESENT" : "MISSING");
  console.log("- Redirect URI:", `${process.env.APP_URL}/api/auth/google/callback`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/google/callback`
  );

  const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

  // --- API Routes ---

  // Generate Google Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    const state = nanoid();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent'
    });
    res.json({ url });
  });

  // Google Auth Callback
  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const userId = req.query.state as string; // We'll pass userId in state for simplicity in this demo, or use a better session

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      
      // In a real app, you'd associate tokens with the user in your DB
      // We'll return a script to notify the opener
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  tokens: ${JSON.stringify(tokens)}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful! This window will close...</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Create Google Meet Event
  app.post("/api/meetings/create-google-event", async (req, res) => {
    const { tokens, title, description, startDateTime, durationMinutes = 60 } = req.body;

    if (!tokens) return res.status(401).json({ error: "Missing tokens" });

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: new Date(startDateTime).toISOString(),
      },
      end: {
        dateTime: new Date(new Date(startDateTime).getTime() + durationMinutes * 60000).toISOString(),
      },
      conferenceData: {
        createRequest: {
          requestId: nanoid(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: 1,
      });

      res.json({
        meetLink: response.data.hangoutLink,
        eventId: response.data.id
      });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  // --- Geocoding Proxy Routes ---
  const geocodeCache = new Map<string, { data: any; expiry: number }>();
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

  app.get("/api/geocode/search", async (req, res) => {
    const { q, limit = "5" } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }
    
    const cacheKey = `search:${q}:${limit}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res.json(cached.data);
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q as string)}&limit=${limit}&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "StudentLinkAcademicApp/1.0 (studentlink.contact@gmail.com)",
          "Accept-Language": "ro,en"
        }
      });
      if (!response.ok) {
        throw new Error(`Nominatim returned status ${response.status}`);
      }
      const data = await response.json();
      geocodeCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
      res.json(data);
    } catch (error: any) {
      console.error("Error in geocode/search proxy:", error);
      res.status(500).json({ error: error.message || "Failed to search location" });
    }
  });

  app.get("/api/geocode/reverse", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing 'lat' or 'lon' query parameters" });
    }

    const cacheKey = `reverse:${lat}:${lon}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res.json(cached.data);
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "StudentLinkAcademicApp/1.0 (studentlink.contact@gmail.com)",
          "Accept-Language": "ro,en"
        }
      });
      if (response.ok) {
        const data = await response.json();
        geocodeCache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL });
        return res.json(data);
      }
      
      console.warn(`Nominatim reverse geocode returned status ${response.status}. Trying BigDataCloud fallback...`);
    } catch (error) {
      console.warn("Nominatim reverse geocode failed. Trying BigDataCloud fallback...", error);
    }

    // Fallback: BigDataCloud Reverse Geocode Client API (free, fast, no-auth, generous limits)
    try {
      const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ro`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        const parts = [];
        if (data.locality) parts.push(data.locality);
        if (data.city && data.city !== data.locality) parts.push(data.city);
        if (data.principalSubdivision) parts.push(data.principalSubdivision);
        if (data.countryName) parts.push(data.countryName);
        
        const display_name = parts.join(", ") || `Location at ${lat}, ${lon}`;
        console.log("BigDataCloud fallback successful:", display_name);
        
        const mappedData = {
          display_name,
          address: {
            city: data.city,
            country: data.countryName,
            postcode: data.postcode
          }
        };
        // Cache the fallback response as well
        geocodeCache.set(cacheKey, { data: mappedData, expiry: Date.now() + CACHE_TTL });
        return res.json(mappedData);
      }
    } catch (fallbackError) {
      console.error("All reverse geocoding providers failed:", fallbackError);
    }

    // Ultimate fallback: Just return the coordinates
    res.json({
      display_name: `Coordinates: ${lat}, ${lon}`,
      address: {}
    });
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Forgot Password Custom SMTP Endpoint
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email address is required." });
    }

    try {
      // 1. Verify user exists in Firebase Auth
      let userRecord;
      try {
        userRecord = await admin.auth().getUserByEmail(email);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          return res.status(404).json({ error: "This email is not registered in the platform." });
        }
        throw err;
      }

      // 2. Generate standard Firebase password reset link
      const appUrl = process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL" 
        ? process.env.APP_URL 
        : "http://localhost:3000";

      const actionCodeSettings = {
        url: `${appUrl}/login`,
      };

      const resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);

      // 3. Configure NodeMailer Transporter with Gmail SMTP details provided by user
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "studentlink.contact@gmail.com",
          pass: "rhdu owok yzwx ephw"
        }
      });

      // 4. Send beautiful HTML email
      const mailOptions = {
        from: '"StudentLink" <studentlink.contact@gmail.com>',
        to: email,
        subject: "StudentLink Password Recovery",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 10px 30px rgba(79, 70, 229, 0.05); border: 1px solid #e2e8f0; text-align: left;">
              
              <!-- Logo Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">
                  Student<span style="color: #1e293b;">Link</span>
                </h1>
                <p style="color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; margin-top: 5px;">
                  Digital Academic Ecosystem
                </p>
              </div>

              <!-- Greeting & Content -->
              <h2 style="color: #1e293b; font-size: 20px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; letter-spacing: -0.03em;">
                Password Recovery
              </h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                Hello! We received a request to reset the password for your account on the StudentLink platform. 
                To choose a new secure password, please click the button below.
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin-bottom: 35px;">
                <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: bold; text-decoration: none; padding: 16px 36px; border-radius: 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); transition: all 0.2s;">
                  Reset Password
                </a>
              </div>

              <!-- Alternative Link -->
              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-bottom: 20px;">
                If the button above does not work, copy and paste the following link into your browser:
              </p>
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 12px; word-break: break-all; font-family: monospace; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; margin-bottom: 30px;">
                ${resetLink}
              </div>

              <!-- Notice -->
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />
              <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; text-align: center; margin: 0;">
                If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
            
            <p style="color: #94a3b8; font-size: 11px; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.1em;">
              © ${new Date().getFullYear()} StudentLink. All rights reserved.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      res.json({ message: "The recovery link has been sent to your email." });
    } catch (err: any) {
      console.error("Error in forgot-password:", err);
      res.status(500).json({ error: "An error occurred while sending the email. Please try again later." });
    }
  });

  // --- AI Routes ---
  app.post("/api/ai/career-advice", async (req, res) => {
    const { studentName, grades, strengths } = req.body;
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      const gradesStr = Object.entries(grades).map(([subject, grade]) => `${subject}: ${grade}`).join(", ");
      const prompt = `Analyze the academic performance of the student ${studentName}.
      Grades: ${gradesStr}
      Strengths: ${strengths.join(", ")}
      
      Provide personalized career recommendations and job suggestions in English (around 250 words). 
      Include:
      1. Top 3 suitable fields.
      2. Specific types of roles.
      3. Suggestions for further development (skills to learn).
      Use an encouraging and professional tone.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Error generating career advice:", error);
      res.status(500).json({ error: "Failed to generate advice" });
    }
  });

  app.post("/api/ai/quiz", async (req, res) => {
    const { courseTitle, description, materialsText } = req.body;
    try {
      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      const prompt = `You are an expert academic assistant. Generate a multiple-choice quiz in English for the course "${courseTitle}".
      Description: ${description}
      Materials: ${materialsText}
      
      Requirements:
      - Generate exactly 5 relevant questions.
      - Each question must have 4 options.
      - Specify the correct index (0-3).
      - The quiz should have a balanced difficulty.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.NUMBER }
              },
              required: ["question", "options", "correctIndex"]
            }
          }
        }
      });
      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
