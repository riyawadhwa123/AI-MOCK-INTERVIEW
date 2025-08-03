import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const interviewFieldsSchema = z.object({
  role: z.string(),
  level: z.string(),
  techstack: z.string(),
  type: z.string(),
  amount: z.number(),
});

export async function POST(req: Request) {
  const { transcript } = await req.json();

  try {
    // Improved prompt with examples and fallback instructions
    const prompt = `You are an expert at extracting structured data from conversations. Given the transcript of a conversation where a user is creating a mock interview, extract the following fields and return them as a JSON object:
- role (job role, e.g. Frontend Developer)
- level (junior, mid, or senior)
- techstack (comma separated, e.g. React, TypeScript)
- type (technical, behavioral, or mixed)
- amount (number of questions)

If a field is missing, make your best guess based on the context or use these defaults:
- level: junior
- type: technical
- amount: 5

**Examples:**

Transcript:
"""
I want to practice for a Frontend Developer job. I'm a junior. Let's focus on React and TypeScript. Make it technical. 7 questions please.
"""
JSON:
{"role": "Frontend Developer", "level": "junior", "techstack": "React, TypeScript", "type": "technical", "amount": 7}

Transcript:
"""
Can you make a mixed interview for a senior backend developer? Use Node.js, Express, and MongoDB. 10 questions.
"""
JSON:
{"role": "Backend Developer", "level": "senior", "techstack": "Node.js, Express, MongoDB", "type": "mixed", "amount": 10}

Now extract the fields from this transcript:
"""
${transcript}
"""
Return only the JSON object.`;

    // Log the transcript for debugging
    console.log("[Extract Interview Fields] Transcript:\n", transcript);

    const { object: fields, raw } = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: interviewFieldsSchema,
      prompt,
      raw: true,
    });

    // Log Gemini's raw response for debugging
    console.log("[Extract Interview Fields] Gemini raw response:\n", raw);
    console.log("[Extract Interview Fields] Parsed fields:", fields);

    return Response.json({ success: true, fields });
  } catch (error) {
    console.error("[Extract Interview Fields] Error:", error);
    return Response.json({ success: false, error: error?.toString?.() || "Unknown error" }, { status: 500 });
  }
} 