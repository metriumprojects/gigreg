import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import UserListI from "./UserList";

export default function Sidebar({
  rooms = [],
  loading = false,
  activeRoomId,
  viewerRole,
  currentUserId,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const sortedRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = [...rooms].sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );
    if (!query) return list;

    return list.filter((room) => {
      const peer =
        room.student?._id === currentUserId ? room.teacher : room.student;
      const peerName = (peer?.name || "").toLowerCase();
      const preview = (room.lastMessage || "").toLowerCase();
      return peerName.includes(query) || preview.includes(query);
    });
  }, [rooms, searchQuery, currentUserId]);

  if (loading) {
    return (
      <div className="w-full h-full overflow-y-auto bg-white animate-pulse">
        <h2 className="p-4 text-lg font-semibold border-b border-gray-200 bg-gray-50 h-[73.6px] flex items-center">
          All Messages
        </h2>
        {[...Array(5)].map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-4 border-b border-gray-100"
          >
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-2 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-white" id="sidebar">
      <div className="sticky top-0 z-10 bg-white">
        <h2 className="px-4 text-lg font-semibold border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white h-[73.6px] flex items-center">
          All Messages
        </h2>
        <div className="px-3 py-2.5 border-b border-gray-100 bg-white">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="w-full rounded-full border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-primary focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {sortedRooms.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">
          {searchQuery.trim() ? "No matching conversations." : "No conversations yet."}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sortedRooms.map((room) => (
            <UserListI
              key={room._id}
              room={room}
              viewerRole={viewerRole}
              currentUserId={currentUserId}
              isActive={room._id === activeRoomId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
