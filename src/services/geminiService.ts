import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const generateQuizFromMaterials = async (courseTitle: string, description: string, materialsText: string) => {
  const model = "gemini-3-flash-preview";
  const prompt = `Ești un asistent academic expert. Generează un test grilă (quiz) în limba română pentru cursul "${courseTitle}".
  Descriere: ${description}
  Materiale: ${materialsText}
  
  Cerințe:
  - Generează 5 întrebări relevante.
  - Fiecare întrebare trebuie să aibă 4 variante de răspuns.
  - Specifică indexul corect (0-3).
  - Testul trebuie să fie echilibrat ca dificultate.`;

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

  return JSON.parse(response.text || "[]");
};

export const generateCareerAdvice = async (studentName: string, grades: Record<string, number>, strengths: string[]) => {
  const model = "gemini-3-flash-preview";
  const gradesStr = Object.entries(grades).map(([subject, grade]) => `${subject}: ${grade}`).join(", ");
  const prompt = `Analizează performanța academică a studentului ${studentName}.
  Note: ${gradesStr}
  Puncte forte: ${strengths.join(", ")}
  
  Oferă recomandări personalizate de carieră și joburi în limba română (aproximativ 250 cuvinte). 
  Include:
  1. Top 3 domenii potrivite.
  2. Tipuri de roluri specifice.
  3. Sugestii pentru dezvoltare ulterioară (skills de învățat).
  Folosește un ton încurajator și profesional.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text;
};
