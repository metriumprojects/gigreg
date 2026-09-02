import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";

let ioInstance = null;

export const emitChatMessage = (roomId, payload) => {
  if (!ioInstance || !roomId || !payload) return;
  ioInstance.to(roomId).emit("receiveMessage", payload);
};

export const emitChatMessageUpdate = (roomId, payload) => {
  if (!ioInstance || !roomId || !payload) return;
  ioInstance.to(roomId).emit("messageUpdated", payload);
};

const socketHandler = (io) => {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // Join specific course room
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    // Handle new text message sent through sockets
    socket.on("sendMessage", async (data) => {
      try {
        const { roomId, userId, message } = data || {};

        if (!roomId || !userId || !message?.trim()) {
          return;
        }

        const newMessage = await Message.create({
          roomId,
          userId,
          message: message.trim(),
          read: false,
          type: "text",
        });

        await ChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: message.trim(),
          updatedAt: new Date(),
        });

        await newMessage.populate([
          { path: "userId", select: "name email image" },
          { path: "lesson", select: "title price images duration" },
        ]);

        emitChatMessage(roomId, newMessage);
      } catch (error) {
        console.error("Socket sendMessage error:", error);
      }
    });

    // WHEN A USER OPENS THE CHAT → MARK AS READ
    socket.on("markRead", async ({ roomId, userId }) => {
      await Message.updateMany(
        { roomId, userId: { $ne: userId }, read: false },
        { $set: { read: true } }
      );

      // Notify other user → for blue tick
      socket.to(roomId).emit("messagesRead", { roomId });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });
};

export default socketHandler;
