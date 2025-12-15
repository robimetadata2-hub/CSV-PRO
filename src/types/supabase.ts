
export interface UserProfile {
  id: string;
  email: string;
  credits_used: number;
  is_premium: boolean;
  created_at?: string;
  updated_at?: string;
  expiration_date?: string | null;
}

export interface ImageMetadataGeneration {
  id: string;
  user_id: string;
  prompt: string;
  created_at?: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  email: string;
  session_id: string;
  last_activity: string;
}
