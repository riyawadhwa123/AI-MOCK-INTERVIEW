import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Simple text extraction for now - we'll focus on DOCX files
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // For now, return a message asking for DOCX format
  // We can implement proper PDF parsing later
  return "PDF parsing is temporarily disabled. Please upload your resume in DOCX format for the best experience.";
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume") as File;
    const jobDescFile = formData.get("jobDescription") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF or DOCX file." },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempFilePath = join(tmpdir(), `resume-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    let resumeText = "";
    let jobDescText = "";
    let jobDescTempFilePath = "";
    if (jobDescFile) {
      const jobDescBytes = await jobDescFile.arrayBuffer();
      const jobDescBuffer = Buffer.from(jobDescBytes);
      jobDescTempFilePath = join(tmpdir(), `jobdesc-${Date.now()}-${jobDescFile.name}`);
      await writeFile(jobDescTempFilePath, jobDescBuffer);
    }

    try {
      // Extract text based on file type
      if (file.type === "application/pdf") {
        resumeText = await extractTextFromPDF(buffer);
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const result = await mammoth.extractRawText({ buffer });
        resumeText = result.value;
      }
      if (jobDescFile) {
        if (jobDescFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const jobDescResult = await mammoth.extractRawText({ buffer: Buffer.from(await jobDescFile.arrayBuffer()) });
          jobDescText = jobDescResult.value;
        }
      }
      if (!resumeText.trim()) {
        throw new Error("Could not extract text from the file");
      }
    } finally {
      // Clean up temporary file
      try {
        await unlink(tempFilePath);
        if (jobDescTempFilePath) await unlink(jobDescTempFilePath);
      } catch (error) {
        console.error("Error deleting temp file:", error);
      }
    }

    // Analyze with Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an expert resume analyzer and career coach. Analyze the following resume and provide a comprehensive analysis in JSON format.

Resume Content:
${resumeText}

Please provide your analysis in the following JSON structure:
{
  "summary": "A 2-3 sentence summary of the candidate's background and experience",
  "strengths": ["strength1", "strength2", "strength3", "strength4"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "suggestedQuestions": ["question1", "question2", "question3", "question4", "question5"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Guidelines:
- Focus on technical skills, experience, and achievements
- Identify both strengths and areas for improvement
- Suggest relevant interview questions based on their background
- Provide actionable recommendations for improvement
- Keep each item concise but specific
- Make sure the response is valid JSON
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    let analysis;
    try {
      // Try to find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      return NextResponse.json(
        { error: "Failed to analyze resume. Please try again." },
        { status: 500 }
      );
    }

    // Validate the analysis structure
    const requiredFields = ["summary", "strengths", "weaknesses", "suggestedQuestions", "recommendations"];
    for (const field of requiredFields) {
      if (!analysis[field]) {
        analysis[field] = field === "summary" ? "Analysis completed successfully." : [];
      }
    }

    let matchResult = null;
    let matchScore = null;
    let matchedSkills = null;
    let missingSkills = null;
    let sectionMatches = null;
    let resumeImprovementTips = null;
    let missingKeywords = null;
    let atsScore = null;
    let atsSections = null;
    let languageTone = null;
    let grammarSpelling = null;
    let jobDescriptionSummary = null;
    let topJobRequirements = null;
    if (jobDescText.trim()) {
      // Compose a prompt to compare/match resume and job description
      const matchPrompt = `You are an expert career coach and resume/job description matcher. Given the following resume and job description, do the following:
1. List the required skills from the job description that are present in the resume (matchedSkills).
2. List the required skills from the job description that are missing in the resume (missingSkills).
3. For each job requirement, indicate which section(s) of the resume (Experience, Education, Projects, Skills, etc.) match it (sectionMatches).
4. Give a numeric match score (0-100) representing how well the resume matches the job description (matchScore).
5. Provide a concise summary (3-5 sentences) of how well the resume matches the job description, highlighting key matches and gaps (matchResult).
6. Suggest actionable resume improvement tips to better match the job description (resumeImprovementTips).
7. List important keywords from the job description that are missing in the resume (missingKeywords).
8. Simulate an ATS (Applicant Tracking System) and provide an atsScore (0-100) for how well the resume would pass an ATS for this job, and list the atsSections (how the resume would be split: Experience, Education, Skills, Projects, etc.).
9. Analyze the language and tone of the resume for professionalism (languageTone), and provide grammar and spelling feedback (grammarSpelling).
10. Summarize the job description in plain language (jobDescriptionSummary) and list the top 5 requirements (topJobRequirements).

Return your answer as a JSON object with keys: matchedSkills (array), missingSkills (array), sectionMatches (array of objects with requirement and matchedSections), matchScore (number), matchResult (string), resumeImprovementTips (array), missingKeywords (array), atsScore (number), atsSections (array), languageTone (string), grammarSpelling (string), jobDescriptionSummary (string), topJobRequirements (array).

Resume:
${resumeText}

Job Description:
${jobDescText}`;
      const matchResultGen = await model.generateContent(matchPrompt);
      const matchText = await matchResultGen.response.text();
      try {
        const matchJson = JSON.parse(matchText.match(/\{[\s\S]*\}/)?.[0] || '{}');
        matchResult = matchJson.matchResult || null;
        matchScore = matchJson.matchScore || null;
        matchedSkills = matchJson.matchedSkills || null;
        missingSkills = matchJson.missingSkills || null;
        sectionMatches = matchJson.sectionMatches || null;
        resumeImprovementTips = matchJson.resumeImprovementTips || null;
        missingKeywords = matchJson.missingKeywords || null;
        atsScore = matchJson.atsScore || null;
        atsSections = matchJson.atsSections || null;
        languageTone = matchJson.languageTone || null;
        grammarSpelling = matchJson.grammarSpelling || null;
        jobDescriptionSummary = matchJson.jobDescriptionSummary || null;
        topJobRequirements = matchJson.topJobRequirements || null;
      } catch (e) {
        matchResult = matchText.trim();
      }
    }
    return NextResponse.json({
      ...analysis,
      matchResult,
      matchScore,
      matchedSkills,
      missingSkills,
      sectionMatches,
      resumeImprovementTips,
      missingKeywords,
      atsScore,
      atsSections,
      languageTone,
      grammarSpelling,
      jobDescriptionSummary,
      topJobRequirements
    });

  } catch (error) {
    console.error("Resume analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume. Please try again." },
      { status: 500 }
    );
  }
} 