import { useState, useEffect } from 'react';
import { getNotices } from '../services/noticeService';

export function useNotices(roomId) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    getNotices(roomId)
      .then(setNotices)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [roomId]);

  return { notices, loading, error };
}
