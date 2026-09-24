

import { checkSpamContent } from "./spamFilter.js"
import { checkInappropriateContent } from "./InappropriateContentFilter.js"

/**
 * Comprehensive message filter that checks for both spam and inappropriate content
 * @param {string} message - The message content to check
 * @param {string} userId - The user ID of the sender
 * @returns {object} - Object containing filter results
 */
export const filterMessage = (message, userId) => {
  const isSpam = checkSpamContent(message, userId)
  const isInappropriate = checkInappropriateContent(message, userId)
  
  return {
    isSpam,
    isInappropriate,
    shouldBlock: isSpam || isInappropriate
  }
}

/**
 * Helper function to determine if a message should be blocked
 * @param {string} message - The message content to check
 * @param {string} userId - The user ID of the sender
 * @returns {boolean} - True if the message should be blocked
 */
export const shouldBlockMessage = (message, userId) => {
  const { shouldBlock } = filterMessage(message, userId)
  return shouldBlock
}

/**
 * Helper function to get the reason for blocking a message
 * @param {string} message - The message content to check
 * @param {string} userId - The user ID of the sender
 * @returns {string} - The reason for blocking the message
 */
export const getBlockReason = (message, userId) => {
  const { isSpam, isInappropriate } = filterMessage(message, userId)
  
  if (isSpam && isInappropriate) {
    return "spam and inappropriate content"
  } else if (isSpam) {
    return "spam"
  } else if (isInappropriate) {
    return "inappropriate content"
  }
  
  return "unknown"
}



