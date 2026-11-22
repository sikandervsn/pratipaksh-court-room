import { hasLiveKey, providerLabel } from "@/lib/claude";
import { authEnabled } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ live: hasLiveKey(), model: providerLabel(), auth: authEnabled });
}
