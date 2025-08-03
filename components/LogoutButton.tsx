"use client";
import { useRouter } from "next/navigation";

const LogoutButton = ({ className = "" }: { className?: string }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/sign-in");
  };

  return (
    <button
      onClick={handleLogout}
      className={`fixed top-6 right-8 z-50 px-5 py-2 rounded-full bg-primary-200 text-black font-semibold shadow-md hover:bg-primary-100 transition ${className}`}
      style={{ minWidth: 100 }}
    >
      Logout
    </button>
  );
};

export default LogoutButton; 