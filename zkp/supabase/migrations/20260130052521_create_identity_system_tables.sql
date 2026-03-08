/*
  # Blockchain-Based Decentralized Identity System

  1. New Tables
    - `identities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `did` (text, unique decentralized identifier)
      - `identity_hash` (text, SHA-256 hash of identity data)
      - `dob_hash` (text, hashed date of birth)
      - `id_number_hash` (text, hashed ID number)
      - `kyc_completed` (boolean, KYC status)
      - `blockchain_hash` (text, immutable blockchain-style hash)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `verifications`
      - `id` (uuid, primary key)
      - `identity_id` (uuid, foreign key to identities)
      - `verification_type` (text, e.g., 'age_over_18', 'kyc_status')
      - `proof_result` (boolean)
      - `proof_hash` (text, cryptographic proof)
      - `verified_at` (timestamptz)
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `activity_type` (text, e.g., 'login', 'verification')
      - `ip_address` (text)
      - `user_agent` (text)
      - `risk_score` (numeric, 0-100)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Ensure users can only access their own identity records
*/

-- Create identities table
CREATE TABLE IF NOT EXISTS identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  did text UNIQUE NOT NULL,
  identity_hash text NOT NULL,
  dob_hash text,
  id_number_hash text,
  kyc_completed boolean DEFAULT false,
  blockchain_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid REFERENCES identities(id) ON DELETE CASCADE NOT NULL,
  verification_type text NOT NULL,
  proof_result boolean NOT NULL,
  proof_hash text NOT NULL,
  verified_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  ip_address text,
  user_agent text,
  risk_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for identities table
CREATE POLICY "Users can view own identity"
  ON identities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identity"
  ON identities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own identity"
  ON identities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for verifications table
CREATE POLICY "Users can view own verifications"
  ON verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM identities
      WHERE identities.id = verifications.identity_id
      AND identities.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own verifications"
  ON verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM identities
      WHERE identities.id = verifications.identity_id
      AND identities.user_id = auth.uid()
    )
  );

-- Policies for activity_logs table
CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_did ON identities(did);
CREATE INDEX IF NOT EXISTS idx_verifications_identity_id ON verifications(identity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);