import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { dateOfBirth, idNumber } = await req.json();

    if (!dateOfBirth || !idNumber) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: dateOfBirth and idNumber" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dobHash = await hashString(dateOfBirth);
    const idNumberHash = await hashString(idNumber);

    const { data: identity, error: fetchError } = await supabase
      .from("identities")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !identity) {
      return new Response(
        JSON.stringify({ error: "Identity not found. Please create DID first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updatedIdentity, error: updateError } = await supabase
      .from("identities")
      .update({
        dob_hash: dobHash,
        id_number_hash: idNumberHash,
        kyc_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq("id", identity.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: "kyc_completed",
      risk_score: 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "KYC data uploaded successfully",
        identity: updatedIdentity
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
