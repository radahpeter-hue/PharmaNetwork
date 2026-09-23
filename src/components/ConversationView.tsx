import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Timestamp, 
  increment 
} from 'firebase/firestore';
import { Button } from './Button';
import { Send, X, MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { Message, Conversation } from '../types';

interface ConversationViewProps {
  recipientUid: string;
  recipientName: string;
  recipientPhotoUrl?: string;
  relatedPostingId?: string;
  relatedPostingTitle?: string;
  onClose: () => void;
  showBackButton?: boolean;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  recipientUid,
  recipientName,
  recipientPhotoUrl,
  relatedPostingId,
  relatedPostingTitle,
  onClose,
  showBackButton
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadUnsubscribe = useRef<(() => void) | null>(null);

  if (!user) return null;

  // Generate unique conversation ID sorted alphabetically
  const conversationId = [user.uid, recipientUid].sort().join('_');

  useEffect(() => {
    let unreadResetDone = false;

    const setupConversation = async () => {
      setIsLoading(true);
      try {
        const convRef = doc(db, 'messages', conversationId);
        const convSnap = await getDoc(convRef);

        // If conversation exists, and we have unread messages, reset our counter
        if (convSnap.exists()) {
          const data = convSnap.data() as Conversation;
          if (data.unreadCount && data.unreadCount[user.uid] > 0) {
            await updateDoc(convRef, {
              [`unreadCount.${user.uid}`]: 0
            });
          }
        }
        unreadResetDone = true;
      } catch (err) {
        console.error('Error opening conversation metadata:', err);
      }

      // Read messageThread subcollection
      const threadQuery = query(
        collection(db, 'messages', conversationId, 'messageThread'),
        orderBy('createdAt', 'asc'),
        limit(50)
      );

      threadUnsubscribe.current = onSnapshot(threadQuery, (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Message);
        });
        setMessages(list);
        setIsLoading(false);

        // Auto scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }, (error) => {
        console.error('Error streaming messages:', error);
        setIsLoading(false);
      });
    };

    setupConversation();

    return () => {
      if (threadUnsubscribe.current) {
        threadUnsubscribe.current();
      }
    };
  }, [conversationId, user.uid]);

  // Scroll to bottom whenever messages list expands
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || inputValue.length > 1000) return;

    const text = inputValue.trim();
    setInputValue('');

    try {
      const convRef = doc(db, 'messages', conversationId);
      const convSnap = await getDoc(convRef);
      const now = Timestamp.now();

      // Current user details
      const senderName = (profile as any)?.fullName || user.email?.split('@')[0] || 'User';
      const senderPhoto = (profile as any)?.profilePhotoUrl || '';

      const parentUpdateData = {
        lastMessage: text.slice(0, 60),
        lastMessageAt: now,
        lastMessageSenderId: user.uid,
        [`unreadCount.${recipientUid}`]: increment(1),
        [`unreadCount.${user.uid}`]: 0
      };

      if (!convSnap.exists()) {
        // Initial setup
        await setDoc(convRef, {
          participants: [user.uid, recipientUid],
          participantNames: {
            [user.uid]: senderName,
            [recipientUid]: recipientName
          },
          participantPhotos: {
            [user.uid]: senderPhoto,
            [recipientUid]: recipientPhotoUrl || ''
          },
          createdAt: now,
          relatedPostingId: relatedPostingId || null,
          relatedPostingTitle: relatedPostingTitle || null,
          ...parentUpdateData
        });
      } else {
        await updateDoc(convRef, parentUpdateData);
      }

      // Save the message inside the messageThread subcollection
      await addDoc(collection(db, 'messages', conversationId, 'messageThread'), {
        senderId: user.uid,
        senderName,
        body: text,
        createdAt: now,
        isRead: false
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `messages/${conversationId}/messageThread`);
    }
  };

  const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && (
            <button
              onClick={onClose}
              className="mr-1 p-1.5 text-zinc-650 hover:text-primary rounded-xl hover:bg-zinc-100 transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
              aria-label="Back to inbox"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold uppercase text-sm shrink-0">
            {recipientPhotoUrl ? (
              <img src={recipientPhotoUrl} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              recipientName[0]
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-zinc-950 text-sm leading-tight truncate">{recipientName}</h3>
            {relatedPostingTitle && (
              <p className="text-[10px] text-zinc-400 font-semibold mt-0.5 truncate max-w-[180px] sm:max-w-[285px]">
                Re: {relatedPostingTitle}
              </p>
            )}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center select-none"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4 bg-zinc-50/50">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-xs uppercase font-bold tracking-widest">Opening connection...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 text-center px-4">
            <MessageSquare size={32} className="text-zinc-300 mb-2" />
            <p className="text-sm font-semibold text-zinc-500">No messages yet.</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs">Be the first to say hello! Your connection is real-time and fully secured.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user.uid;
            return (
              <div 
                key={msg.id || index}
                className={cn(
                  "flex flex-col max-w-[80%] rounded-2xl p-4 shadow-sm relative group",
                  isMe 
                    ? "ml-auto bg-primary text-white rounded-br-none" 
                    : "bg-white text-zinc-800 rounded-bl-none border border-zinc-100"
                )}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.body}</p>
                <span className={cn(
                  "text-[9px] mt-1.5 self-end opacity-70 flex items-center gap-1 font-medium",
                  isMe ? "text-zinc-100" : "text-zinc-400"
                )}>
                  <Clock size={8} />
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-100 bg-white shrink-0 shadow-lg">
        <div className="relative flex items-center bg-zinc-50 rounded-xl px-4 py-2 border border-zinc-200">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            maxLength={1000}
            rows={1}
            className="flex-grow bg-transparent border-none outline-none resize-none text-zinc-800 text-sm max-h-20 focus:ring-0"
            style={{ height: 'auto' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <div className="flex items-center gap-3 ml-2 shrink-0">
            <span className={cn(
              "text-[9px] font-bold text-zinc-400",
              inputValue.length > 900 ? "text-amber-500" : ""
            )}>
              {inputValue.length}/1000
            </span>
            <button
              type="submit"
              disabled={!inputValue.trim() || inputValue.length > 1000}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center justify-center min-h-[36px] min-w-[36px]",
                inputValue.trim() && inputValue.length <= 1000
                  ? "bg-primary text-white cursor-pointer hover:bg-primary-light"
                  : "bg-zinc-100 text-zinc-300 cursor-not-allowed"
              )}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
