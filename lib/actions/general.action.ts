"use server";

import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // Fetch interview questions
    const interview = await getInterviewById(interviewId);
    const questions = interview?.questions || [];

    // Generate model answers using Gemini
    let modelAnswers: string[] = [];
    if (questions.length > 0) {
      const { text: modelAnswersText } = await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt: `For each of the following interview questions, provide a model answer suitable for a ${interview?.role || "job"} at the ${interview?.level || "relevant"} level. Return the answers as a JSON array matching the order of the questions.\nQuestions: ${JSON.stringify(questions)}`,
      });
      console.log("Questions for model answers:", questions);
      console.log("Gemini returned:", modelAnswersText);
      try {
        let cleaned = modelAnswersText.trim();
        // Remove code block markers if present
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
        }
        // Try to extract the first JSON array if extra text is present
        const arrayMatch = cleaned.match(/\[.*\]/s);
        if (arrayMatch) {
          cleaned = arrayMatch[0];
        }
        modelAnswers = JSON.parse(cleaned);
      } catch (err) {
        console.error("Error parsing modelAnswers from Gemini:", err, modelAnswersText);
        modelAnswers = [];
      }
      console.log("Parsed modelAnswers:", modelAnswers);
    }

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
      modelAnswers, // Store model answers
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // Return empty array if userId is not provided
  if (!userId) {
    return [];
  }

  // Get all finalized interviews (without ordering to avoid index issues)
  const allInterviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .get();

  // Get interviews that the user has completed (has feedback for)
  const userFeedback = await db
    .collection("feedback")
    .where("userId", "==", userId)
    .get();

  const completedInterviewIds = new Set(
    userFeedback.docs.map(doc => doc.data().interviewId)
  );

  // Filter out interviews the user has already completed and sort by date
  const availableInterviews = allInterviews.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter((interview) => !completedInterviewIds.has(interview.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return availableInterviews as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getCompletedInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  // Return empty array if userId is not provided
  if (!userId) {
    return [];
  }

  // Get all feedback for this user
  const userFeedback = await db
    .collection("feedback")
    .where("userId", "==", userId)
    .get();

  const completedInterviewIds = userFeedback.docs.map(doc => doc.data().interviewId);

  if (completedInterviewIds.length === 0) {
    return [];
  }

  // Get the actual interview data for completed interviews
  const completedInterviews = await db
    .collection("interviews")
    .where("__name__", "in", completedInterviewIds)
    .get();

  return completedInterviews.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Interview[];
}

export async function deleteInterview(
  interviewId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if the user owns this interview
    const interview = await getInterviewById(interviewId);
    if (!interview) {
      return { success: false, error: "Interview not found" };
    }

    if (interview.userId !== userId) {
      return { success: false, error: "You can only delete your own interviews" };
    }

    // Delete associated feedback first
    const feedbackQuery = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .get();

    const deleteFeedbackPromises = feedbackQuery.docs.map(doc => doc.ref.delete());
    await Promise.all(deleteFeedbackPromises);

    // Delete the interview
    await db.collection("interviews").doc(interviewId).delete();

    return { success: true };
  } catch (error) {
    console.error("Error deleting interview:", error);
    return { success: false, error: "Failed to delete interview" };
  }
}
