// Single refresh for concurrent 401s. Never apply an old refresh to another login.
export function createSessionRecovery({ getTokens, setTokens, refreshTokens, onExpired }) {
  let pending = null;

  function matches(left, right) {
    return !!left && !!right && left.access === right.access && left.refresh === right.refresh;
  }

  function expire(expected) {
    if (!matches(getTokens(), expected)) return;
    setTokens(null);
    onExpired();
  }

  async function recover(failedSession) {
    const current = getTokens();
    if (!current || !failedSession?.access) return null;
    if (!matches(current, failedSession)) {
      // An already refreshed token is usable only for the same refresh session.
      return failedSession.refresh && current.refresh === failedSession.refresh ? current.access : null;
    }
    if (!current.refresh) { expire(current); return null; }
    if (pending?.refresh === current.refresh) return pending.promise;

    const attempt = { refresh: current.refresh };
    attempt.promise = (async () => {
      try {
        const renewed = await refreshTokens(current.refresh);
        const latest = getTokens();
        if (!matches(latest, current)) {
          return latest?.refresh === current.refresh ? latest.access : null;
        }
        const next = { ...current, ...renewed, refresh: renewed.refresh || current.refresh };
        setTokens(next);
        return next.access;
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          expire(current);
          return null;
        }
        throw error;
      } finally {
        if (pending === attempt) pending = null;
      }
    })();
    pending = attempt;
    return attempt.promise;
  }

  return { recover, expire };
}
