import { signOut } from "@/lib/actions/auth.action";
 
export async function POST() {
  await signOut();
  return Response.json({ success: true });
} 