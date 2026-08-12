import { apiRequest, ApiError } from "./client";

/**
 * Fetch the student profile for the logged-in user.
 * Returns null when none exists yet (404).
 */
export async function getStudentProfile() {
  try {
    return await apiRequest("/api/students/me/", { method: "GET", auth: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/** @deprecated Use getStudentProfile */
export const getPrimaryStudent = getStudentProfile;

/**
 * Create or fully replace the student profile (onboarding save).
 * Payload uses camelCase keys matching the backend serializer.
 */
export async function saveStudentProfile(profile) {
  return apiRequest("/api/students/me/", {
    method: "PUT",
    auth: true,
    json: {
      name: profile.name,
      grade: profile.grade || "",
      avatar: profile.avatar || "sparkles",
      country: profile.country || "",
      countryFlag: profile.countryFlag || "",
      schoolName: profile.schoolName || "",
      schoolType: profile.schoolType || "",
      curriculum: profile.curriculum || "",
      academicTarget: profile.academicTarget || "",
      learningStyle: profile.learningStyle || "visual",
      interests: profile.interests || [],
      goal: profile.goal || "",
      isOnboarded: true,
      digestOptIn: profile.digestOptIn ?? false,
      familyEmail: profile.familyEmail || "",
    },
  });
}

/** @deprecated Use saveStudentProfile */
export const savePrimaryStudent = saveStudentProfile;

/**
 * Partial update of the student profile.
 */
export async function patchStudentProfile(partial) {
  return apiRequest("/api/students/me/", {
    method: "PATCH",
    auth: true,
    json: partial,
  });
}

/** @deprecated Use patchStudentProfile */
export const patchPrimaryStudent = patchStudentProfile;
