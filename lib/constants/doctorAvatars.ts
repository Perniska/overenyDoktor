export const DOCTOR_AVATARS = Array.from({ length: 4 }, (_, index) => {
  const number = index + 1;

  return {
    key: `doctor-${number}`,
    label: `Lekár ${number}`,
    src: `/doctor-avatars/doctor-${number}.png`,
  };
});

export function getDoctorAvatarByKey(key?: string | null) {
  return DOCTOR_AVATARS.find((avatar) => avatar.key === key) ?? DOCTOR_AVATARS[0];
}