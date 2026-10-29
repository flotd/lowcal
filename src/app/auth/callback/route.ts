import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase-server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await serverSupabase();
  if (code && client) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/?auth_error=1", request.url));
}
