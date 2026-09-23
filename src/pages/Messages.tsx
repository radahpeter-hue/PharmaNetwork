import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { ConversationView } from '../components/ConversationView';
import { MessageSquare, ShieldAlert, Inbox, Clock, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{
    uid: string;
    name: string;
    photoUrl?: string;
    relatedTitle?: string;
    relatedId?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Read URL query parameters to auto-launch a conversation if redirected from elsewhere
  const targetRecipientUid = searchParams.get('recipientUid');
  const targetRecipientName = searchParams.get('recipientName');
  const targetListingTitle = searchParams.get('listingTitle');
  const targetListingId = searchParams.get('listingId');

  useEffect(() => {
    if (!user) return;

    // Real-time stream of all conversations where logged-in user is a participant
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({ ...data, id: docSnap.id });
      });

      // Sort by lastMessageAt descending on client side to avoid index requirement limitations
      list.sort((a, b) => {
        const timeA = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : new Date(a.lastMessageAt || 0).getTime();
        const timeB = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : new Date(b.lastMessageAt || 0).getTime();
        return timeB - timeA;
      });

      setConversations(list);
      setLoading(false);

      // Handle query string redirect parsing
      if (targetRecipientUid && targetRecipientName) {
        setSelectedRecipient({
          uid: targetRecipientUid,
          name: targetRecipientName,
          relatedTitle: targetListingTitle || undefined,
          relatedId: targetListingId || undefined
        });
      }
    }, (err) => {
      console.error("Failed to snapshot user's messagings:", err);
      setLoading(false);
    });

    return unsubscribe;
  }, [user, targetRecipientUid, targetRecipientName, targetListingTitle, targetListingId]);

  const selectConversation = async (conv: any) => {
    if (!user) return;
    const oppositeUid = conv.participants.find((p: string) => p !== user.uid);
    const oppositeName = conv.participantNames?.[oppositeUid] || 'Secure Partner';
    const oppositePhoto = conv.participantPhotos?.[oppositeUid] || '';

    // Clear unread counts in Firestore
    try {
      if (conv.unreadCount && conv.unreadCount[user.uid] > 0) {
        await updateDoc(doc(db, 'messages', conv.id), {
          [`unreadCount.${user.uid}`]: 0
        });
      }
    } catch (e) {
      console.warn("Could not reset local message unreads:", e);
    }

    setSelectedRecipient({
      uid: oppositeUid,
      name: oppositeName,
      photoUrl: oppositePhoto,
      relatedTitle: conv.relatedPostingTitle || undefined,
      relatedId: conv.relatedPostingId || undefined
    });

    // Clear search descriptors safely
    setSearchParams({});
  };

  const getRelativeTime = (timestamp: any) => {
    if (!timestamp) return '';
    const now = Date.now();
    const date = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d` + ' ago';
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <MessageSquare size={48} className="text-zinc-300 mx-auto mb-4" />
        <h2 className="font-bold text-zinc-900 text-lg">Login Required</h2>
        <p className="text-zinc-500 text-sm mt-1">Please login to access your secure pharmaceutical messaging inbox.</p>
        <button onClick={() => navigate('/login')} className="mt-6 px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-sm">
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-90px)] flex flex-col">
      {/* Header (Only shown when not inside an active full screen conversation) */}
      {!selectedRecipient && (
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-950 tracking-tight leading-tight">Messages</h1>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1 font-semibold">
              <ShieldAlert size={12} className="text-emerald-500 shrink-0" />
              Secure, real-time end-to-end communication
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-zinc-150 shadow-xl overflow-hidden flex-grow flex flex-col min-h-0">
        {!selectedRecipient ? (
          /* INBOX LIST VIEW */
          <div className="flex flex-col min-h-0 flex-grow">
            <div className="p-5 bg-zinc-50/70 border-b border-zinc-150 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block">Conversations Inbox</span>
              {conversations.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-3 py-0.5 rounded-full font-black">
                  {conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}
                </span>
              )}
            </div>

            <div className="flex-grow overflow-y-auto divide-y divide-zinc-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                  <p className="text-[10px] uppercase font-bold tracking-widest">Polling secure tunnels...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 py-16 text-center text-zinc-400 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center mb-4 border border-zinc-100 text-zinc-300">
                    <Inbox size={24} />
                  </div>
                  <p className="text-sm font-semibold text-zinc-800 mb-2">No messages yet.</p>
                  <p className="text-xs text-zinc-500 font-medium max-w-xs leading-relaxed mb-6">
                    Start a conversation by visiting a profile or job posting.
                  </p>
                  <Link to="/jobs?tab=availability">
                    <Button size="sm" className="font-extrabold text-xs">
                      Browse Professionals
                    </Button>
                  </Link>
                </div>
              ) : (
                conversations.map((conv) => {
                  const oppositeUid = conv.participants.find((p: string) => p !== user.uid);
                  const oppositeName = conv.participantNames?.[oppositeUid] || 'Secure Partner';
                  const oppositePhoto = conv.participantPhotos?.[oppositeUid] || '';
                  const unread = conv.unreadCount?.[user.uid] || 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "p-5 flex gap-4 items-center cursor-pointer hover:bg-zinc-50/50 transition-all duration-150 relative border-b border-zinc-100",
                        unread > 0 ? "bg-emerald-50/15" : "bg-white"
                      )}
                    >
                      {/* Left side: other participant's photo (40px circle) or initials */}
                      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center shrink-0 border border-zinc-200 overflow-hidden font-extrabold text-zinc-700">
                        {oppositePhoto ? (
                          <img src={oppositePhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs">{oppositeName[0].toUpperCase()}</span>
                        )}
                      </div>

                      {/* Middle: Name (bold), lastMessage preview (truncated to 60 chars) and relative time */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-sm text-zinc-950 truncate",
                            unread > 0 ? "font-black" : "font-bold"
                          )}>
                            {oppositeName}
                          </span>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-0.5 whitespace-nowrap ml-2 shrink-0">
                              <Clock size={10} />
                              {getRelativeTime(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>

                        <p className={cn(
                          "text-xs line-clamp-1",
                          unread > 0 ? "text-zinc-900 font-semibold" : "text-zinc-400 font-medium"
                        )}>
                          {conv.lastMessage ? (
                            conv.lastMessage.length > 60 ? `${conv.lastMessage.slice(0, 60)}...` : conv.lastMessage
                          ) : (
                            'Open conversation'
                          )}
                        </p>

                        {conv.relatedPostingTitle && (
                          <span className="inline-block bg-zinc-100 text-zinc-500 text-[9px] font-black px-2 py-0.5 rounded-md mt-1.5 truncate max-w-full">
                            Re: {conv.relatedPostingTitle}
                          </span>
                        )}
                      </div>

                      {/* Far right: unread count badge & indicator icon */}
                      {unread > 0 && (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[9px] font-black text-white shrink-0 animate-pulse">
                          {unread}
                        </div>
                      )}

                      <ChevronRight size={16} className="text-zinc-350 shrink-0 ml-1" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* CONVERSATION VIEW (FULL PAGE) */
          <div className="flex-grow flex flex-col min-h-0 relative h-[calc(100vh-170px)]">
            <ConversationView
              recipientUid={selectedRecipient.uid}
              recipientName={selectedRecipient.name}
              recipientPhotoUrl={selectedRecipient.photoUrl}
              relatedPostingId={selectedRecipient.relatedId || undefined}
              relatedPostingTitle={selectedRecipient.relatedTitle || undefined}
              onClose={() => setSelectedRecipient(null)}
              showBackButton={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
