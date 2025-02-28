import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { Database } from '../types/supabase';
import Message from './Message';
import { Send, LogOut, Users, AlertCircle } from 'lucide-react';

type MessageRow = Database['public']['Tables']['messages']['Row'];

interface OnlineUser {
  id: string;
  display_name: string | null;
  last_seen: string;
}

const ChatRoom: React.FC = () => {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showUsersList, setShowUsersList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const { currentUser, logout } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
          throw error;
        }
        setConnectionStatus('connected');
        setError(null);
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionStatus('disconnected');
        setError('Unable to connect to the chat server. Please check your internet connection.');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Update user's online status
  useEffect(() => {
    if (!currentUser || connectionStatus !== 'connected') return;
    
    const updatePresence = async () => {
      try {
        const { error } = await supabase.rpc('update_user_presence');
        if (error) {
          console.error('Error updating presence:', error);
          // Don't set global error for presence updates
        }
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };
    
    // Update presence immediately
    updatePresence();
    
    // Then update every 30 seconds
    const interval = setInterval(updatePresence, 30000);
    
    return () => clearInterval(interval);
  }, [currentUser, connectionStatus]);
  
  // Subscribe to online users
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    
    const fetchOnlineUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('online_users')
          .select('*')
          .order('display_name');
        
        if (error) {
          console.error('Error fetching online users:', error);
          return;
        }
        
        if (data) {
          setOnlineUsers(data as OnlineUser[]);
        }
      } catch (err) {
        console.error('Error fetching online users:', err);
      }
    };
    
    fetchOnlineUsers();
    
    // Subscribe to changes in online users
    const subscription = supabase
      .channel('online-users-channel')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'online_users' 
        }, 
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to online users');
        }
      });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [connectionStatus]);
  
  // Fetch messages and subscribe to new ones
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    
    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);
        
        if (error) {
          console.error('Error fetching messages:', error);
          setError('Failed to load messages. Please try refreshing the page.');
          setLoading(false);
          return;
        }
        
        if (data) {
          setMessages(data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try refreshing the page.');
        setLoading(false);
      }
    };
    
    fetchMessages();
    
    // Subscribe to new messages
    const subscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          const newMessage = payload.new as MessageRow;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to messages');
        }
      });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [connectionStatus]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUser || connectionStatus !== 'connected') return;
    
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', currentUser.id)
        .single();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      const displayName = profileData?.display_name || currentUser.email?.split('@')[0] || 'Anonymous';
      
      // Insert message
      const { error } = await supabase
        .from('messages')
        .insert({
          text: newMessage,
          user_id: currentUser.id,
          user_display_name: displayName,
          user_avatar_url: profileData?.avatar_url || null
        });
      
      if (error) {
        console.error('Error sending message:', error);
        return;
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const toggleUsersList = () => {
    setShowUsersList(!showUsersList);
  };
  
  const retryConnection = () => {
    setConnectionStatus('connecting');
    setError(null);
    window.location.reload();
  };
  
  // Show connection error if disconnected
  if (connectionStatus === 'disconnected' && error) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={retryConnection}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Retry Connection
          </button>
          <button
            onClick={handleLogout}
            className="mt-4 text-indigo-600 hover:text-indigo-800"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Teja's Chat</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`h-2 w-2 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
              }`}></div>
              <span className="text-xs">
                {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
              </span>
            </div>
            <button 
              onClick={toggleUsersList}
              className="bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1 rounded-md flex items-center"
            >
              <Users size={16} className="mr-1" />
              <span className="hidden sm:inline">Online</span>
              <span className="ml-1 bg-green-500 text-xs rounded-full px-1.5 py-0.5">
                {onlineUsers.length}
              </span>
            </button>
            <span className="text-sm hidden md:inline">
              Signed in as <span className="font-semibold">{currentUser?.email}</span>
            </span>
            <button 
              onClick={handleLogout}
              className="bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1 rounded-md flex items-center"
            >
              <LogOut size={16} className="mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Room Info */}
          <div className="bg-white p-3 border-b border-gray-200 flex items-center">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800">Global Chat Room</h2>
              <p className="text-sm text-gray-500">Everyone is connected to this room</p>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col justify-center items-center h-full text-gray-500">
                <AlertCircle size={24} className="text-red-500 mb-2" />
                <p>{error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-2 text-indigo-600 hover:text-indigo-800"
                >
                  Refresh
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex justify-center items-center h-full text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <Message 
                  key={msg.id} 
                  message={msg} 
                  isOwnMessage={msg.user_id === currentUser?.id} 
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSubmit} className="flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={connectionStatus !== 'connected'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                type="submit"
                disabled={connectionStatus !== 'connected'}
                className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center disabled:bg-indigo-400"
              >
                <Send size={18} className="mr-1" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
        
        {/* Online Users Sidebar */}
        {showUsersList && (
          <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto hidden md:block">
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-700">Online Users ({onlineUsers.length})</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {onlineUsers.length === 0 ? (
                <li className="p-3 text-center text-gray-500 text-sm">
                  No users online
                </li>
              ) : (
                onlineUsers.map((user) => (
                  <li key={user.id} className="p-3 hover:bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {user.display_name || user.id.substring(0, 8)}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
        
        {/* Mobile Online Users Modal */}
        {showUsersList && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-700">Online Users ({onlineUsers.length})</h3>
                <button 
                  onClick={toggleUsersList}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {onlineUsers.length === 0 ? (
                  <li className="p-3 text-center text-gray-500 text-sm">
                    No users online
                  </li>
                ) : (
                  onlineUsers.map((user) => (
                    <li key={user.id} className="p-3 hover:bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-700">
                          {user.display_name || user.id.substring(0, 8)}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={toggleUsersList}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatRoom;