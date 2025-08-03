import { getInterviewById, getFeedbackByInterviewId } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

const AnswersPage = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user?.id!,
  });

  // For demo: Assume transcript is not stored, so just show questions and model answers
  // If you store user answers, fetch and display them here
  const questions = interview.questions || [];
  const modelAnswers = feedback?.modelAnswers || [];

  return (
    <section className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Model Answers</h1>
      <div className="flex flex-col gap-8">
        {questions.map((q, i) => (
          <div key={i} className="bg-dark-200 rounded-lg p-6 shadow">
            <p className="font-semibold text-lg mb-2">Q{i + 1}: {q}</p>
            {/* User answer placeholder (if available) */}
            {/* <p className="mb-1"><span className="font-bold">Your answer:</span> ...</p> */}
            <p className="mb-1"><span className="font-bold">Model answer:</span> {typeof modelAnswers[i] === "string"
              ? modelAnswers[i]
              : modelAnswers[i] && typeof modelAnswers[i] === "object"
                ? modelAnswers[i].answer || <span className="italic text-muted">Not available</span>
                : <span className="italic text-muted">Not available</span>}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AnswersPage; 