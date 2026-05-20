import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import { nanoid } from "nanoid";
import admin from "firebase-admin";

// Derive __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (Only if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // This works automatically in this environment
  });
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
