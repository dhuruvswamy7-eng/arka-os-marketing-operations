import React, { useState, useEffect, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { 
  MessageCircle, 
  X, 
  Send, 
  Search, 
  Hash, 
  User, 
  Clock, 
  Sparkles,
  Circle,
  Shield,
  Briefcase
} from "lucide-react";
import type { Person } from "../App";

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt?: string;
  timestamp?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (
  typeof window !== 'undefined'
    ? (window.location.hostname.includes('arkadigitalmedia.com')
        ? 'https://arka-api-w9o0.onrender.com/api'
        : (window.location.port === '5173'
            ? `${window.location.protocol}//${window.location.hostname}:5000/api`
            : '/api'))
    : 'http://localhost:5000/api'
);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? (
  typeof window !== 'undefined'
    ? (window.location.hostname.includes('arkadigitalmedia.com')
        ? 'https://arka-api-w9o0.onrender.com'
        : (window.location.port === '5173'
            ? `${window.location.protocol}//${window.location.hostname}:5000`
            : window.location.origin))
    : 'http://localhost:5000'
);

async function fetchChatHistory(peerId: string, currentUserId: string): Promise<Message[]> {
  try {
    const token = sessionStorage.getItem("arka_token") || localStorage.getItem("arka_token");
    const res = await fetch(`${API_BASE}/messages?peerId=${encodeURIComponent(peerId)}&userId=${encodeURIComponent(currentUserId)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("Failed to load chat history", err);
    return [];
  }
}

async function postChatMessage(payload: Partial<Message>): Promise<void> {
  try {
    const token = sessionStorage.getItem("arka_token") || localStorage.getItem("arka_token");
    await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to post message fallback", err);
  }
}

function formatMessageTime(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatWidget({ currentUser, allPeople }: { currentUser: Person | null; allPeople: Person[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string>("general"); // "general" or userId
  const [searchQuery, setSearchQuery] = useState("");
  const [messagesByTarget, setMessagesByTarget] = useState<Record<string, Message[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [inputValue, setInputValue] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUserId = currentUser?.id;
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Initialize Socket.io connection once per user
  useEffect(() => {
    if (!currentUserId) return;

    const token = sessionStorage.getItem("arka_token") || localStorage.getItem("arka_token") || "mock-token";
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      path: "/socket.io/",
      transports: ["websocket", "polling"]
    });

    setSocket(newSocket);

    newSocket.on("chat:message", (msg: Message) => {
      const recipientId = msg.recipientId && msg.recipientId !== "general" ? msg.recipientId : "general";
      
      // Determine thread key
      let threadKey = "general";
      if (recipientId !== "general") {
        threadKey = msg.senderId === currentUserId ? recipientId : msg.senderId;
      }

      setMessagesByTarget(prev => {
        const thread = prev[threadKey] || [];
        if (thread.some(m => m.id === msg.id)) return prev;
        return {
          ...prev,
          [threadKey]: [...thread, msg]
        };
      });

      // Update unread count if user is not looking at this thread or widget is closed
      setActiveTarget(currentActive => {
        if (!isOpenRef.current || currentActive !== threadKey) {
          setUnreadCounts(u => ({
            ...u,
            [threadKey]: (u[threadKey] || 0) + 1
          }));
        }
        return currentActive;
      });

      // Smooth scroll to bottom if viewing this thread
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    });

    return () => {
      newSocket.close();
    };
  }, [currentUserId]);

  // Load message history when activeTarget or currentUserId changes
  useEffect(() => {
    if (!currentUserId) return;

    let isCancelled = false;
    
    // Only show loading indicator if thread is empty/never loaded
    setMessagesByTarget(prev => {
      if (!prev[activeTarget] || prev[activeTarget].length === 0) {
        setIsLoadingHistory(true);
      }
      return prev;
    });

    fetchChatHistory(activeTarget, currentUserId).then(items => {
      if (isCancelled) return;
      setMessagesByTarget(prev => ({
        ...prev,
        [activeTarget]: items
      }));
      setIsLoadingHistory(false);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 80);
    });

    // Clear unread count for this target
    setUnreadCounts(prev => ({
      ...prev,
      [activeTarget]: 0
    }));

    return () => {
      isCancelled = true;
    };
  }, [activeTarget, currentUserId]);

  // Auto scroll when message list changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesByTarget, activeTarget]);

  // Focus input when chat opens or target changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, activeTarget]);

  if (!currentUser) return null;

  // Total unread count for bubble
  const totalUnread = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

  // Filtered direct message contacts
  const otherPeople = useMemo(() => {
    return (allPeople || [])
      .filter(p => p && p.id !== currentUser?.id)
      .filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (p.name || '').toLowerCase().includes(q) || (p.role || '').toLowerCase().includes(q) || (p.title && p.title.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        // Founder first, then Managers, then Online people, then by name
        if (a.role === "Founder") return -1;
        if (b.role === "Founder") return 1;
        if (a.role === "Manager" && b.role !== "Manager") return -1;
        if (b.role === "Manager" && a.role !== "Manager") return 1;
        if (a.presence === "Online" && b.presence !== "Online") return -1;
        if (b.presence === "Online" && a.presence !== "Online") return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [allPeople, currentUser?.id, searchQuery]);

  const activeContact = activeTarget === "general" ? null : allPeople.find(p => p.id === activeTarget);
  const currentMessages = messagesByTarget[activeTarget] || [];

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputValue.trim();
    if (!content) return;

    const payload: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderId: currentUser.id,
      recipientId: activeTarget,
      content,
      createdAt: new Date().toISOString()
    };

    // 1. Optimistic UI update: instant render with 0ms lag
    setMessagesByTarget(prev => ({
      ...prev,
      [activeTarget]: [...(prev[activeTarget] || []), payload]
    }));
    setInputValue("");

    // 2. Deliver over WebSocket
    if (socket && socket.connected) {
      socket.emit("chat:message", payload);
    }

    // 3. Sync to database via REST endpoint
    postChatMessage(payload);

    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 20);
  };

  const getPresenceColor = (presence?: string) => {
    switch (presence) {
      case "Online": return "bg-emerald-400";
      case "Break": return "bg-amber-400";
      case "Lunch": return "bg-orange-400";
      case "Idle": return "bg-yellow-300";
      default: return "bg-slate-500";
    }
  };

  const getPresenceLabel = (p?: Person) => {
    if (!p) return "";
    if (p.presence === "Break") return "On Break (15m)";
    if (p.presence === "Lunch") return "At Lunch (1h)";
    return p.presence;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="w-[620px] max-w-[95vw] h-[560px] max-h-[85vh] flex rounded-2xl shadow-2xl border border-slate-700/70 bg-[#0f172a] text-slate-100 overflow-hidden mb-3 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Left Sidebar: Channels & Direct Messages Directory */}
          <div className="w-56 sm:w-64 border-r border-slate-800 bg-[#090d16] flex flex-col flex-shrink-0">
            
            {/* Left Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-lg bg-[#f8c329] text-black font-black text-xs grid place-items-center">
                  A
                </div>
                <span className="font-bold text-sm text-slate-200">Arka Workspace</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-2 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
                <Search className="size-3.5 text-slate-500 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Find teammate..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none w-full placeholder:text-slate-500 text-xs"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-slate-500 hover:text-slate-300">
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Channels & People List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-3">
              
              {/* Channels Section */}
              <div>
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Channels
                </div>
                <button
                  onClick={() => setActiveTarget("general")}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                    activeTarget === "general"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Hash className="size-4 text-[#f8c329]" />
                    <span className="truncate">📢 general</span>
                  </div>
                  {(unreadCounts["general"] || 0) > 0 && (
                    <span className="bg-[#f8c329] text-black font-black text-[10px] px-1.5 py-0.5 rounded-full">
                      {unreadCounts["general"]}
                    </span>
                  )}
                </button>
              </div>

              {/* Direct Messages Section */}
              <div>
                <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <span>Direct Messages</span>
                  <span className="text-[9px] text-slate-600">({otherPeople.length})</span>
                </div>

                <div className="space-y-0.5 mt-1">
                  {otherPeople.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-slate-500">
                      No members found
                    </div>
                  ) : (
                    otherPeople.map((person) => {
                      const isActive = activeTarget === person.id;
                      const unread = unreadCounts[person.id] || 0;
                      return (
                        <button
                          key={person.id}
                          onClick={() => setActiveTarget(person.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition text-left group ${
                            isActive
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="relative flex-shrink-0">
                              <div className="size-7 rounded-full bg-slate-800 border border-slate-700 grid place-items-center font-bold text-xs text-slate-200">
                                {person.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#090d16] ${getPresenceColor(person.presence)}`}
                                title={getPresenceLabel(person)}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate flex items-center gap-1">
                                <span className="truncate">{person.name}</span>
                                {person.role === "Founder" && (
                                  <Shield className="size-3 text-[#f8c329] flex-shrink-0" />
                                )}
                              </div>
                              <div className={`text-[10px] truncate ${isActive ? "text-blue-200" : "text-slate-500 group-hover:text-slate-400"}`}>
                                {person.role}
                              </div>
                            </div>
                          </div>

                          {unread > 0 && (
                            <span className="ml-1.5 bg-[#f8c329] text-black font-black text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Current User Status Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#070b13] flex items-center gap-2.5">
              <div className="relative">
                <div className="size-7 rounded-full bg-slate-800 border border-slate-700 grid place-items-center font-bold text-xs text-[#f8c329]">
                  {currentUser.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-[#070b13] ${getPresenceColor(currentUser.presence)}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-200 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{currentUser.role}</div>
              </div>
            </div>

          </div>

          {/* Right Panel: Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-[#0f172a] min-w-0">
            
            {/* Top Bar of Active Conversation */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {activeTarget === "general" ? (
                  <>
                    <div className="size-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 grid place-items-center flex-shrink-0">
                      <Hash className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <span>#general</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">Team</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">Company-wide discussion & announcements</div>
                    </div>
                  </>
                ) : activeContact ? (
                  <>
                    <div className="relative flex-shrink-0">
                      <div className="size-9 rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs grid place-items-center">
                        {activeContact.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#0f172a] ${getPresenceColor(activeContact.presence)}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5 truncate">
                        <span className="truncate">{activeContact.name}</span>
                        {activeContact.role === "Founder" && (
                          <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 font-bold">Founder</span>
                        )}
                        {activeContact.role === "Manager" && (
                          <span className="text-[9px] bg-blue-400/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/30 font-bold">Manager</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${getPresenceColor(activeContact.presence)}`} />
                        <span>{getPresenceLabel(activeContact)}</span>
                        <span>•</span>
                        <span className="truncate">{activeContact.title}</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close chat"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gradient-to-b from-[#0f172a] to-[#0b1120]">
              {isLoadingHistory && currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <div className="size-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                  <span>Loading messages...</span>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="size-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 grid place-items-center text-slate-400 mb-3">
                    {activeTarget === "general" ? <Hash className="size-6 text-[#f8c329]" /> : <MessageCircle className="size-6 text-blue-400" />}
                  </div>
                  <h4 className="font-bold text-slate-300 text-sm">
                    {activeTarget === "general" ? "Welcome to #general!" : `Start chatting with ${activeContact?.name || "teammate"}`}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    {activeTarget === "general"
                      ? "This is the company-wide channel. Messages sent here are visible to the entire team."
                      : "Direct messages are private and only visible between you and this person."}
                  </p>
                </div>
              ) : (
                currentMessages.map((msg, idx) => {
                  const isMe = msg.senderId === currentUser.id;
                  const sender = allPeople.find(p => p.id === msg.senderId);
                  const senderName = isMe ? "You" : sender?.name || "Unknown";
                  const prevMsg = currentMessages[idx - 1];
                  const showSenderHeader = !prevMsg || prevMsg.senderId !== msg.senderId;

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      {showSenderHeader && (
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className={`text-[11px] font-semibold ${isMe ? "text-blue-300" : "text-slate-400"}`}>
                            {senderName}
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {formatMessageTime(msg.createdAt || msg.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      <div
                        className={`px-3.5 py-2 text-xs leading-relaxed max-w-[85%] break-words shadow-sm ${
                          isMe
                            ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                            : "bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-2xl rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/80">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    activeTarget === "general"
                      ? "Message #general..."
                      : `Message ${activeContact?.name || "teammate"}...`
                  }
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500 transition"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-sm flex-shrink-0"
                  title="Send message"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
              <div className="mt-1 px-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>Press Enter to send</span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  Realtime synced
                </span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Floating Chat Button Badge */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="relative group size-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Open Team Chat"
        >
          <MessageCircle className="size-6 transition-transform group-hover:scale-110" />

          {/* Active Ping or Unread Counter */}
          {totalUnread > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f8c329] px-1 text-[10px] font-black text-black ring-2 ring-[#0f172a]">
              {totalUnread}
            </span>
          ) : (
            <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-3.5 bg-emerald-500 border-2 border-slate-900" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}
