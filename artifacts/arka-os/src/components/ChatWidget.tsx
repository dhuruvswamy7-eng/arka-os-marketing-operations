import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { MessageCircle, X, Send } from "lucide-react";
import { Person } from "@workspace/db";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export function ChatWidget({ currentUser, allPeople }: { currentUser: Person | null; allPeople: Person[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Connect to the backend Socket.io server
    const token = localStorage.getItem("arka_token") || localStorage.getItem("token") || "mock-token";
    const socketUrl = import.meta.env.VITE_SOCKET_URL ?? (typeof window !== 'undefined'
      ? (window.location.port === '5173'
          ? `${window.location.protocol}//${window.location.hostname}:5000`
          : window.location.origin)
      : 'http://localhost:5000');
    const newSocket = io(socketUrl, {
      auth: { token },
      path: "/socket.io/" // Default path
    });

    setSocket(newSocket);

    newSocket.on("chat:message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    });

    return () => {
      newSocket.close();
    };
  }, [currentUser]);

  if (!currentUser) return null;

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket) return;
    
    socket.emit("chat:message", {
      id: crypto.randomUUID(),
      content: inputValue,
    });
    setInputValue("");
  };

  const getSenderName = (senderId: string) => {
    return allPeople.find(p => p.id === senderId)?.name || senderId;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="w-80 h-96 flex flex-col mb-4 shadow-xl border-slate-700/50 bg-slate-900/90 backdrop-blur-sm overflow-hidden">
          <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              Team Chat
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-200" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 text-sm mt-10">No messages yet. Say hello!</div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-slate-500 mb-1">{getSenderName(msg.senderId)}</span>
                    <div className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                      isMe 
                        ? "bg-blue-600/90 text-white rounded-br-none" 
                        : "bg-slate-700 text-slate-200 rounded-bl-none"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          <div className="p-3 bg-slate-800 border-t border-slate-700">
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type a message..." 
                className="bg-slate-900 border-slate-700 text-sm"
              />
              <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {!isOpen && (
        <Button 
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl flex items-center justify-center relative group"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
          </span>
        </Button>
      )}
    </div>
  );
}
