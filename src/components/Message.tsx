import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Database } from '../types/supabase';
import { User } from 'lucide-react';

type MessageRow = Database['public']['Tables']['messages']['Row'];

interface MessageProps {
  message: MessageRow;
  isOwnMessage: boolean;
}

const Message: React.FC<MessageProps> = ({ message, isOwnMessage }) => {
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
  
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
        isOwnMessage 
          ? 'bg-indigo-600 text-white rounded-br-none' 
          : 'bg-white border border-gray-200 rounded-bl-none'
      }`}>
        {!isOwnMessage && (
          <div className="flex items-center mb-1">
            {message.user_avatar_url ? (
              <img 
                src={message.user_avatar_url} 
                alt={message.user_display_name} 
                className="w-6 h-6 rounded-full mr-2"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center mr-2">
                <User size={14} className="text-gray-600" />
              </div>
            )}
            <span className="font-medium text-sm text-gray-700">
              {message.user_display_name}
            </span>
          </div>
        )}
        <p className={`${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>
          {message.text}
        </p>
        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'}`}>
          {timeAgo}
        </div>
      </div>
    </div>
  );
};

export default Message;