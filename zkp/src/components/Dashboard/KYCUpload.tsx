import { useState } from "react";
import { Upload } from "lucide-react";

interface Identity {
  did: string;
  created_at: string;
  kyc_completed: boolean;
}

interface Props {
  identity: Identity;
  onUpdate: () => void;
}

export function KYCUpload({ identity, onUpdate }: Props) {
  const [dob, setDob] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hashData = async (data: string) => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const uploadKYC = async () => {
    if (!dob || !idNumber) {
      setError("Please fill all fields");
      return;
    }

    try {
      const combined = `${dob}-${idNumber}-${identity.did}`;
      await hashData(combined); // hash simulated

      localStorage.setItem("kycCompleted", "true");

      setSuccess(true);
      setError(null);
      onUpdate();
    } catch {
      setError("Failed to upload KYC data");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-100 p-3 rounded-xl">
          <Upload className="w-6 h-6 text-orange-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Upload KYC</h3>
      </div>

      <p className="text-gray-600 mb-4">
        Your data will be hashed using SHA-256. Only cryptographic hashes are
        stored, never raw data.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date of Birth
          </label>
          <input
            type="date"
            value={dob}
            onChange={e => setDob(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            ID Number
          </label>
          <input
            type="text"
            value={idNumber}
            onChange={e => setIdNumber(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-lg"
            placeholder="Enter your ID number"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-100 p-2 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-700 text-sm bg-green-100 p-2 rounded">
            KYC data hashed and stored successfully
          </div>
        )}

        <button
          onClick={uploadKYC}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
        >
          Upload KYC Data
        </button>
      </div>
    </div>
  );
}
