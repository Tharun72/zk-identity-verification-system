import { Fingerprint, Hash, Calendar, CheckCircle, XCircle } from 'lucide-react';

interface Identity {
  id: string;
  did: string;
  identity_hash: string;
  kyc_completed: boolean;
  blockchain_hash: string;
  created_at: string;
}

interface DIDCardProps {
  identity: Identity;
}

export function DIDCard({ identity }: DIDCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <Fingerprint className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Your Identity</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Decentralized ID (DID)
          </label>
          <p className="mt-1 text-sm font-mono text-gray-800 bg-gray-50 p-3 rounded-lg break-all">
            {identity.did}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Identity Hash
          </label>
          <p className="mt-1 text-xs font-mono text-gray-600 bg-gray-50 p-3 rounded-lg break-all">
            {identity.identity_hash}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Blockchain Hash
          </label>
          <p className="mt-1 text-xs font-mono text-gray-600 bg-gray-50 p-3 rounded-lg break-all">
            {identity.blockchain_hash}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Created: {new Date(identity.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {identity.kyc_completed ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">KYC Complete</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">KYC Pending</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
