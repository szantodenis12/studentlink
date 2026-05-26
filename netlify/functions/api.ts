import "dotenv/config";
import express from "express";
import serverless from "serverless-http";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import { nanoid } from "nanoid";

const app = express();
app.use(express.json());
app.use(cookieParser());

// Configure Google OAuth Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/api/auth/google/callback`
);

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

// --- API Routes ---

// 1. Google OAuth URL generator
app.get("/api/auth/google/url", (req, res) => {
  const state = nanoid();
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: state,
    prompt: "consent",
  });
  res.json({ url });
});

// 2. Google OAuth Callback Route
app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
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

// 3. Google Meet Event Creator
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
      dateTime: new Date(new Date(startDateTime).getTime() + durationMinutes * 60 * 1000).toISOString(),
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
      eventId: response.data.id,
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// --- Geocoding Cache & Proxy ---
const geocodeCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

// 4. Geocode Search Proxy
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
        "Accept-Language": "ro,en",
      },
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

// 5. Reverse Geocode Proxy (with fallback)
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
        "Accept-Language": "ro,en",
      },
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

  // Fallback: BigDataCloud Reverse Geocode Client API
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
      
      const mappedData = {
        display_name,
        address: {
          city: data.city,
          country: data.countryName,
          postcode: data.postcode,
        },
      };
      geocodeCache.set(cacheKey, { data: mappedData, expiry: Date.now() + CACHE_TTL });
      return res.json(mappedData);
    }
  } catch (fallbackError) {
    console.error("All reverse geocoding providers failed:", fallbackError);
  }

  res.json({
    display_name: `Coordinates: ${lat}, ${lon}`,
    address: {},
  });
});

// --- AI / Gemini Routes ---

// 6. AI Career Advice Route
app.post("/api/ai/career-advice", async (req, res) => {
  const { studentName, grades, strengths } = req.body;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const model = "gemini-2.5-flash"; // Use updated premium HSL Gemini 2.5 Flash model
    const gradesStr = Object.entries(grades)
      .map(([subject, grade]) => `${subject}: ${grade}`)
      .join(", ");
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
      contents: prompt,
    });
    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error generating career advice:", error);
    res.status(500).json({ error: "Failed to generate advice: " + error.message });
  }
});

// 7. AI Quiz Generator Route
app.post("/api/ai/quiz", async (req, res) => {
  const { courseTitle, description, materialsText } = req.body;
  try {
    const { GoogleGenAI, Type } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const model = "gemini-2.5-flash"; // Use updated premium HSL Gemini 2.5 Flash model
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
              correctIndex: { type: Type.NUMBER },
            },
            required: ["question", "options", "correctIndex"],
          },
        },
      },
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ error: "Failed to generate quiz: " + error.message });
  }
});

// 8. Health Check Route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Export wrapped Express app for Netlify
export const handler = serverless(app);
