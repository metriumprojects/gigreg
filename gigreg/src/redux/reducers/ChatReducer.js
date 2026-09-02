import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api";

const initialState = {
  rooms: [],
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

const replaceMessage = (state, updatedMessage) => {
  if (!updatedMessage?.roomId || !updatedMessage?._id) return;
  const roomId = String(updatedMessage.roomId);
  const list = state.messagesByRoom[roomId];
  if (!Array.isArray(list)) return;

  const index = list.findIndex((item) => String(item?._id) === String(updatedMessage._id));
  if (index === -1) {
    list.push(updatedMessage);
    return;
  }
  list[index] = updatedMessage;
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    appendIncomingMessage: (state, action) => {
      const { roomId, message, viewerId } = action.payload || {};
      if (!roomId || !message) return;

      if (!state.messagesByRoom[roomId]) {
        state.messagesByRoom[roomId] = [];
      }
      const existingIndex = state.messagesByRoom[roomId].findIndex(
        (item) => String(item?._id) === String(message?._id)
      );
      if (existingIndex !== -1) {
        state.messagesByRoom[roomId][existingIndex] = message;
        return;
      }
      state.messagesByRoom[roomId].push(message);

      const senderId =
        message?.userId?._id || message?.userId || message?.user?._id;

      const roomIndex = state.rooms.findIndex((room) => room._id === roomId);
      if (roomIndex !== -1) {
        const room = state.rooms[roomIndex];
        room.lastMessage = message.message;
        room.updatedAt = message.createdAt || new Date().toISOString();

        const isMine =
          senderId && viewerId
            ? String(senderId) === String(viewerId)
            : false;

        if (!isMine && room.unreadCount !== undefined) {
          room.unreadCount = (room.unreadCount || 0) + 1;
        } else if (!isMine && room.unreadCount === undefined) {
          room.unreadCount = 1;
        }

        state.rooms[roomIndex] = room;
      }
    },
    markRoomRead: (state, action) => {
      const roomId = action.payload;
      if (!roomId) return;
      const room = state.rooms.find((item) => item._id === roomId);
      if (room) {
        room.unreadCount = 0;
      }
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
      .addCase(sendChatMessage.fulfilled, (state) => {
        state.sendMessageLoading = false;
        state.sendMessageError = null;
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

export const { appendIncomingMessage, markRoomRead, resetChatState, updateChatMessage } =
  chatSlice.actions;

export default chatSlice.reducer;

