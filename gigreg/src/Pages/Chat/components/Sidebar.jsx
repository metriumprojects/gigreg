import UserListI from "./UserList";

export default function Sidebar({
  rooms = [],
  loading = false,
  activeRoomId,
  viewerRole,
  currentUserId,
}) {
  if (loading) {
    return (
      <div className="w-full h-full overflow-y-auto bg-white animate-pulse">
        <h2 className="p-4 text-lg font-semibold border-b border-gray-300 bg-gray-50">All Messages</h2>
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

  const sortedRooms = [...rooms].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return (
    <div className="w-full h-full overflow-y-auto bg-white" id="sidebar">
      <h2 className="p-4 text-lg font-semibold border-b border-gray-300 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 h-[73.6px] flex items-center">
        All Messages
      </h2>

      {sortedRooms.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">
          No conversations yet.
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
