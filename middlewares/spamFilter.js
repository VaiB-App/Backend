import { v2 as cloudinary } from "cloudinary"
import { createHash } from "crypto"
import { User } from "../models/user.js"
import { Message } from "../models/message.js"

// Spam detection configuration
const SPAM_KEYWORDS = [
  "buy now",
  "limited time offer",
  "discount",
  "sale",
  "free",
  "click here",
  "special offer",
  "best price",
  "act now",
  "guaranteed",
  "exclusive deal",
  "cash back",
  "earn money",
  "investment opportunity",
  "lottery",
  "winner",
  "congratulations",
  "urgent",
  "limited stock",
  "best rates",
  "call now",
]

// Frequency thresholds
const MESSAGE_FREQUENCY_THRESHOLD = 5 // messages per minute
const SIMILAR_MESSAGE_THRESHOLD = 3 // similar messages in a short period
const TIME_WINDOW_MINUTES = 5

// Cache for recent messages to detect frequency
const recentMessages = new Map() // userId -> array of timestamps
const similarMessageCache = new Map() // userId -> Map of message hash -> count

/**
 * Check if a message contains spam content
 * @param {string} message - The message content to check
 * @param {string} userId - The user ID of the sender
 * @returns {boolean} - True if spam is detected
 */
export const checkSpamContent = (message, userId) => {
  if (!message) return false

  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase()

  // Check for spam keywords
  const containsSpamKeywords = SPAM_KEYWORDS.some((keyword) => lowerMessage.includes(keyword.toLowerCase()))

  // Check message frequency
  const isHighFrequency = checkMessageFrequency(userId)

  // Check for similar messages
  const isSimilarMessageSpam = checkSimilarMessages(userId, message)

  return containsSpamKeywords || isHighFrequency || isSimilarMessageSpam
}

/**
 * Check if a user is sending messages too frequently
 * @param {string} userId - The user ID to check
 * @returns {boolean} - True if sending too many messages
 */
const checkMessageFrequency = (userId) => {
  const now = Date.now()

  // Initialize if not exists
  if (!recentMessages.has(userId)) {
    recentMessages.set(userId, [])
  }

  const userMessages = recentMessages.get(userId)

  // Add current message timestamp
  userMessages.push(now)

  // Remove messages older than TIME_WINDOW_MINUTES
  const timeWindow = TIME_WINDOW_MINUTES * 60 * 1000
  const filteredMessages = userMessages.filter((timestamp) => now - timestamp < timeWindow)

  // Update the cache
  recentMessages.set(userId, filteredMessages)

  // Check if frequency exceeds threshold
  return filteredMessages.length > MESSAGE_FREQUENCY_THRESHOLD
}

/**
 * Check if a user is sending similar messages repeatedly
 * @param {string} userId - The user ID to check
 * @param {string} message - The message content
 * @returns {boolean} - True if sending similar messages repeatedly
 */
const checkSimilarMessages = (userId, message) => {
  if (!message) return false

  // Create a simple hash of the message
  const hash = createHash("md5").update(message).digest("hex")

  // Initialize if not exists
  if (!similarMessageCache.has(userId)) {
    similarMessageCache.set(userId, new Map())
  }

  const userMessageHashes = similarMessageCache.get(userId)

  // Increment count for this message hash
  const currentCount = userMessageHashes.get(hash) || 0
  userMessageHashes.set(hash, currentCount + 1)

  // Check if count exceeds threshold
  return currentCount + 1 >= SIMILAR_MESSAGE_THRESHOLD
}

/**
 * Analyze an image for spam content
 * @param {string} imageUrl - The URL of the image to analyze
 * @returns {Promise<boolean>} - True if the image is detected as spam
 */
export const analyzeImageForSpam = async (imageUrl) => {
  try {
    // Use Cloudinary's AI Content Analysis
    const result = await cloudinary.api.resource(
      imageUrl.split("/").pop().split(".")[0], // Extract public ID
      {
        resource_type: "image",
        moderation: "aws_rek", // AWS Rekognition for content moderation
      },
    )

    // Check if moderation status indicates spam
    if (result.moderation && result.moderation.status === "rejected") {
      return true
    }

    return false
  } catch (error) {
    console.error("Error analyzing image for spam:", error)
    return false // Default to false if analysis fails
  }
}

/**
 * Block a user
 * @param {string} userId - The user ID to block
 * @param {string} blockedById - The user ID who is blocking
 * @returns {Promise<boolean>} - True if successfully blocked
 */
export const blockUser = async (userId, blockedById) => {
  try {
    // Add userId to blockedUsers array of blockedById user
    await User.findByIdAndUpdate(blockedById, { $addToSet: { blockedUsers: userId } })

    return true
  } catch (error) {
    console.error("Error blocking user:", error)
    return false
  }
}

/**
 * Check user's spam history
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user has spam history
 */
export const checkUserSpamHistory = async (userId) => {
  try {
    // Count how many times this user's messages were reported as spam
    const spamReportCount = await Message.countDocuments({
      sender: userId,
      isSpam: true,
    })

    return spamReportCount >= 3 // Consider spam history if 3+ reports
  } catch (error) {
    console.error("Error checking user spam history:", error)
    return false
  }
}
