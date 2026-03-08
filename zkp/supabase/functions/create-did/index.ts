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

    const { data: existingIdentity } = await supabase
      .from("identities")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingIdentity) {
      return new Response(
        JSON.stringify({
          message: "DID already exists",
          identity: existingIdentity
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const did = `did:zkid:${crypto.randomUUID()}`;
    const identityData = `${user.id}:${user.email}:${Date.now()}`;
    const identityHash = await hashString(identityData);
    const blockchainHash = await hashString(`${did}:${identityHash}:${Date.now()}`);

    const { data: newIdentity, error: insertError } = await supabase
      .from("identities")
      .insert({
        user_id: user.id,
        did: did,
        identity_hash: identityHash,
        blockchain_hash: blockchainHash,
        kyc_completed: false
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: "did_created",
      risk_score: 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        identity: newIdentity,
        message: "Decentralized Identity created successfully"
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
