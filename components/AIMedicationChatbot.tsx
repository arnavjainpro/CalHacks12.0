import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface AIMedicationChatbotProps {
  medication?: string;
  patientName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIMedicationChatbot({
  medication,
  patientName = 'there',
  isOpen,
  onClose
}: AIMedicationChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting
      const greeting: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hello ${patientName}! I'm your AI medication assistant. I can help you understand your medications, side effects, proper usage, and answer any questions you have. What would you like to know?`,
        timestamp: new Date(),
        suggestions: medication ? [
          `Tell me about ${medication}`,
          'What are the side effects?',
          'How should I take it?',
          'Can I take it with food?',
          'What if I miss a dose?'
        ] : [
          'How do my medications work?',
          'Are there any interactions?',
          'Tips for remembering doses',
          'Managing side effects'
        ]
      };

      setMessages([greeting]);
      setQuickActions(greeting.suggestions || []);
    }
  }, [isOpen, medication, patientName]);

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing with predefined responses
    const lowerMessage = userMessage.toLowerCase();

    // Medication-specific responses
    if (medication && lowerMessage.includes(medication.toLowerCase())) {
      if (lowerMessage.includes('side effect')) {
        return `Common side effects of ${medication} may include:\n\n` +
          `• Mild: Nausea, headache, dizziness\n` +
          `• Less common: Fatigue, dry mouth\n` +
          `• Rare but serious: Allergic reactions, severe rash\n\n` +
          `Most side effects are mild and improve as your body adjusts. However, contact your healthcare provider immediately if you experience severe symptoms like difficulty breathing, swelling, or chest pain.\n\n` +
          `Would you like tips on managing specific side effects?`;
      }

      if (lowerMessage.includes('how') && lowerMessage.includes('take')) {
        return `Here's how to take ${medication} properly:\n\n` +
          `📋 Dosage: Follow your prescription exactly\n` +
          `⏰ Timing: Take at the same time each day\n` +
          `🍽️ With/Without Food: Can be taken with or without food\n` +
          `💊 Swallow whole - don't crush or chew\n` +
          `💧 Drink a full glass of water\n\n` +
          `Pro tip: Set a daily alarm on your phone to help remember your dose!\n\n` +
          `Do you have any specific concerns about taking ${medication}?`;
      }

      if (lowerMessage.includes('miss') && lowerMessage.includes('dose')) {
        return `If you miss a dose of ${medication}:\n\n` +
          `⏰ If it's been less than 12 hours: Take the missed dose as soon as you remember\n` +
          `⏰ If it's almost time for your next dose: Skip the missed dose\n` +
          `❌ Never double up on doses to make up for a missed one\n\n` +
          `Setting up reminders can help prevent missed doses. Would you like help setting up a medication reminder system?`;
      }

      if (lowerMessage.includes('food') || lowerMessage.includes('alcohol')) {
        return `Regarding ${medication} and food/drink interactions:\n\n` +
          `🍽️ Food: Can be taken with or without food. Taking with food may reduce stomach upset.\n` +
          `☕ Caffeine: Generally safe, but monitor for increased side effects\n` +
          `🍷 Alcohol: Best to avoid or limit alcohol as it may increase side effects\n` +
          `🥤 Grapefruit: Check with your pharmacist - some medications interact with grapefruit\n\n` +
          `Always stay well hydrated when taking medications. Any other dietary concerns?`;
      }
    }

    // General medication questions
    if (lowerMessage.includes('interaction')) {
      return `Drug interactions are important to monitor. Here's what you should know:\n\n` +
        `⚠️ Always inform your healthcare providers about:\n` +
        `• All prescription medications\n` +
        `• Over-the-counter drugs\n` +
        `• Vitamins and supplements\n` +
        `• Herbal products\n\n` +
        `Your pharmacist has checked for interactions, but always mention new medications or supplements before starting them.\n\n` +
        `Would you like me to explain any specific interactions?`;
    }

    if (lowerMessage.includes('remember') || lowerMessage.includes('forget')) {
      return `Great tips for remembering your medications:\n\n` +
        `📱 Phone Alarms: Set daily reminders\n` +
        `📦 Pill Organizers: Weekly pillboxes help track doses\n` +
        `🔗 Habit Stacking: Link to existing routines (breakfast, brushing teeth)\n` +
        `📝 Medication Chart: Keep a visible schedule\n` +
        `👥 Buddy System: Have someone help remind you\n` +
        `📲 Apps: Try medication reminder apps\n\n` +
        `Which strategy sounds most helpful for your lifestyle?`;
    }

    if (lowerMessage.includes('side effect') && !medication) {
      return `Managing side effects effectively:\n\n` +
        `🌟 Common strategies:\n` +
        `• Nausea: Take with food, ginger tea may help\n` +
        `• Drowsiness: Take at bedtime if possible\n` +
        `• Dry mouth: Stay hydrated, sugar-free gum\n` +
        `• Constipation: Increase fiber and water intake\n\n` +
        `⚠️ Always report persistent or severe side effects to your doctor. They may adjust your dose or suggest alternatives.\n\n` +
        `Which side effect would you like help managing?`;
    }

    if (lowerMessage.includes('stop') || lowerMessage.includes('quit')) {
      return `⚠️ Important: Never stop taking prescribed medications without consulting your healthcare provider first!\n\n` +
        `Stopping suddenly can cause:\n` +
        `• Withdrawal symptoms\n` +
        `• Return of original symptoms\n` +
        `• Serious health complications\n\n` +
        `If you're having issues with your medication, please discuss with your doctor. They can:\n` +
        `• Adjust the dose\n` +
        `• Switch to an alternative\n` +
        `• Create a tapering plan if needed\n\n` +
        `What concerns do you have about your medication?`;
    }

    if (lowerMessage.includes('cost') || lowerMessage.includes('expensive') || lowerMessage.includes('afford')) {
      return `I understand medication costs can be challenging. Here are some options:\n\n` +
        `💰 Cost-saving strategies:\n` +
        `• Ask about generic versions\n` +
        `• Check manufacturer coupons/patient assistance programs\n` +
        `• Compare pharmacy prices\n` +
        `• Consider mail-order pharmacies\n` +
        `• Ask about 90-day supplies (often cheaper per dose)\n` +
        `• Look into GoodRx or similar discount programs\n\n` +
        `Never skip doses to save money - talk to your doctor about affordable alternatives.\n\n` +
        `Would you like help finding assistance programs?`;
    }

    // Default response
    return `That's a great question! While I can provide general information, it's always best to consult with your healthcare provider or pharmacist for personalized medical advice.\n\n` +
      `Is there something specific about your medication regimen you'd like to understand better? I'm here to help explain:\n` +
      `• How medications work\n` +
      `• Proper usage and timing\n` +
      `• Side effect management\n` +
      `• Drug interactions\n` +
      `• Adherence strategies`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(async () => {
      const aiResponse = await generateAIResponse(input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);

      // Update quick actions based on context
      if (input.toLowerCase().includes('side effect')) {
        setQuickActions([
          'How to manage nausea?',
          'Dealing with drowsiness',
          'When to call doctor?',
          'Are these normal?'
        ]);
      } else if (input.toLowerCase().includes('miss')) {
        setQuickActions([
          'Set up reminders',
          'Get a pill organizer',
          'Double dose safety',
          'Tracking my doses'
        ]);
      }
    }, 1500);
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    handleSend();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-4 right-4 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-xl flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold">MedChat AI Assistant</h3>
            <p className="text-xs text-blue-100">Powered by Reka AI</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">AI Assistant</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 3).map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(action);
                  setQuickActions([]);
                }}
                className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about medications..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          For emergencies, call 911 or contact your healthcare provider
        </p>
      </div>
    </motion.div>
  );
}