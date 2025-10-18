import { useEffect, useRef } from 'react';

/**
 * Custom hook for silent auto-refresh of data
 * Polls the fetchFunction every intervalMs without visible page reload
 * @param fetchFunction - Function to fetch/refresh data
 * @param intervalMs - Polling interval in milliseconds (default: 10000 = 10 seconds)
 * @param enabled - Whether auto-refresh is enabled (default: true)
 */
export function useAutoRefresh(
  fetchFunction: () => void | Promise<void>,
  intervalMs: number = 10000,
  enabled: boolean = true
) {
  const fetchFnRef = useRef(fetchFunction);

  // Keep fetchFnRef updated
  useEffect(() => {
    fetchFnRef.current = fetchFunction;
  }, [fetchFunction]);

  useEffect(() => {
    if (!enabled) return;

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchFnRef.current();
    }, intervalMs);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [intervalMs, enabled]);
}
