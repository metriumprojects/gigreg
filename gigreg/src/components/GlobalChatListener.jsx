import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  appendIncomingMessage,
  fetchChatConnections,
  markMessagesSeenByPeer,
  markRoomRead,
  updateChatMessage,
} from "../redux/reducers/ChatReducer";
import { connectChatSocket, disconnectChatSocket } from "../utils/chatSocket";

const FOCUS_STALE_MS = 15_000;

const normalizeId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return String(entity._id || entity.id || "");
};

const extractActiveChatRoomId = (pathname = "") => {
  const match = String(pathname).match(/^\/chat\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const GlobalChatListener = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const viewerId = useSelector((state) => state.auth?.userInfo?._id || "");
  const rooms = useSelector((state) => state.chat?.rooms || []);

  const viewerIdRef = useRef(viewerId);
  const activeRoomIdRef = useRef(extractActiveChatRoomId(location.pathname));
  const roomsRef = useRef(rooms);
  const lastFetchAtRef = useRef(0);

  useEffect(() => {
    viewerIdRef.current = viewerId;
  }, [viewerId]);

  useEffect(() => {
    activeRoomIdRef.current = extractActiveChatRoomId(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    if (!viewerId) {
      lastFetchAtRef.current = 0;
      disconnectChatSocket();
      return undefined;
    }

    const fetchConnectionsNow = () => {
      lastFetchAtRef.current = Date.now();
      dispatch(fetchChatConnections());
    };

    fetchConnectionsNow();
    const socket = connectChatSocket(viewerId);
    if (!socket) return undefined;

    const handleConnect = () => {
      fetchConnectionsNow();
    };

    const handleReceiveMessage = (incoming) => {
      const incomingRoomId = normalizeId(incoming?.roomId);
      if (!incomingRoomId) return;

      dispatch(
        appendIncomingMessage({
          roomId: incomingRoomId,
          message: incoming,
          viewerId: viewerIdRef.current,
          activeRoomId: activeRoomIdRef.current,
        })
      );

      const roomKnown = roomsRef.current.some(
        (room) => String(room?._id) === incomingRoomId
      );
      if (!roomKnown) {
        fetchConnectionsNow();
      }
    };

    const handleMessagesRead = ({ roomId, readerId } = {}) => {
      const normalizedRoomId = normalizeId(roomId);
      if (!normalizedRoomId) return;
      dispatch(markMessagesSeenByPeer({ roomId: normalizedRoomId, readerId }));
      if (readerId && String(readerId) === String(viewerIdRef.current)) {
        dispatch(markRoomRead(normalizedRoomId));
      }
    };

    const handleMessageUpdated = (updatedMessage) => {
      dispatch(updateChatMessage(updatedMessage));
    };

    const handleWindowSync = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      if (Date.now() - lastFetchAtRef.current >= FOCUS_STALE_MS) {
        fetchConnectionsNow();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messagesRead", handleMessagesRead);
    socket.on("messageUpdated", handleMessageUpdated);
    window.addEventListener("focus", handleWindowSync);
    document.addEventListener("visibilitychange", handleWindowSync);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messagesRead", handleMessagesRead);
      socket.off("messageUpdated", handleMessageUpdated);
      window.removeEventListener("focus", handleWindowSync);
      document.removeEventListener("visibilitychange", handleWindowSync);
    };
  }, [dispatch, viewerId]);

  return null;
};

export default GlobalChatListener;
