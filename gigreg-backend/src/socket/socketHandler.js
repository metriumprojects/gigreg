import jwt from "jsonwebtoken";
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { sendPushNotification } from "../services/notificationService.js";

let ioInstance = null;

export const extractSocketToken = (handshake = {}) => {
  const authToken = handshake?.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim().replace(/^Bearer\s+/i, "");
  }

  const authHeader = handshake?.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = handshake?.headers?.cookie;
  if (typeof cookieHeader === "string" && cookieHeader.length > 0) {
    const cookies = cookieHeader.split(";");
    for (const part of cookies) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const name = part.slice(0, idx).trim();
      if (name === "token") {
        return decodeURIComponent(part.slice(idx + 1).trim());
      }
    }
  }

  return null;
};

const getAuthorizedRoom = async (roomId, userId) => {
  if (!roomId || !userId) return null;
  const room = await ChatRoom.findById(roomId).select("student teacher").lean();
  if (!room) return null;
  const isParticipant =
    String(room.student) === String(userId) || String(room.teacher) === String(userId);
  return isParticipant ? room : null;
};

const buildChatTargets = (roomId, participantIds = []) => {
  const targets = [String(roomId)];
  for (const id of participantIds) {
    if (id) {
      targets.push(`user:${String(id)}`);
    }
  }
  return Array.from(new Set(targets));
};

export const emitChatMessage = (roomId, payload, participantIds = []) => {
  if (!ioInstance || !roomId || !payload) return;
  let emitter = ioInstance;
  for (const target of buildChatTargets(roomId, participantIds)) {
    emitter = emitter.to(target);
  }
  emitter.emit("receiveMessage", payload);
};

export const emitChatMessageUpdate = (roomId, payload, participantIds = []) => {
  if (!ioInstance || !roomId || !payload) return;
  let emitter = ioInstance;
  for (const target of buildChatTargets(roomId, participantIds)) {
    emitter = emitter.to(target);
  }
  emitter.emit("messageUpdated", payload);
};

export const emitMessagesRead = (roomId, readerId, peerId) => {
  if (!ioInstance || !roomId) return;
  let emitter = ioInstance.to(String(roomId));
  if (peerId) {
    emitter = emitter.to(`user:${String(peerId)}`);
  }
  if (readerId) {
    emitter = emitter.to(`user:${String(readerId)}`);
  }
  emitter.emit("messagesRead", {
    roomId: String(roomId),
    readerId: readerId ? String(readerId) : undefined,
  });
};

const socketHandler = (io) => {
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = extractSocketToken(socket.handshake);
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
      const user = await User.findById(decoded.id)
        .select("_id role tokenVersion passwordChangedAt")
        .lean();
      if (!user) {
        return next(new Error("User no longer exists"));
      }
      if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.tokenVersion || 0)) {
        return next(new Error("Session invalidated"));
      }
      if (
        user.passwordChangedAt &&
        decoded.iat &&
        decoded.iat * 1000 < new Date(user.passwordChangedAt).getTime()
      ) {
        return next(new Error("Session expired after password change"));
      }

      socket.userId = String(user._id);
      socket.userRole = user.role;
      return next();
    } catch {
      return next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const authenticatedUserId = socket.userId;
    socket.join(`user:${String(authenticatedUserId)}`);
    console.log("🟢 User connected:", socket.id);

    // Join specific room only if authenticated user is a participant
    socket.on("joinRoom", async (roomId) => {
      try {
        if (!roomId) return;
        const room = await getAuthorizedRoom(roomId, authenticatedUserId);
        if (!room) {
          socket.emit("chatError", { message: "Not authorized to join this room" });
          return;
        }
        socket.join(String(roomId));
      } catch (error) {
        console.error("Socket joinRoom error:", error.message);
      }
    });

    socket.on("leaveRoom", (roomId) => {
      if (roomId) {
        socket.leave(String(roomId));
      }
    });

    // Handle new text message sent through sockets — always derive sender from verified JWT
    socket.on("sendMessage", async (data) => {
      try {
        const { roomId, message } = data || {};
        const trimmed = typeof message === "string" ? message.trim() : "";

        if (!roomId || !trimmed) {
          return;
        }

        const room = await getAuthorizedRoom(roomId, authenticatedUserId);
        if (!room) {
          socket.emit("chatError", { message: "Not authorized to send messages to this room" });
          return;
        }

        const newMessage = await Message.create({
          roomId,
          userId: authenticatedUserId,
          message: trimmed,
          read: false,
          type: "text",
        });

        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: trimmed,
          updatedAt: new Date(),
        });

        await newMessage.populate([
          { path: "userId", select: "name email image" },
          { path: "listing", select: "title price currency duration coverImage slug" },
        ]);

        emitChatMessage(roomId, newMessage, [room.student, room.teacher]);

        const recipientId =
          String(room.student) === String(authenticatedUserId) ? room.teacher : room.student;
        const sender = await User.findById(authenticatedUserId).select("name").lean();
        sendPushNotification({
          userIds: recipientId,
          title: sender?.name || "GigMake User",
          body: trimmed,
          data: {
            type: "chat",
            roomId: String(roomId),
          },
        }).catch((err) => console.error("Socket push notification error:", err));
      } catch (error) {
        console.error("Socket sendMessage error:", error);
      }
    });

    // WHEN A USER OPENS THE CHAT → MARK AS READ
    socket.on("markRead", async ({ roomId } = {}) => {
      try {
        if (!roomId) return;
        const room = await getAuthorizedRoom(roomId, authenticatedUserId);
        if (!room) return;

        await Message.updateMany(
          { roomId, userId: { $ne: authenticatedUserId }, read: false },
          { $set: { read: true } }
        );

        const peerId =
          String(room.student) === String(authenticatedUserId) ? room.teacher : room.student;

        // Notify other user -> for live seen receipt, and sync reader's other tabs
        socket
          .to(String(roomId))
          .to(`user:${String(peerId)}`)
          .to(`user:${String(authenticatedUserId)}`)
          .emit("messagesRead", {
            roomId: String(roomId),
            readerId: String(authenticatedUserId),
          });
      } catch (error) {
        console.error("Socket markRead error:", error.message);
      }
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
};

export default socketHandler;
