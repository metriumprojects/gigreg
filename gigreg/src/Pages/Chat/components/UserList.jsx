import { Link } from "react-router-dom";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getPeer = (room, currentUserId) => {
  if (!room) return null;
  const me = String(currentUserId || "");
  const student = room.student;
  const teacher = room.teacher;
  const studentId = normalizeId(student);
  const teacherId = normalizeId(teacher);

  if (studentId && studentId === me) {
    return teacher || null;
  }

  if (teacherId && teacherId === me) {
    return student || null;
  }

  return teacher || student || null;
};

export default function UserListI({
  room,
  viewerRole,
  currentUserId,
  isActive,
}) {
  const participant = getPeer(room, currentUserId);

  const name =
    participant?.name ||
    participant?.email ||
    (viewerRole === "teacher" ? room?.student?.email : room?.teacher?.email) ||
    "Conversation";
  const avatar =
    participant?.image?.url ||
    participant?.avatar ||
    `https://i.ibb.co/tpV3m2GW/no-image.png`;
  const preview = room?.lastMessage
    ? room.lastMessage.length > 60
      ? `${room.lastMessage.slice(0, 57)}...`
      : room.lastMessage
    : "No messages yet";
  const unreadCount = room?.unreadCount || 0;

  return (
    <Link
      to={`/chat/${room?._id}`}
      className={`flex items-center gap-3 p-3 md:p-4 cursor-pointer transition-all duration-200 ${
        isActive 
          ? "bg-blue-50 border-l-4 border-primary" 
          : "hover:bg-gray-50 border-l-4 border-transparent"
      }`}
    >
      <div className="relative">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden ring-2 ring-gray-200">
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center shadow-md">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 min-w-0 space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className={`truncate font-semibold ${isActive ? 'text-primary' : 'text-gray-900'}`}>
            {name}
          </span>
          <span className="text-gray-500 text-xs shrink-0 ml-2">
            {formatTime(room?.updatedAt)}
          </span>
        </div>
        <p className={`text-xs md:text-sm truncate ${unreadCount > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
          {preview}
        </p>
      </div>
    </Link>
  );
}
