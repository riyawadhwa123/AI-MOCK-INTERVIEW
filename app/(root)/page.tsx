import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import CreateInterviewForm from "@/components/CreateInterviewForm";
import LogoutButton from "@/components/LogoutButton";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getCompletedInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

async function Home() {
  const user = await getCurrentUser();

  // If no user is authenticated, redirect to sign-in
  if (!user?.id) {
    redirect('/sign-in');
  }

  const [completedInterviews, availableInterviews] = await Promise.all([
    getCompletedInterviewsByUserId(user.id),
    getLatestInterviews({ userId: user.id }),
  ]);

  const hasCompletedInterviews = completedInterviews?.length! > 0;
  const hasAvailableInterviews = availableInterviews?.length! > 0;

  return (
    <>
      {/* Fixed Logout Button at top right */}
      <LogoutButton />

      {/* Hero Section */}
      <section className="card-cta mb-8">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <div className="flex gap-4 max-sm:flex-col">
          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
            <Button asChild variant="outline" className="max-sm:w-full">
              <Link href="/resume-analyzer">Analyze Resume</Link>
            </Button>
          </div>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* Create Interview Form below hero */}
      <div className="mb-10">
        {user?.id && <CreateInterviewForm userId={user.id} />}
      </div>

      {/* Interviews Section */}
      <section className="flex flex-col gap-6 mt-8">
        <h2>Your Completed Interviews</h2>

        <div className="interviews-section">
          {hasCompletedInterviews ? (
            completedInterviews?.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p>You haven&apos;t completed any interviews yet</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6 mt-8">
        <h2>Available Interviews to Take</h2>

        <div className="interviews-section">
          {hasAvailableInterviews ? (
            availableInterviews?.map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p>No interviews available to take. Create a new interview to get started!</p>
          )}
        </div>
      </section>
    </>
  );
}

export default Home;
