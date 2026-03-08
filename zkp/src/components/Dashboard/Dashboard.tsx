import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, Shield } from "lucide-react";
import { DIDCard } from "./DIDCard";
import { KYCUpload } from "./KYCUpload";
import { ZKProofVerification } from "./ZKProofVerification";
import { RiskAssessment } from "./RiskAssessment";

interface Identity {
  did: string;
  created_at: string;
  kyc_completed: boolean;
}

export function Dashboard() {
  const { user, signOut } = useAuth();

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load DID + KYC status from localStorage on refresh
  useEffect(() => {
    const storedDid = localStorage.getItem("did");
    const kycDone = localStorage.getItem("kycCompleted") === "true";

    if (storedDid) {
      setIdentity({
        did: storedDid,
        created_at: new Date().toISOString(),
        kyc_completed: kycDone,
      });
    }
  }, []);

  const createDID = () => {
    try {
      setLoading(true);

      const newDid = `did:zk:${crypto.randomUUID()}`;
      localStorage.setItem("did", newDid);
      localStorage.removeItem("kycCompleted"); // reset KYC on new DID

      setIdentity({
        did: newDid,
        created_at: new Date().toISOString(),
        kyc_completed: false,
      });

      setError(null);
    } catch {
      setError("Failed to create DID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                ZK Identity Dashboard
              </h1>
              <p className="text-blue-200">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* No Identity */}
        {!identity ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Create Your Decentralized Identity
            </h2>
            <p className="text-gray-600 mb-6">
              Generate a unique DID to start using zero-knowledge proofs
            </p>

            <button
              onClick={createDID}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create DID"}
            </button>
          </div>
        ) : (
          /* Identity Exists */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DIDCard identity={identity} />
            <RiskAssessment />

            <KYCUpload
              identity={identity}
              onUpdate={() =>
                setIdentity({
                  ...identity,
                  kyc_completed: true,
                })
              }
            />

            <ZKProofVerification identity={identity} />
          </div>
        )}
      </div>
    </div>
  );
}
