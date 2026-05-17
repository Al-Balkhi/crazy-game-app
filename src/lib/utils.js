import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format time according to user preference (12h or 24h)
 * @param {Date|string|number} time - Time to format
 * @param {string} format - '12h' or '24h'
 * @param {boolean} includeSeconds - Whether to include seconds in the output
 * @returns {string} Formatted time string
 */
export function formatTime(time, format = '12h', includeSeconds = false) {
  const date = new Date(time);
  
  const options = {
    hour: format === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: format === '12h'
  };
  
  if (includeSeconds) {
    options.second = '2-digit';
  }
  
  if (format === '24h') {
    return date.toLocaleTimeString('en-GB', options);
  } else {
    return date.toLocaleTimeString('en-US', options);
  }
}

/**
 * Format duration in minutes to readable format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30m" or "45m")
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}
