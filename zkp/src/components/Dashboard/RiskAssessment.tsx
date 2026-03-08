import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface RiskResult {
  score: number;
  level: "Low" | "Medium" | "High";
  factors: string[];
}

export function RiskAssessment() {
  const [risk, setRisk] = useState<RiskResult | null>(null);

  useEffect(() => {
    // Simulated AI risk analysis
    const score = Math.floor(Math.random() * 40) + 10;

    let level: "Low" | "Medium" | "High" = "Low";
    if (score > 60) level = "High";
    else if (score > 35) level = "Medium";

    setRisk({
      score,
      level,
      factors: [
        "Device fingerprint stability",
        "Login behavior pattern",
        "Recent DID activity",
      ],
    });
  }, []);

  if (!risk) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-100 p-3 rounded-xl">
          <Activity className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">
          AI Risk Assessment
        </h3>
      </div>

      <p className="text-gray-600 mb-4">
        Behavior-based identity risk score (simulated AI model)
      </p>

      <div className="mb-4">
        <div className="text-3xl font-bold text-gray-800">
          {risk.score}
        </div>
        <div
          className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
            risk.level === "Low"
              ? "bg-green-100 text-green-700"
              : risk.level === "Medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {risk.level} Risk
        </div>
      </div>

      <ul className="text-sm text-gray-600 space-y-1">
        {risk.factors.map((f, i) => (
          <li key={i}>• {f}</li>
        ))}
      </ul>
    </div>
  );
}
