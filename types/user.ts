export type Profile = {
  id: string;
  username: string;
  is_banned: boolean;
  created_at: string | null;
  role_id: number;
  deleted_at: string | null;
  anonymized_at: string | null;
  bio: string | null;
  avatar_key: string | null;
};