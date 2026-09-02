import fs from "fs";
import ChatRoom from "../models/ChatRoom.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import cloudinary from "../config/cloudinary.js";
import { emitChatMessage, emitChatMessageUpdate } from "../socket/socketHandler.js";
import { requireCurrency, requirePositivePrice } from "../services/currencyService.js";

const resolveTeacherQuoteCurrency = async ({ quoteCurrency, inputCurrency, teacherId, fallbackCurrency }) => {
  const requestedCurrency = quoteCurrency || inputCurrency || fallbackCurrency;
  if (requestedCurrency) {
    return requireCurrency(requestedCurrency);
  }

  const teacher = await User.findById(teacherId).select("currency").lean();
  return requireCurrency(teacher?.currency || "USD");
};

export const connectUser = async (req, res) => {
  try {
    const { id } = req.user; // current user

    const currentUser = await User.findById(id).select("role");

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const rooms = await ChatRoom.find({
      $or: [{ student: id }, { teacher: id }],
    })
      .populate("student", "name email image role")
      .populate("teacher", "name email image role")
      .select("student teacher lastMessage updatedAt");

    const finalRooms = await Promise.all(
      rooms.map(async (room) => {
        const unread = await Message.countDocuments({
          roomId: room._id,
          read: false,
          userId: { $ne: id },
        });

        return {
          ...room.toObject(),
          unreadCount: unread,
        };
      })
    );

    res.json({
      userId: id,
      role: currentUser.role,
      totalConnections: rooms?.length,
      connections: finalRooms,
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { before, limit = 20 } = req.query;

    let filter = { roomId };

    // Load messages before a timestamp (WhatsApp-style pagination)
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .limit(Number(limit))
      .populate("userId", "name email image")
      .populate("listing", "title price currency duration coverImage slug");

    // reverse so UI gets oldest→newest order
    res.json(messages.reverse());

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { id } = req.user; // current user

    // Mark all messages NOT sent by me as read
    await Message.updateMany(
      { roomId, userId: { $ne: id }, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const startChat = async (req, res) => {
  try {
    const { targetUserId, initialMessage } = req.body;
    const currentUserId = req.user._id;

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user is required" });
    }

    if (String(targetUserId) === String(currentUserId)) {
      return res
        .status(400)
        .json({ error: "You cannot start a chat with yourself." });
    }

    const targetUser = await User.findById(targetUserId).select(
      "role name email image"
    );

    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    let studentId;
    let teacherId;

    if (req.user.role === "teacher") {
      teacherId = currentUserId;
      studentId = targetUserId;
    } else if (targetUser.role === "teacher") {
      teacherId = targetUserId;
      studentId = currentUserId;
    } else {
      teacherId = targetUserId;
      studentId = currentUserId;
    }

    // Always reuse the same room for a student/teacher pair
    const roomFilter = { student: studentId, teacher: teacherId };
    // Also look for legacy rooms that may have inverted roles
    const legacyFilter = { student: teacherId, teacher: studentId };

    let chatRoom = await ChatRoom.findOne({ $or: [roomFilter, legacyFilter] });

    if (!chatRoom) {
      try {
        chatRoom = await ChatRoom.create(roomFilter);
      } catch (error) {
        // Handle rare race where another request created it first
        if (error.code === 11000) {
          chatRoom = await ChatRoom.findOne(roomFilter);
        } else {
          throw error;
        }
      }
    }

    if (initialMessage && initialMessage.trim()) {
      const savedMessage = await Message.create({
        roomId: chatRoom._id,
        userId: currentUserId,
        message: initialMessage.trim(),
        type: "text",
      });

      chatRoom.lastMessage = savedMessage.message;
      chatRoom.updatedAt = savedMessage.createdAt;
      await chatRoom.save();
    }

    const populatedRoom = await ChatRoom.findById(chatRoom._id)
      .populate("student", "name email image role")
      .populate("teacher", "name email image role");

    res.json({
      room: populatedRoom,
      message: "Chat ready",
    });
  } catch (error) {
    console.error("startChat error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { roomId, message, listingId, type, quoteRequest, quote, inputCurrency } = req.body;
    const trimmedMessage = message?.trim();
    const userId = req.user._id;

    if (!roomId) {
      return res.status(400).json({ error: "roomId is required" });
    }

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ error: "Chat room not found" });
    }

    if (
      String(room.student) !== String(userId) &&
      String(room.teacher) !== String(userId)
    ) {
      return res.status(403).json({ error: "You cannot send messages to this room." });
    }

    const payload = {
      roomId,
      userId,
      read: false,
    };

    if (trimmedMessage) {
      payload.message = trimmedMessage;
    }

    const singleImageFile = req.file || req.files?.image?.[0];
    if (singleImageFile) {
      const uploaded = await cloudinary.uploader.upload(singleImageFile.path, {
        folder: "chat_messages",
      });

      payload.image = {
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
      payload.type = "image";
      if (!payload.message) {
        payload.message = "Shared an image";
      }
    }

    const uploadedQuoteImages = [];
    const quoteImageFiles = req.files?.images || [];
    for (const file of quoteImageFiles) {
      const uploaded = await cloudinary.uploader.upload(file.path, {
        folder: "chat_quotes",
      });
      uploadedQuoteImages.push({
        url: uploaded.secure_url,
        public_id: uploaded.public_id,
      });
    }

    if (listingId) {
      const listing = await Listing.findById(listingId).select(
        "title price currency duration coverImage slug"
      );

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      payload.listing = listing._id;
      payload.listingSnapshot = {
        listingId: listing._id,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        duration: listing.duration,
        image: listing.coverImage?.url,
        slug: listing.slug,
      };
      payload.type = "listing";
      if (!payload.message) {
        payload.message = `Shared listing: ${listing.title}`;
      }
    }

    if (type === "quote_request") {
      let parsedQuoteRequest = {};
      if (quoteRequest) {
        parsedQuoteRequest =
          typeof quoteRequest === "string" ? JSON.parse(quoteRequest) : quoteRequest;
      }

      payload.type = "quote_request";
      payload.quoteRequest = {
        listingId: parsedQuoteRequest.listingId || undefined,
        listingTitle: parsedQuoteRequest.listingTitle || "",
        listingUrl: parsedQuoteRequest.listingUrl || "",
        selectedDate: parsedQuoteRequest.selectedDate || "",
        selectedTimes: Array.isArray(parsedQuoteRequest.selectedTimes)
          ? parsedQuoteRequest.selectedTimes
          : [],
        estimatedPrice:
          parsedQuoteRequest.estimatedPrice !== undefined &&
          parsedQuoteRequest.estimatedPrice !== null &&
          parsedQuoteRequest.estimatedPrice !== ""
            ? Number(parsedQuoteRequest.estimatedPrice)
            : undefined,
        currency: parsedQuoteRequest.currency ? requireCurrency(parsedQuoteRequest.currency) : undefined,
        description: parsedQuoteRequest.description || trimmedMessage || "",
        images: uploadedQuoteImages,
      };
      payload.message = trimmedMessage || "Quote request";
    }

    if (type === "quote") {
      let parsedQuote = {};
      if (quote) {
        parsedQuote = typeof quote === "string" ? JSON.parse(quote) : quote;
      }

      if (parsedQuote.price === undefined || parsedQuote.price === null || parsedQuote.price === "") {
        return res.status(400).json({ error: "Quote price is required" });
      }

      const quoteCurrency = await resolveTeacherQuoteCurrency({
        quoteCurrency: parsedQuote.currency,
        inputCurrency,
        teacherId: room.teacher,
      });
      payload.type = "quote";
      payload.quote = {
        listingId: parsedQuote.listingId || undefined,
        price: requirePositivePrice(parsedQuote.price, quoteCurrency),
        currency: quoteCurrency,
        description: parsedQuote.description || "",
        status: parsedQuote.status || "open",
        requestMessageId: parsedQuote.requestMessageId || undefined,
        images: uploadedQuoteImages,
      };
      payload.message = trimmedMessage || "Quote sent";
    }
// console.log("object",payload)
    // if (!payload.message) {
    //   return res
    //     .status(400)
    //     .json({ error: "Message text, image or lesson is required" });
    // }

    if (!payload.type) {
      payload.type = "text";
    }

    const newMessage = await Message.create(payload);
    await newMessage.populate([
      { path: "userId", select: "name email image" },
      { path: "listing", select: "title price currency duration coverImage slug" },
    ]);

    await ChatRoom.findByIdAndUpdate(roomId, {
      lastMessage: payload.message,
      updatedAt: new Date(),
    });

    emitChatMessage(roomId, newMessage);

    res.json({ message: newMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(error.status || 500).json({ error: error.message });
  } finally {
    const singleImageFile = req.file || req.files?.image?.[0];
    if (singleImageFile) {
      fs.unlink(singleImageFile.path, () => {});
    }
    (req.files?.images || []).forEach((file) => {
      fs.unlink(file.path, () => {});
    });
  }
};

export const updateQuoteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { price, description, status, inputCurrency, currency } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message || message.type !== "quote") {
      return res.status(404).json({ error: "Quote not found" });
    }

    const room = await ChatRoom.findById(message.roomId);
    if (!room) {
      return res.status(404).json({ error: "Chat room not found" });
    }

    const isTeacher = String(room.teacher) === String(userId);
    const isStudent = String(room.student) === String(userId);
    if (!isTeacher && !isStudent) {
      return res.status(403).json({ error: "You cannot update this quote." });
    }

    if ((price !== undefined || description !== undefined) && !isTeacher) {
      return res.status(403).json({ error: "Only the seller can edit a quote." });
    }

    if (status !== undefined && !isStudent) {
      return res.status(403).json({ error: "Only the buyer can update quote status." });
    }

    if (price !== undefined) {
      if (price === "" || Number.isNaN(Number(price))) {
        return res.status(400).json({ error: "Quote price is required" });
      }
      const quoteCurrency = await resolveTeacherQuoteCurrency({
        quoteCurrency: currency,
        inputCurrency,
        teacherId: room.teacher,
        fallbackCurrency: message.quote.currency,
      });
      message.quote.price = requirePositivePrice(price, quoteCurrency);
      message.quote.currency = quoteCurrency;
    }

    if (description !== undefined) {
      message.quote.description = description || "";
    }

    if (status !== undefined) {
      if (!["open", "accepted", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid quote status" });
      }
      message.quote.status = status;
    }

    await message.save();
    await message.populate("userId", "name email image");

    emitChatMessageUpdate(message.roomId, message);

    res.json({ message });
  } catch (error) {
    console.error("updateQuoteMessage error:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};
