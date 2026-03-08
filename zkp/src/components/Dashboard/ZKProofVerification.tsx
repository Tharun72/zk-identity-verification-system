import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, CheckCircle, XCircle, Lock } from 'lucide-react';

interface Identity {
  id: string;
  kyc_completed: boolean;
}

interface ZKProofVerificationProps {
  identity: Identity;
}

interface Verification {
  type: string;
  result: boolean;
  message: string;
  proof_hash: string;
  verified_at: string;
}

export function ZKProofVerification({ identity }: ZKProofVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verification, setVerification] = useState<Verification | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDateInput, setShowDateInput] = useState(false);

  const verifyProof = async (verificationType: string) => {
    setError('');
    setVerification(null);
    setLoading(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const body: any = { verificationType };

      if (verificationType === 'age_over_18') {
        if (!dateOfBirth) {
          setShowDateInput(true);
          setLoading(false);
          return;
        }
        body.secretData = { dateOfBirth };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-proof`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }

      setVerification(result.verification);
      setShowDateInput(false);
      setDateOfBirth('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 lg:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-cyan-100 p-3 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-cyan-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Zero-Knowledge Proofs</h2>
      </div>

      <p className="text-gray-600 mb-6 text-sm">
        Prove claims about your identity without revealing the actual data. Your sensitive information remains private.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => verifyProof('kyc_completed')}
          disabled={loading || !identity.kyc_completed}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="w-5 h-5" />
          Prove KYC Completed
        </button>

        <button
          onClick={() => {
            if (!identity.kyc_completed) return;
            setShowDateInput(true);
          }}
          disabled={loading || !identity.kyc_completed}
          className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Lock className="w-5 h-5" />
          Prove Age &gt; 18
        </button>
      </div>

      {showDateInput && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your Date of Birth to generate proof
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={() => verifyProof('age_over_18')}
              disabled={!dateOfBirth || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
              Verify
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Your date of birth is used to generate a zero-knowledge proof. It is not stored or transmitted in plain text.
          </p>
        </div>
      )}

      {!identity.kyc_completed && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm">
          Complete KYC verification first to use zero-knowledge proofs
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {verification && (
        <div className={`border-2 rounded-lg p-6 ${verification.result ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center gap-3 mb-4">
            {verification.result ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
            <div>
              <h3 className={`text-xl font-bold ${verification.result ? 'text-green-800' : 'text-red-800'}`}>
                {verification.result ? 'Proof Verified' : 'Verification Failed'}
              </h3>
              <p className={`text-sm ${verification.result ? 'text-green-700' : 'text-red-700'}`}>
                {verification.message}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Proof Hash</label>
              <p className="text-xs font-mono text-gray-700 bg-white p-2 rounded break-all">
                {verification.proof_hash}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Verified At</label>
              <p className="text-sm text-gray-700">
                {new Date(verification.verified_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
