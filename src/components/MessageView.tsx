import React, { useState, useEffect, useRef } from 'react';
import { ContactSettings } from '../types';
import {
  Send,
  CheckCheck,
  Lock,
  AlertCircle,
  User,
  Phone,
  MessageSquare,
  MapPin,
  Mail,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

const SpaHeaderIcon: React.FC<{ className?: string }> = ({ className = "text-base text-[#d5e8cf]" }) => (
  <i className={`fa-solid fa-spa ${className}`} aria-hidden="true" />
);

interface MessageViewProps {
  contactSettings: ContactSettings;
  onSendClientNotificationMessage?: (
    messageText: string,
    clientName?: string,
    clientPhone?: string,
    serviceNote?: string,
    source?: 'Message Tab' | 'Home Page' | 'Chatbot'
  ) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'concierge';
  text: string;
  time: string;
  clientInfo?: {
    name: string;
    phone: string;
  };
}

export const MessageView: React.FC<MessageViewProps> = ({
  contactSettings,
  onSendClientNotificationMessage,
}) => {
  // Session / LocalStorage Persistence for client chat messages
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('spa_client_chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [
      {
        id: 'm-1',
        sender: 'concierge',
        text: 'Welcome to Premium Spa Concierge! How may we assist your wellness journey today?',
        time: '10:00 AM',
      },
      {
        id: 'm-2',
        sender: 'concierge',
        text: 'Please provide your Name, Phone Number, and Service Note to connect directly with our concierge team.',
        time: '10:01 AM',
      },
    ];
  });

  // Remember client name & phone across sessions in localStorage
  const [clientName, setClientName] = useState(() => localStorage.getItem('spa_client_name') || '');
  const [clientPhone, setClientPhone] = useState(() => localStorage.getItem('spa_client_phone') || '');
  const [serviceNote, setServiceNote] = useState('');

  // Validation error state
  const [validationError, setValidationError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, validationError]);

  // Save chat messages to LocalStorage
  useEffect(() => {
    localStorage.setItem('spa_client_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Save client contact info in LocalStorage when typed
  useEffect(() => {
    if (clientName) localStorage.setItem('spa_client_name', clientName);
    if (clientPhone) localStorage.setItem('spa_client_phone', clientPhone);
  }, [clientName, clientPhone]);

  const quickQuestions = [
    'Can I reschedule my appointment?',
    'Do therapists bring their own tables & oils?',
    'What preparation is needed for Reiki Therapy?',
  ];

  // Validate contact info & message
  const validateForm = (note: string): boolean => {
    const trimmedName = clientName.trim();
    const trimmedPhone = clientPhone.replace(/\D/g, ''); // Extract numeric digits
    const trimmedNote = note.trim();

    if (!trimmedName || trimmedPhone.length < 10 || !trimmedNote) {
      setValidationError('Please provide your Name, Phone Number, and Service Note before sending.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSend = (textToSend?: string) => {
    const noteText = textToSend || serviceNote;

    if (!validateForm(noteText)) {
      return;
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const fullMsgText = `[${clientName.trim()} - ${clientPhone.trim()}]: ${noteText.trim()}`;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: fullMsgText,
      time: timeString,
      clientInfo: {
        name: clientName.trim(),
        phone: clientPhone.trim(),
      },
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setServiceNote('');

    // Send verified notification alert to Admin panel
    onSendClientNotificationMessage?.(
      noteText.trim(),
      clientName.trim(),
      clientPhone.trim(),
      noteText.trim(),
      'Chatbot'
    );

    // Automated Chatbot Reply
    setTimeout(() => {
      let botReplyText = `Thank you ${clientName.trim()}! Our concierge team has received your inquiry and will call you on ${clientPhone.trim()} shortly.`;

      if (noteText.toLowerCase().includes('reschedule')) {
        botReplyText = `Thank you ${clientName.trim()}! Free rescheduling is available up to 24 hours prior to your slot. Our concierge team will call ${clientPhone.trim()} to adjust your appointment.`;
      } else if (noteText.toLowerCase().includes('bring') || noteText.toLowerCase().includes('tables')) {
        botReplyText = `Hello ${clientName.trim()}! Yes, all certified therapists arrive fully equipped with sanitized linens, essential oils, calming music, and portable massage tables. We will confirm your setup via call on ${clientPhone.trim()}.`;
      } else if (noteText.toLowerCase().includes('reiki') || noteText.toLowerCase().includes('preparation')) {
        botReplyText = `For Reiki & Energy sessions, we recommend wearing comfortable, soft clothing and keeping a quiet room. Our therapist will call ${clientPhone.trim()} prior to arrival.`;
      }

      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        sender: 'concierge',
        text: botReplyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMsg]);
    }, 800);
  };

  const clearChatSession = () => {
    localStorage.removeItem('spa_client_chat_messages');
    setMessages([
      {
        id: 'm-1',
        sender: 'concierge',
        text: 'Welcome to Premium Spa Concierge! How may we assist your wellness journey today?',
        time: '10:00 AM',
      },
      {
        id: 'm-2',
        sender: 'concierge',
        text: 'Please provide your Name, Phone Number, and Service Note to connect directly with our concierge team.',
        time: '10:01 AM',
      },
    ]);
    setValidationError(null);
  };

  return (
    <div className="px-4 py-3 md:py-6 max-w-md md:max-w-6xl mx-auto animate-fade-in pb-20 md:pb-8 box-border">
      {/* Grid Container: Single column on mobile, 12 cols on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-stretch">
        
        {/* Left Column (Contact Info & Hours - 5 cols desktop, hidden on mobile) */}
        <div className="hidden md:flex md:col-span-5 flex-col justify-between bg-white rounded-2xl border border-stone-200/80 p-6 lg:p-8 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-1.5">
              <span className="text-xs font-bold tracking-[0.2em] text-[#747871] uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#4A604A]" /> Spa Assistance
              </span>
              <h2 className="font-serif text-2xl lg:text-3xl font-medium text-stone-800">
                Get in Touch
              </h2>
              <p className="text-stone-600 text-xs lg:text-sm leading-relaxed">
                Our dedicated spa concierge team is available to customize your wellness experience, answer queries, or schedule home & hotel treatments.
              </p>
            </div>

            <div className="border-b border-stone-100 my-2" />

            {/* Contact Details List */}
            <div className="space-y-5">
              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-stone-100 text-[#4A604A] shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Location
                  </h4>
                  <p className="text-sm font-medium text-stone-800 mt-0.5 leading-snug">
                    Indore & Surrounding Areas
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-stone-100 text-[#4A604A] shrink-0 mt-0.5">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Direct Call Number
                  </h4>
                  <p className="text-sm font-medium text-stone-800 mt-0.5">
                    {contactSettings.callNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-stone-100 text-[#4A604A] shrink-0 mt-0.5">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Email
                  </h4>
                  <p className="text-sm font-medium text-stone-800 mt-0.5">
                    {contactSettings.contactEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-stone-100 text-[#4A604A] shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Operating Hours
                  </h4>
                  <p className="text-sm font-medium text-stone-800 mt-0.5">
                    Mon - Sun: 9:00 AM - 10:00 PM
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Luxury Badge */}
          <div className="mt-8 bg-[#D5E8CF]/40 border border-[#4A604A]/20 rounded-xl p-4 flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-[#4A604A] shrink-0" />
            <p className="text-xs text-[#394d39] font-medium leading-relaxed">
              Certified Therapists • 100% Sanitized Equipment Delivered to Your Doorstep
            </p>
          </div>
        </div>

        {/* Right Column (Live Spa Concierge Form - 7 cols desktop) */}
        <div className="col-span-1 md:col-span-7 bg-white rounded-2xl border border-stone-200/80 p-4 md:p-6 shadow-sm flex flex-col h-[calc(100vh-140px)] md:h-[620px] relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#e9e8e3] shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#4A604A] text-white flex items-center justify-center font-bold shadow-xs">
                <SpaHeaderIcon className="text-lg text-[#d5e8cf]" />
              </div>
              <div>
                <h2 className="font-serif text-lg text-[#1b1c19] font-medium">Spa Concierge & Support</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-semibold text-[#22c55e] flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block animate-pulse" />
                    <span>Online • Instant Response</span>
                  </span>
                  <span className="text-[10px] text-[#747871] flex items-center space-x-0.5" title="Chat data stored locally on your device only">
                    <Lock className="w-2.5 h-2.5 text-[#4A604A]" />
                    <span>Private Session</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={clearChatSession}
              className="text-[10px] text-[#747871] hover:text-[#ba1a1a] underline cursor-pointer"
              title="Reset local chat history"
            >
              Clear Chat
            </button>
          </div>

          {/* Quick Questions Pills */}
          <div className="py-2.5 flex space-x-2 overflow-x-auto no-scrollbar shrink-0">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setServiceNote(q);
                  setValidationError(null);
                }}
                className="bg-stone-100 hover:bg-[#D5E8CF] text-stone-700 text-xs px-3 py-1.5 rounded-full border border-stone-200 transition-colors cursor-pointer whitespace-nowrap shrink-0 font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Message Chat List */}
          <div className="flex-1 overflow-y-auto space-y-3 pt-2 pb-4 pr-1 min-h-0 scroll-smooth">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                    m.sender === 'user'
                      ? 'bg-[#4A604A] text-white rounded-tr-xs shadow-xs'
                      : 'bg-stone-50 text-[#1b1c19] border border-stone-200/80 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <div
                    className={`flex items-center justify-end space-x-1 text-[9px] ${
                      m.sender === 'user' ? 'text-[#cbdec5]' : 'text-stone-400'
                    }`}
                  >
                    <span>{m.time}</span>
                    {m.sender === 'user' && <CheckCheck className="w-3 h-3 text-[#d5e8cf]" />}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Validation Error Prompt */}
          {validationError && (
            <div className="mb-2 p-2.5 bg-[#ffdad6]/90 border border-[#ba1a1a]/40 text-[#ba1a1a] rounded-xl text-[11px] font-medium flex items-start space-x-2 animate-shake shrink-0 shadow-xs">
              <AlertCircle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
              <p className="leading-snug">{validationError}</p>
            </div>
          )}

          {/* Input Form Bar */}
          <div className="pt-2 bg-white border-t border-stone-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5"
            >
              {/* Client Details Row: Name & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2 px-3 py-2 bg-stone-50/50 rounded-xl border border-stone-200 focus-within:ring-1 focus-within:ring-[#4A604A] focus-within:border-[#4A604A] transition-all">
                  <User className="w-3.5 h-3.5 text-[#4A604A] shrink-0" />
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full text-xs md:text-sm bg-transparent focus:outline-none text-[#1b1c19] placeholder:text-stone-400"
                  />
                </div>
                <div className="flex items-center space-x-2 px-3 py-2 bg-stone-50/50 rounded-xl border border-stone-200 focus-within:ring-1 focus-within:ring-[#4A604A] focus-within:border-[#4A604A] transition-all">
                  <Phone className="w-3.5 h-3.5 text-[#4A604A] shrink-0" />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full text-xs md:text-sm bg-transparent focus:outline-none text-[#1b1c19] placeholder:text-stone-400"
                  />
                </div>
              </div>

              {/* Service Note & Send Button */}
              <div className="flex items-center space-x-2">
                <div className="flex-1 flex items-center space-x-2 px-3 py-2 bg-stone-50/50 rounded-xl border border-stone-200 focus-within:ring-1 focus-within:ring-[#4A604A] focus-within:border-[#4A604A] transition-all">
                  <MessageSquare className="w-3.5 h-3.5 text-[#4A604A] shrink-0" />
                  <input
                    type="text"
                    placeholder="Service Note or Inquiry *"
                    value={serviceNote}
                    onChange={(e) => {
                      setServiceNote(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full text-xs md:text-sm bg-transparent focus:outline-none text-[#1b1c19] placeholder:text-stone-400"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#4A604A] hover:bg-[#384a38] text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shrink-0 shadow-xs"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

