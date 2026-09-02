const users = [
  {
    id: 1,
    name: "Craig Vetrovs",
    time: "11:55 PM",
    lastMsg: "Hi thanks for getting back to me. I just wanted t...",
    avatar: "https://i.pravatar.cc/150?img=1",
    unread: true,
    chat: [
      { from: "them", text: "Hi thanks for getting back to me." },
      { from: "me", text: "Sure, how can I help you?" }
    ]
  },
  {
    id: 2,
    name: "Emery Lipshutz",
    time: "1:05 PM",
    lastMsg: "I would like to know if we could focus the sessio...",
    avatar: "https://i.pravatar.cc/150?img=2",
    unread: false,
    chat: [
      { from: "them", text: "Hi I'm interested in a lesson with you. But I have a few questions." },
      { from: "me", text: "Ok that’s great" }
    ]
  },
  {
    id: 3,
    name: "Ruben Botosh",
    time: "11:55 PM",
    lastMsg: "Hi thanks for getting back to me",
    avatar: "https://i.pravatar.cc/150?img=3",
    unread: false,
    chat: [{ from: "them", text: "Hi thanks for getting back to me" }]
  },
  {
    id: 4,
    name: "Ahmad Lubin",
    time: "11:55 PM",
    lastMsg: "Hi thanks for getting back to me",
    avatar: "https://i.pravatar.cc/150?img=4",
    unread: false,
    chat: [{ from: "them", text: "Hi thanks for getting back to me" }]
  }
];

export default users;
