
'use client';

import { useState, useEffect } from 'react';

type AriaLiveProps = {
  message: string;
};

/**
 * A client component that renders a visually hidden div with aria-live="polite".
 * It updates its content when the message prop changes, making it available
 * for screen readers to announce.
 * @param {string} message The message to be announced by screen readers.
 */
export function AriaLive({ message }: AriaLiveProps) {
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    // Only update if the message has changed to avoid redundant announcements.
    if (message && message !== currentMessage) {
      setCurrentMessage(message);
    }
  }, [message, currentMessage]);

  if (!currentMessage) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}
