import { useParams } from "react-router-dom";
import users from "./data/users";

export default function Messages() {
  const { id } = useParams();
  const user = users.find((u) => u.id === Number(id));

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-xl">
        Pick up where you left off
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[86vh] md:h-full">
      <div className="p-4 border-b flex items-center gap-3 bg-white shadow">
        <img src={user.avatar} className="w-10 h-10 rounded-full" />
        <h2 className="text-lg font-semibold">{user.name}</h2>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {user.chat.map((msg, index) => (
          <div
            key={index}
            className={`p-3 my-2 rounded-lg max-w-lg text-white ${
              msg.from === "me" ? "bg-green-600 ml-auto" : "bg-blue-900"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="p-4 border-t bg-white">
        <input
          type="text"
          placeholder="Type a message..."
          className="w-full border rounded-lg px-4 py-2 focus:outline-none"
        />
      </div>
    </div>
  );
}
