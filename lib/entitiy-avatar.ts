export const FACILITY_AVATAR_SRC = "/doctor_avatars/medical-staff-t.png";

export function getDoctorAvatarSrc(doctor: {
  first_name?: string | null;
  title?: string | null;
  raw_name?: string | null;
}) {
  const firstName = doctor.first_name?.trim() ?? "";
  const rawName = doctor.raw_name?.toLowerCase() ?? "";

  const femaleByFirstName =
    firstName.endsWith("a") ||
    firstName.endsWith("á") ||
    firstName.endsWith("ia") ||
    firstName.endsWith("ína");

  const femaleByRawName =
    rawName.includes("(sestra)") ||
    rawName.includes("lekárka") ||
    rawName.includes("doktorka");

  if (femaleByFirstName || femaleByRawName) {
    return "/doctor_avatars/medical-staff-s.png";
  }

  return "/doctor_avatars/medical-staff-sm.png";
}