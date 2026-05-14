export const generateQuizFromMaterials = async (courseTitle: string, description: string, materialsText: string) => {
  const response = await fetch("/api/ai/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseTitle, description, materialsText })
  });
  if (!response.ok) throw new Error("Failed to generate quiz");
  return response.json();
};

export const generateCareerAdvice = async (studentName: string, grades: Record<string, number>, strengths: string[]) => {
  const response = await fetch("/api/ai/career-advice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentName, grades, strengths })
  });
  if (!response.ok) throw new Error("Failed to generate advice");
  const data = await response.json();
  return data.text;
};
