import { createHash } from "crypto"
import { User } from "../models/user.js"
import { Message } from "../models/message.js"

// Inappropriate content detection configuration
const INAPPROPRIATE_KEYWORDS = [
  "porn",
  "shit",
  "xxx",
  "sex",
  "nude",
  "naked",
  "adult content",
  "explicit",
  "obscene",
  "nsfw",
  "profanity",
  "f*ck",
  "sh*t",
  "b*tch",
  "d*ck",
  "a**hole",
  "c*nt",
  "racial slur",
  "hate speech",
  "kill yourself",
  "suicide",
  "terrorist",
  "bomb making",
  "drug dealing",
  "illegal substance",
  "child abuse",
  "violence",
  "weapon",
  "harassment",
  "threat",
  "gore",
  "whore",
   "slut",
   "retard",
   "idiot",
 "stupid",
]

// Frequency thresholds (reusing from spam filter)
const INAPPROPRIATE_FREQUENCY_THRESHOLD = 5 // inappropriate messages per minute
const SIMILAR_INAPPROPRIATE_THRESHOLD = 2 // similar inappropriate messages in a short period
const TIME_WINDOW_MINUTES = 1

// Cache for recent inappropriate messages to detect frequency
const recentInappropriateMessages = new Map() // userId -> array of timestamps
const similarInappropriateCache = new Map() // userId -> Map of message hash -> count

/**
 * Check if a message contains inappropriate content
 * @param {string} message - The message content to check
 * @param {string} userId - The user ID of the sender
 * @returns {boolean} - True if inappropriate content is detected
 */
export const checkInappropriateContent = (message, userId) => {
  if (!message) return false

  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase()

  // Check for inappropriate keywords
  const containsInappropriateKeywords = INAPPROPRIATE_KEYWORDS.some((keyword) => 
    lowerMessage.includes(keyword.toLowerCase())
  )

  // If inappropriate content is found, track frequency
  if (containsInappropriateKeywords) {
    // Check inappropriate message frequency
    const isHighFrequency = checkInappropriateFrequency(userId)

    // Check for similar inappropriate messages
    const isSimilarInappropriate = checkSimilarInappropriateMessages(userId, message)

    return true // Return true for any inappropriate content
  }

  return false
}

/**
 * Check if a user is sending inappropriate messages too frequently
 * @param {string} userId - The user ID to check
 * @returns {boolean} - True if sending too many inappropriate messages
 */
const checkInappropriateFrequency = (userId) => {
  const now = Date.now()

  // Initialize if not exists
  if (!recentInappropriateMessages.has(userId)) {
    recentInappropriateMessages.set(userId, [])
  }

  const userMessages = recentInappropriateMessages.get(userId)

  // Add current message timestamp
  userMessages.push(now)

  // Remove messages older than TIME_WINDOW_MINUTES
  const timeWindow = TIME_WINDOW_MINUTES * 60 * 1000
  const filteredMessages = userMessages.filter((timestamp) => now - timestamp < timeWindow)

  // Update the cache
  recentInappropriateMessages.set(userId, filteredMessages)

  // Check if frequency exceeds threshold
  return filteredMessages.length > INAPPROPRIATE_FREQUENCY_THRESHOLD
}

/**
 * Check if a user is sending similar inappropriate messages repeatedly
 * @param {string} userId - The user ID to check
 * @param {string} message - The message content
 * @returns {boolean} - True if sending similar inappropriate messages repeatedly
 */
const checkSimilarInappropriateMessages = (userId, message) => {
  if (!message) return false

  // Create a simple hash of the message
  const hash = createHash("md5").update(message).digest("hex")

  // Initialize if not exists
  if (!similarInappropriateCache.has(userId)) {
    similarInappropriateCache.set(userId, new Map())
  }

  const userMessageHashes = similarInappropriateCache.get(userId)

  // Increment count for this message hash
  const currentCount = userMessageHashes.get(hash) || 0
  userMessageHashes.set(hash, currentCount + 1)

  // Check if count exceeds threshold
  return currentCount + 1 >= SIMILAR_INAPPROPRIATE_THRESHOLD
}

/**
 * Block a user for inappropriate content
 * @param {string} userId - The user ID to block
 * @param {string} blockedById - The user ID who is blocking
 * @returns {Promise<boolean>} - True if successfully blocked
 */
export const blockUserForInappropriate = async (userId, blockedById) => {
  try {
    // Add userId to blockedUsers array of blockedById user
    await User.findByIdAndUpdate(blockedById, { $addToSet: { blockedUsers: userId } })

    return true
  } catch (error) {
    console.error("Error blocking user for inappropriate content:", error)
    return false
  }
}

/**
 * Check user's inappropriate content history
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user has inappropriate content history
 */
export const checkUserInappropriateHistory = async (userId) => {
  try {
    // Count how many times this user's messages were reported as inappropriate
    const inappropriateReportCount = await Message.countDocuments({
      sender: userId,
      isInappropriate: true,
    })

    return inappropriateReportCount >= 3 // Consider inappropriate history if 3+ reports
  } catch (error) {
    console.error("Error checking user inappropriate history:", error)
    return false
  }
}

// Export constants for use in other files
export const INAPPROPRIATE_CONTENT_EVENTS = {
  INAPPROPRIATE_DETECTED: "inappropriate-detected",
  USER_BLOCKED_FOR_INAPPROPRIATE: "user-blocked-for-inappropriate"
}