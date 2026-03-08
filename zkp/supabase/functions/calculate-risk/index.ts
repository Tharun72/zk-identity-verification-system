import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function calculateRiskScore(
  loginCount: number,
  hourOfDay: number,
  userAgent: string,
  recentActivities: any[]
): { score: number; level: string; factors: string[] } {
  let riskScore = 0;
  const factors: string[] = [];

  if (loginCount < 3) {
    riskScore += 25;
    factors.push("New user (low login count)");
  } else if (loginCount > 50) {
    riskScore -= 10;
    factors.push("Established user (high login count)");
  }

  if (hourOfDay >= 0 && hourOfDay < 6) {
    riskScore += 20;
    factors.push("Unusual time of access (late night/early morning)");
  } else if (hourOfDay >= 9 && hourOfDay < 17) {
    riskScore -= 5;
    factors.push("Normal business hours");
  }

  const suspiciousUserAgents = ["bot", "crawler", "spider", "scraper"];
  const lowerUserAgent = userAgent.toLowerCase();
  if (suspiciousUserAgents.some(ua => lowerUserAgent.includes(ua))) {
    riskScore += 40;
    factors.push("Suspicious user agent detected");
  }

  if (recentActivities.length > 10) {
    riskScore += 15;
    factors.push("High activity volume in short period");
  }

  const activityTypes = recentActivities.map(a => a.activity_type);
  const failedAttempts = activityTypes.filter(t => t.includes("failed")).length;
  if (failedAttempts > 2) {
    riskScore += 30;
    factors.push("Multiple failed attempts detected");
  }

  const uniqueIPs = new Set(recentActivities.map(a => a.ip_address)).size;
  if (uniqueIPs > 5) {
    riskScore += 25;
    factors.push("Multiple IP addresses used");
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  let level = "LOW";
  if (riskScore >= 60) {
    level = "HIGH";
  } else if (riskScore >= 30) {
    level = "MEDIUM";
  }

  return { score: riskScore, level, factors };
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

    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const { data: activities, error: activitiesError } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (activitiesError) {
      throw activitiesError;
    }

    const loginCount = activities?.length || 0;
    const currentHour = new Date().getHours();

    const recentActivities = activities?.slice(0, 10) || [];

    const riskAssessment = calculateRiskScore(
      loginCount,
      currentHour,
      userAgent,
      recentActivities
    );

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: "risk_assessment",
      ip_address: ipAddress,
      user_agent: userAgent,
      risk_score: riskAssessment.score
    });

    return new Response(
      JSON.stringify({
        success: true,
        risk: {
          score: riskAssessment.score,
          level: riskAssessment.level,
          factors: riskAssessment.factors,
          metadata: {
            loginCount,
            currentHour,
            recentActivityCount: recentActivities.length
          }
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
