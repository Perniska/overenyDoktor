export const AVATARS = Array.from({ length: 21 }, (_, index) => {
  const number = index + 1;

  return {
    key: `avatar-${number}`,
    label: `Avatar ${number}`,
    src: `/avatars/avatar-${number}.png`,
  };
});

export type AvatarKey = (typeof AVATARS)[number]["key"];

export function getAvatarByKey(key?: string | null) {
  return AVATARS.find((avatar) => avatar.key === key) ?? AVATARS[0];
}