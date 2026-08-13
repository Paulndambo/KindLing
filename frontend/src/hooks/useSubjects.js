import { useState, useCallback, useEffect, useRef } from "react";
import {
  listSubjects,
  createSubject as apiCreateSubject,
  deleteSubject as apiDeleteSubject,
  createTopic as apiCreateTopic,
  deleteTopic as apiDeleteTopic,
} from "../services/api/subjects";
import { ApiError } from "../services/api/client";

/**
 * Subjects & topics for the logged-in student, loaded from the API.
 * Empty when logged out or before a student profile exists.
 */
export function useSubjects({
  isLoggedIn = false,
  hasStudentProfile = false,
  studentId = null,
} = {}) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mutating, setMutating] = useState(false);
  const fetchKey = useRef(null);

  const loadSubjects = useCallback(async () => {
    if (!isLoggedIn || !hasStudentProfile) {
      setSubjects([]);
      setError("");
      return [];
    }
    setLoading(true);
    setError("");
    try {
      const rows = await listSubjects();
      setSubjects(rows);
      return rows;
    } catch (err) {
      // No profile yet → empty list (not a hard failure for the subjects UI)
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        setSubjects([]);
        return [];
      }
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not load your subjects.";
      setError(message);
      console.warn("Subjects load failed:", err);
      setSubjects([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, hasStudentProfile]);

  useEffect(() => {
    if (!isLoggedIn || !hasStudentProfile) {
      fetchKey.current = null;
      setSubjects([]);
      setError("");
      return;
    }
    const key = `student-subjects:${studentId || "me"}`;
    if (fetchKey.current === key) return;
    fetchKey.current = key;
    loadSubjects();
  }, [isLoggedIn, hasStudentProfile, studentId, loadSubjects]);

  const createSubject = useCallback(
    async (subj) => {
      if (!isLoggedIn || !hasStudentProfile) {
        throw new Error("Complete your student profile before adding subjects.");
      }
      setMutating(true);
      setError("");
      try {
        const created = await apiCreateSubject(subj);
        setSubjects((prev) => [...prev, created]);
        return created;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Could not create subject.";
        setError(message);
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [isLoggedIn, hasStudentProfile]
  );

  const addTopic = useCallback(
    async (subjId, topicInput) => {
      const payload =
        typeof topicInput === "string"
          ? { name: topicInput }
          : topicInput || {};
      const name = (payload.name || "").trim();
      if (!name) return null;
      setMutating(true);
      setError("");
      try {
        const subject = subjects.find((s) => s.id === subjId);
        const sortOrder = subject?.topics?.length || 0;
        const topic = await apiCreateTopic(
          subjId,
          {
            name,
            familiarity: payload.familiarity || "new",
            learningGoal: payload.learningGoal || payload.learning_goal || "",
            sortOrder,
          },
          sortOrder
        );
        setSubjects((prev) =>
          prev.map((s) =>
            s.id === subjId
              ? { ...s, topics: [...(s.topics || []), topic] }
              : s
          )
        );
        return topic;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Could not add topic.";
        setError(message);
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [subjects]
  );

  const deleteSubject = useCallback(async (subjId) => {
    setMutating(true);
    setError("");
    try {
      await apiDeleteSubject(subjId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjId));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete subject.";
      setError(message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  const deleteTopic = useCallback(async (subjId, topicId) => {
    setMutating(true);
    setError("");
    try {
      await apiDeleteTopic(topicId);
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjId
            ? { ...s, topics: s.topics.filter((t) => t.id !== topicId) }
            : s
        )
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not delete topic.";
      setError(message);
      throw err;
    } finally {
      setMutating(false);
    }
  }, []);

  return {
    subjects,
    loading,
    mutating,
    error,
    setError,
    refreshSubjects: loadSubjects,
    createSubject,
    addTopic,
    deleteSubject,
    deleteTopic,
  };
}
