// Backfill modelAnswers for old feedbacks in Firestore
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { google } = require("@ai-sdk/google");
const { generateText } = require("ai");
require("dotenv").config();

console.log("PRIVATE KEY:", process.env.FIREBASE_PRIVATE_KEY ? "Loaded" : "NOT FOUND");
// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
const db = getFirestore();

async function backfillModelAnswers() {
  const feedbacks = await db.collection("feedback").get();
  let updated = 0;
  for (const doc of feedbacks.docs) {
    const data = doc.data();
    if (data.modelAnswers && Array.isArray(data.modelAnswers) && data.modelAnswers.length > 0) {
      continue; // Already has model answers
    }
    // Fetch interview questions
    const interviewSnap = await db.collection("interviews").doc(data.interviewId).get();
    const interview = interviewSnap.data();
    const questions = interview?.questions || [];
    if (!questions.length) continue;
    // Generate model answers
    const prompt = `For each of the following interview questions, provide a model answer suitable for a ${interview?.role || "job"} at the ${interview?.level || "relevant"} level. Return the answers as a JSON array matching the order of the questions.\nQuestions: ${JSON.stringify(questions)}`;
    try {
      const { text: modelAnswersText } = await generateText({
        model: google("gemini-2.0-flash-001"),
        prompt,
      });
      console.log(`Gemini raw response for feedback ${doc.id}:`, modelAnswersText);
      let modelAnswers = [];
      try {
        // Remove triple backticks and language tag if present
        let cleanText = modelAnswersText.trim();
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        }
        const parsed = JSON.parse(cleanText);
        console.log(`Parsed type for feedback ${doc.id}:`, typeof parsed, Array.isArray(parsed) ? 'Array' : 'Not Array');
        console.log(`Parsed content for feedback ${doc.id}:`, parsed);
        if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === 'object' && parsed[0].answer) {
          modelAnswers = parsed.map(item => item.answer);
        } else if (Array.isArray(parsed)) {
          modelAnswers = parsed;
        } else {
          modelAnswers = [];
        }
        console.log(`Final modelAnswers for feedback ${doc.id}:`, modelAnswers);
      } catch (err) {
        console.log(`JSON parse error for feedback ${doc.id}:`, err);
        modelAnswers = [];
      }
      if (modelAnswers.length) {
        await doc.ref.update({ modelAnswers });
        updated++;
        console.log(`Updated feedback ${doc.id} with model answers.`);
      } else {
        console.log(`No model answers generated for feedback ${doc.id}.`);
      }
    } catch (err) {
      console.error(`Error updating feedback ${doc.id}:`, err);
    }
  }
  console.log(`Backfill complete. Updated ${updated} feedback documents.`);
}

backfillModelAnswers(); 