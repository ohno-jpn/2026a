import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabase();

  const { data: activity, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: zones } = await supabase
    .from("hr_zones")
    .select("zone,seconds,percentage")
    .eq("activity_id", id)
    .order("zone");

  return NextResponse.json({ activity, zones: zones ?? [] });
}
