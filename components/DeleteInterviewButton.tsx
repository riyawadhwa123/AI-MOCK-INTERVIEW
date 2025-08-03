"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { deleteInterview } from "@/lib/actions/general.action";
import { useRouter } from "next/navigation";

interface DeleteInterviewButtonProps {
  interviewId: string;
  userId: string;
  interviewTitle: string;
}

const DeleteInterviewButton = ({ interviewId, userId, interviewTitle }: DeleteInterviewButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteInterview(interviewId, userId);
      if (result.success) {
        // Refresh the page to update the interview lists
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert("Failed to delete interview");
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs px-2 py-1"
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="text-xs px-2 py-1"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => setShowConfirm(true)}
      className="text-xs px-2 py-1"
      title={`Delete ${interviewTitle} interview`}
    >
      Delete
    </Button>
  );
};

export default DeleteInterviewButton; 