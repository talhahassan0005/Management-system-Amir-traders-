'use client';

import { useEffect } from 'react';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export default function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Show user-friendly error message
      const errorMessage = event.reason?.message || 'An unexpected error occurred';
      console.error('Error:', errorMessage);
      
      // Prevent the default browser behavior
      event.preventDefault();
    };

    // Handle global JavaScript errors
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      // Show user-friendly error message
      const errorMessage = event.error?.message || 'An unexpected error occurred';
      console.error('Error:', errorMessage);
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
}
