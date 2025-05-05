// Define inappropriate words/phrases
const inappropriateWords = [
    "fuck",
    "shit",
    "ass",
    "bitch",
    "dick",
    "bastard",
    "cunt",
    "damn",
    "hell",
    "whore",
    "slut",
    "retard",
    "idiot",
    "stupid",
    // Add more inappropriate words as needed
  ]
  
  // Function to check if a message contains inappropriate content
  export const checkInappropriateContent = (message) => {
    // Convert message to lowercase for case-insensitive matching
    const lowerCaseMessage = message.toLowerCase()
  
    // Check if any inappropriate words are in the message
    return inappropriateWords.some((word) => lowerCaseMessage.includes(word))
  }
  
  // Express middleware for message filtering
  export const messageFilterMiddleware = (req, res, next) => {
    // Check if the request body contains a message
    if (req.body && req.body.message) {
      // If the message contains inappropriate content, flag it
      if (checkInappropriateContent(req.body.message)) {
        req.inappropriateContent = true
      }
    }
    next()
  }
  
  

// import { INAPPROPRIATE_MESSAGE } from '../constants/events.js';

// // List of inappropriate words to filter
// const inappropriateWords = [
//   'fuck', 'shit', 'asshole', 'bitch', 'bastard', 'damn', 'cunt', 'dick', 
//   'pussy', 'whore', 'slut', 'idiot', 'stupid', 'dumb', 'retard', 'moron'
// ];

// // Function to check if a message contains inappropriate words
// export const containsInappropriateWords = (message) => {
//   if (!message) return null;
  
//   const lowerCaseMessage = message.toLowerCase();
  
//   for (const word of inappropriateWords) {
//     // Check if the message contains the word as a whole word
//     const regex = new RegExp(`\\b${word}\\b`, 'i');
//     if (regex.test(lowerCaseMessage)) {
//       return word;
//     }
//   }
  
//   return null;
// };

// // Message filter middleware
// export const analyzeMessage = (io, socket) => {
//   return (message, chatId, sender, members) => {
//     // Analyze message content
//     const detectedWord = containsInappropriateWords(message);
    
//     if (detectedWord) {
//       // Notify the recipient about inappropriate content
//       members.forEach(member => {
//         // Don't notify the sender
//         if (member._id.toString() !== sender._id.toString()) {
//           io.to(member._id.toString()).emit(INAPPROPRIATE_MESSAGE, {
//             chatId,
//             message: {
//               content: message,
//               sender
//             },
//             detectedWord
//           });
//         }
//       });
      
//       return detectedWord; // Return the detected word
//     }
    
//     return null; // No inappropriate words found
//   };
// };







