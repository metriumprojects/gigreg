import { io } from "socket.io-client";
import { socketHost } from "../redux/api";

let sharedSocket = null;
let sharedUserId = "";
let sharedToken = "";

export const connectChatSocket = (userId) => {
  const normalizedUserId = userId ? String(userId) : "";
  if (!normalizedUserId) {
    disconnectChatSocket();
    return null;
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";

  if (
    sharedSocket &&
    sharedUserId === normalizedUserId &&
    sharedToken === token
  ) {
    if (!sharedSocket.connected && !sharedSocket.active) {
      sharedSocket.connect();
    }
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  sharedUserId = normalizedUserId;
  sharedToken = token;
  sharedSocket = io(socketHost, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    ...(token ? { auth: { token } } : {}),
  });

  return sharedSocket;
};

export const getChatSocket = () => sharedSocket;

export const disconnectChatSocket = () => {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  sharedUserId = "";
  sharedToken = "";
};
