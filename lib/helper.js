import { userSocketIDs } from "../app.js";

export const getOtherMember = (members, userId) =>
  members.find((member) => member._id.toString() !== userId.toString());

export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIDs.get(user.toString()));

  return sockets;
};

// export const getBase64 = (file) =>
//   `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;







const getBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

// const getSockets = (users) => {
//   return Object.values(users)
// }

export { getBase64}