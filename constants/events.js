const ALERT = "ALERT";
const REFETCH_CHATS = "REFETCH_CHATS";

const NEW_ATTACHMENT = "NEW_ATTACHMENT";
const NEW_MESSAGE_ALERT = "NEW_MESSAGE_ALERT";

const NEW_REQUEST = "NEW_REQUEST";
const NEW_MESSAGE = "NEW_MESSAGE";

const START_TYPING = "START_TYPING";
const STOP_TYPING = "STOP_TYPING";

const CHAT_JOINED = "CHAT_JOINED";
const CHAT_LEAVED = "CHAT_LEAVED";

const ONLINE_USERS = "ONLINE_USERS";
// // Add this new event to your existing events.js file:
 const INAPPROPRIATE_MESSAGE = "inappropriate-message"

const MESSAGE_BLOCKED = "message-blocked";

  const SPAM_DETECTED = "spam-detected";
   const BLOCK_USER = "block-user";
   const REPLY_MESSAGE = "reply-message"

   export const CALL_USER = "call-user"
export const INCOMING_CALL = "incoming-call"
export const CALL_ANSWERED = "call-answered"
export const CALL_REJECTED = "call-rejected"
export const ICE_CANDIDATE = "ice-candidate"
export const END_CALL = "end-call"

export const UNBLOCK_USER = "unblock-user"
export const GET_BLOCKED_USERS = "get-blocked-users"
export const USER_BLOCKED = "user-blocked"
export const USER_UNBLOCKED = "user-unblocked"
export const MESSAGE_FROM_BLOCKED_USER = "message-from-blocked-user"

// New events for inappropriate content
export const INAPPROPRIATE_CONTENT_DETECTED = "inappropriate-content-detected"
export const USER_BLOCKED_FOR_INAPPROPRIATE = "user-blocked-for-inappropriate"

export {
  MESSAGE_BLOCKED,
  INAPPROPRIATE_MESSAGE,
  ALERT,
  REFETCH_CHATS,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  NEW_REQUEST,
  NEW_MESSAGE,
  START_TYPING,
  STOP_TYPING,
  CHAT_JOINED,
  CHAT_LEAVED,
  ONLINE_USERS,
 
SPAM_DETECTED,
BLOCK_USER,
REPLY_MESSAGE

};