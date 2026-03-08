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

function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
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

    const { verificationType, secretData } = await req.json();

    if (!verificationType) {
      return new Response(
        JSON.stringify({ error: "Missing verificationType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: identity, error: fetchError } = await supabase
      .from("identities")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !identity) {
      return new Response(
        JSON.stringify({ error: "Identity not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let proofResult = false;
    let proofMessage = "";

    if (verificationType === "age_over_18") {
      if (!secretData || !secretData.dateOfBirth) {
        return new Response(
          JSON.stringify({ error: "Missing dateOfBirth for age verification" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const dobHash = await hashString(secretData.dateOfBirth);

      if (dobHash !== identity.dob_hash) {
        return new Response(
          JSON.stringify({ error: "Invalid proof: Date of birth does not match stored hash" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const age = calculateAge(secretData.dateOfBirth);
      proofResult = age >= 18;
      proofMessage = proofResult ? "Verified: Age is 18 or above" : "Verification failed: Age is below 18";

    } else if (verificationType === "kyc_completed") {
      proofResult = identity.kyc_completed;
      proofMessage = proofResult ? "Verified: KYC is completed" : "Verification failed: KYC not completed";

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid verification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const proofHash = await hashString(`${verificationType}:${proofResult}:${Date.now()}`);

    const { data: verification, error: insertError } = await supabase
      .from("verifications")
      .insert({
        identity_id: identity.id,
        verification_type: verificationType,
        proof_result: proofResult,
        proof_hash: proofHash
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: `verification_${verificationType}`,
      risk_score: 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        verification: {
          type: verificationType,
          result: proofResult,
          message: proofMessage,
          proof_hash: proofHash,
          verified_at: verification.verified_at
        }
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
