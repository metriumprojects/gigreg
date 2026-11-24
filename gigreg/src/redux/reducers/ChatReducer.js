import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

const initialState = {
  rooms: [],
  chatUnread: 0,
  roomsLoading: false,
  roomsError: null,
  messagesByRoom: {},
  messagesLoading: false,
  messagesError: null,
  messagesRoomId: null,
  startChatLoading: false,
  startChatError: null,
  lastStartedRoom: null,
  sendMessageLoading: false,
  sendMessageError: null,
};

const syncChatUnread = (state) => {
  state.chatUnread = (state.rooms || []).reduce(
    (sum, room) => sum + (Number(room?.unreadCount) || 0),
    0
  );
};

const upsertRoom = (rooms, incomingRoom = {}) => {
  if (!incomingRoom?._id) {
    return;
  }
  const index = rooms.findIndex((room) => room._id === incomingRoom._id);

  if (index === -1) {
    rooms.push(incomingRoom);
    return;
  }

  rooms[index] = {
    ...rooms[index],
    ...incomingRoom,
  };
};

export const fetchChatConnections = createAsyncThunk(
  "chat/fetchConnections",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/chat/connected-users", {
        withCredentials: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load conversations."
      );
    }
  }
);

export const fetchChatMessages = createAsyncThunk(
  "chat/fetchMessages",
  async ({ roomId }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/chat/messages/${roomId}`, {
        withCredentials: true,
      });
      return { roomId, messages: data || [] };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to load messages."
      );
    }
  }
);

export const startChat = createAsyncThunk(
  "chat/startChat",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/chat/start", payload, {
        withCredentials: true,
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to start chat."
      );
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  "chat/sendMessage",
  async ({ roomId, message, image, images, lessonId, listingId, type, quoteRequest, quote, inputCurrency }, { rejectWithValue }) => {
    if (!roomId) {
      return rejectWithValue("roomId is required");
    }
    try {
      const formData = new FormData();
      formData.append("roomId", roomId);
      if (message) {
        formData.append("message", message);
      }
      if (lessonId) {
        formData.append("lessonId", lessonId);
      }
      if (listingId) {
        formData.append("listingId", listingId);
      }
      if (type) {
        formData.append("type", type);
      }
      if (quoteRequest) {
        formData.append("quoteRequest", JSON.stringify(quoteRequest));
      }
      if (quote) {
        formData.append("quote", JSON.stringify(quote));
      }
      if (inputCurrency) formData.append("inputCurrency", inputCurrency);
      if (image) {
        formData.append("image", image);
      }
      if (Array.isArray(images)) {
        images.forEach((item) => {
          if (item) formData.append("images", item);
        });
      }

      const { data } = await api.post("/chat/messages", formData, {
        withCredentials: true,
      });

      return data.message;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to send message."
      );
    }
  }
);

export const updateQuoteMessage = createAsyncThunk(
  "chat/updateQuoteMessage",
  async ({ messageId, price, description, status, inputCurrency, currency }, { rejectWithValue }) => {
    if (!messageId) {
      return rejectWithValue("messageId is required");
    }

    try {
      const payload = {};
      if (price !== undefined) payload.price = price;
      if (description !== undefined) payload.description = description;
      if (status !== undefined) payload.status = status;
      if (inputCurrency) payload.inputCurrency = inputCurrency;
      if (currency) payload.currency = currency;

      const { data } = await api.patch(`/chat/messages/${messageId}/quote`, payload, {
        withCredentials: true,
      });

      return data.message;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to update quote."
      );
    }
  }
);

const normalizeRoomId = (roomId) => {
  if (!roomId) return "";
  if (typeof roomId === "object") {
    return String(roomId._id || roomId.id || "");
  }
  return String(roomId);
};

const upsertMessageInRoom = (state, rawRoomId, message) => {
  const roomId = normalizeRoomId(rawRoomId);
  if (!roomId || !message?._id) {
    return { roomId, inserted: false };
  }

  if (!Array.isArray(state.messagesByRoom[roomId])) {
    state.messagesByRoom[roomId] = [];
  }

  const list = state.messagesByRoom[roomId];
  const index = list.findIndex((item) => String(item?._id) === String(message._id));
  if (index !== -1) {
    list[index] = message;
    return { roomId, inserted: false };
  }

  list.push(message);
  return { roomId, inserted: true };
};

const syncRoomSummary = (state, roomId, { lastMessage, updatedAt, incrementUnread = false } = {}) => {
  const roomIndex = state.rooms.findIndex((room) => String(room?._id) === String(roomId));
  if (roomIndex === -1) return;

  const room = state.rooms[roomIndex];
  if (lastMessage !== undefined) {
    room.lastMessage = lastMessage;
  }
  if (updatedAt) {
    room.updatedAt = updatedAt;
  }
  if (incrementUnread) {
    room.unreadCount = (room.unreadCount || 0) + 1;
  }
  state.rooms[roomIndex] = room;
};

const replaceMessage = (state, updatedMessage) => {
  const roomId = normalizeRoomId(updatedMessage?.roomId);
  if (!roomId || !updatedMessage?._id) return;

  if (Array.isArray(state.messagesByRoom[roomId])) {
    upsertMessageInRoom(state, roomId, updatedMessage);
  }

  const status = updatedMessage?.quote?.status;
  const summaryText =
    updatedMessage?.type === "quote"
      ? status === "accepted"
        ? "Offer accepted"
        : status === "cancelled"
        ? "Offer declined"
        : status === "withdrawn"
        ? "Offer withdrawn"
        : "Offer updated"
      : updatedMessage?.message;

  syncRoomSummary(state, roomId, {
    lastMessage: summaryText,
    updatedAt: updatedMessage?.updatedAt || new Date().toISOString(),
  });
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    appendIncomingMessage: (state, action) => {
      const { roomId: rawRoomId, message, viewerId, activeRoomId } = action.payload || {};
      const roomId = normalizeRoomId(rawRoomId || message?.roomId);
      if (!roomId || !message) return;

      const { inserted } = upsertMessageInRoom(state, roomId, message);
      if (!inserted) return;

      const senderId =
        message?.userId?._id || message?.userId || message?.user?._id;
      const isMine =
        senderId && viewerId ? String(senderId) === String(viewerId) : false;
      const isViewingRoom =
        activeRoomId ? String(activeRoomId) === String(roomId) : false;

      syncRoomSummary(state, roomId, {
        lastMessage: message.message,
        updatedAt: message.createdAt || new Date().toISOString(),
        incrementUnread: !isMine && !isViewingRoom,
      });
      syncChatUnread(state);
    },
    markRoomRead: (state, action) => {
      const roomId = normalizeRoomId(action.payload);
      if (!roomId) return;
      const room = state.rooms.find((item) => String(item?._id) === roomId);
      if (room) {
        room.unreadCount = 0;
      }
      syncChatUnread(state);
    },
    markMessagesSeenByPeer: (state, action) => {
      const { roomId: rawRoomId, readerId } =
        typeof action.payload === "object"
          ? action.payload || {}
          : { roomId: action.payload };
      const roomId = normalizeRoomId(rawRoomId);
      if (!roomId) return;

      const list = state.messagesByRoom[roomId];
      if (!Array.isArray(list)) return;

      state.messagesByRoom[roomId] = list.map((item) => {
        const senderId = item?.userId?._id || item?.userId;
        if (readerId && senderId && String(senderId) === String(readerId)) {
          return item;
        }
        return item?.read ? item : { ...item, read: true };
      });
    },
    updateChatMessage: (state, action) => {
      replaceMessage(state, action.payload);
    },
    resetChatState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatConnections.pending, (state) => {
        state.roomsLoading = true;
        state.roomsError = null;
      })
      .addCase(fetchChatConnections.fulfilled, (state, action) => {
        state.roomsLoading = false;
        state.roomsError = null;
        state.rooms = action.payload?.connections || [];
        syncChatUnread(state);
      })
      .addCase(fetchChatConnections.rejected, (state, action) => {
        state.roomsLoading = false;
        state.roomsError =
          action.payload || "Unable to load chat connections.";
      })
      .addCase(fetchChatMessages.pending, (state, action) => {
        state.messagesLoading = true;
        state.messagesError = null;
        state.messagesRoomId = action.meta.arg?.roomId || null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = null;
        const { roomId, messages } = action.payload || {};
        if (roomId) {
          state.messagesByRoom[roomId] = messages || [];
        }
        state.messagesRoomId = null;
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.messagesLoading = false;
        state.messagesError =
          action.payload || "Unable to load chat messages.";
        state.messagesRoomId = action.meta.arg?.roomId || null;
        if (state.messagesRoomId) {
          state.messagesByRoom[state.messagesRoomId] = [];
        }
      })
      .addCase(startChat.pending, (state) => {
        state.startChatLoading = true;
        state.startChatError = null;
      })
      .addCase(startChat.fulfilled, (state, action) => {
        state.startChatLoading = false;
        state.startChatError = null;
        const room = action.payload?.room;
        state.lastStartedRoom = room || null;
        if (room) {
          upsertRoom(state.rooms, room);
          syncChatUnread(state);
        }
      })
      .addCase(startChat.rejected, (state, action) => {
        state.startChatLoading = false;
        state.startChatError =
          action.payload || "Unable to start chat at the moment.";
      })
      .addCase(sendChatMessage.pending, (state) => {
        state.sendMessageLoading = true;
        state.sendMessageError = null;
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.sendMessageLoading = false;
        state.sendMessageError = null;
        const sentMessage = action.payload;
        if (sentMessage?._id && sentMessage?.roomId) {
          const roomId = normalizeRoomId(sentMessage.roomId);
          upsertMessageInRoom(state, roomId, sentMessage);
          syncRoomSummary(state, roomId, {
            lastMessage: sentMessage.message,
            updatedAt: sentMessage.createdAt || new Date().toISOString(),
          });
        }
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.sendMessageLoading = false;
        state.sendMessageError =
          action.payload || "Unable to send message at the moment.";
      })
      .addCase(updateQuoteMessage.pending, (state) => {
        state.sendMessageLoading = true;
        state.sendMessageError = null;
      })
      .addCase(updateQuoteMessage.fulfilled, (state, action) => {
        state.sendMessageLoading = false;
        state.sendMessageError = null;
        replaceMessage(state, action.payload);
      })
      .addCase(updateQuoteMessage.rejected, (state, action) => {
        state.sendMessageLoading = false;
        state.sendMessageError =
          action.payload || "Unable to update quote at the moment.";
      });
  },
});

export const {
  appendIncomingMessage,
  markMessagesSeenByPeer,
  markRoomRead,
  resetChatState,
  updateChatMessage,
} = chatSlice.actions;

export default chatSlice.reducer;

