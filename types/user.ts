export type ProfileRole = {
  name: string;
  slug: string;
};

export type Profile = {
  id: string;
  username: string;
  created_at: string | null;
  role_id: number;
  bio: string | null;
  avatar_key: string | null;
  roles: ProfileRole[] | null;
};

export type ProfileTopic = {
  id: string;
  title: string;
  description: string | null;
  created_at: string | null;
};

export type ProfileComment = {
  id: string;
  content: string;
  created_at: string | null;
  id_topic: string;
};

export type ProfileReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};