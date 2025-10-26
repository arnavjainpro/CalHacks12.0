import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAdherenceCoachProps {
  medication: string;
  dosage: string;
  patientName: string;
  patientAge?: number;
  refills?: number;
  onCoachingComplete?: () => void;
}

export default function AIAdherenceCoach({
  medication,
  dosage,
  patientName,
  patientAge,
  refills = 0,
  onCoachingComplete
}: AIAdherenceCoachProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [coachingData, setCoachingData] = useState<any>(null);
  const [selectedTips, setSelectedTips] = useState<string[]>([]);
  const [showGamification, setShowGamification] = useState(false);

  useEffect(() => {
    generateCoaching();
  }, [medication]);

  const generateCoaching = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/adherence-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: 'patient-001',
          medications: [{
            name: medication,
            schedule: 'twice daily',
            importance: 'high',
            startDate: new Date().toISOString(),
            refillDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }],
          patientProfile: {
            age: patientAge || 45,
            preferences: {
              reminderTime: ['9:00 AM', '9:00 PM'],
              communicationChannel: ['app_notification', 'text'],
              motivationType: 'health',
            },
          },
        }),
      });

      const data = await response.json();
      setCoachingData(data);
    } catch (error) {
      console.error('Adherence coaching failed:', error);
      // Fallback data
      setCoachingData({
        adherenceScore: 85,
        riskLevel: 'low',
        insights: {
          patterns: ['New medication start'],
          barriers: ['Remembering doses'],
          strengths: ['Motivated patient'],
        },
        coaching_messages: {
          current: 'Starting a new medication is an important step in your health journey!',
          motivational: 'Every dose you take brings you closer to better health.',
          tips: [
            'Set medication next to your toothbrush',
            'Use a pill organizer',
            'Set phone reminders',
          ],
        },
        gamification: {
          current_streak: 0,
          badges_earned: [],
          next_milestone: '7-day streak',
          points: 0,
        },
        reminder_schedule: [{
          medication,
          time: '9:00 AM',
          channel: 'app_notification',
          message: `Time for ${medication}!`,
        }],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTipToggle = (tip: string) => {
    setSelectedTips(prev =>
      prev.includes(tip) ? prev.filter(t => t !== tip) : [...prev, tip]
    );
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6"
      >
        <div className="flex items-center space-x-3">
          <div className="animate-pulse">
            <span className="text-3xl">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              AI Adherence Coach Loading
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Personalizing medication adherence strategies...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!coachingData) return null;

  const { adherenceScore, coaching_messages, gamification, reminder_schedule, insights } = coachingData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-900/10 dark:via-gray-800 dark:to-pink-900/10 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-700"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI Adherence Coach
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Personalized support for {patientName}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl">🎯</div>
          <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
            {adherenceScore}% Success Rate
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 border border-purple-100 dark:border-purple-800"
      >
        <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
          {coaching_messages.current}
        </p>
        <p className="text-sm text-purple-600 dark:text-purple-400 italic">
          "{coaching_messages.motivational}"
        </p>
      </motion.div>

      {/* Adherence Tips */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span>💡</span>
          <span>Personalized Adherence Tips</span>
        </h4>
        <div className="space-y-2">
          {coaching_messages.tips.map((tip: string, idx: number) => (
            <motion.div
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 transition"
              onClick={() => handleTipToggle(tip)}
            >
              <input
                type="checkbox"
                checked={selectedTips.includes(tip)}
                onChange={() => {}}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <span className="text-sm flex-1">{tip}</span>
              <span className="text-xs text-purple-600 dark:text-purple-400">Recommended</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Reminder Schedule */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <span>⏰</span>
          <span>Smart Reminder Schedule</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reminder_schedule.map((reminder: any, idx: number) => (
            <div
              key={idx}
              className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{reminder.time}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    via {reminder.channel.replace('_', ' ')}
                  </p>
                </div>
                <span className="text-2xl">📱</span>
              </div>
              <p className="text-xs mt-2 italic text-gray-700 dark:text-gray-300">
                "{reminder.message}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Gamification */}
      <div className="mb-6">
        <button
          onClick={() => setShowGamification(!showGamification)}
          className="font-semibold mb-3 flex items-center gap-2 hover:text-purple-600 dark:hover:text-purple-400 transition"
        >
          <span>🏆</span>
          <span>Adherence Rewards Program</span>
          <span className="text-sm">({showGamification ? '▼' : '▶'})</span>
        </button>

        <AnimatePresence>
          {showGamification && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-300 dark:border-yellow-700"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="text-sm font-semibold">Current Streak</div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {gamification.current_streak} days
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🎖️</div>
                  <div className="text-sm font-semibold">Badges</div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {gamification.badges_earned.length}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">⭐</div>
                  <div className="text-sm font-semibold">Points</div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {gamification.points}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-sm font-semibold">Next Goal</div>
                  <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {gamification.next_milestone}
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Keep taking your medication to unlock rewards and achievements!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Patient Insights */}
      {insights && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border border-blue-200 dark:border-blue-700">
          <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
            📊 AI-Identified Patterns
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Strengths:</p>
              <ul className="mt-1 space-y-1">
                {insights.strengths.map((s: string, i: number) => (
                  <li key={i} className="text-blue-700 dark:text-blue-300">• {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Barriers:</p>
              <ul className="mt-1 space-y-1">
                {insights.barriers.map((b: string, i: number) => (
                  <li key={i} className="text-blue-700 dark:text-blue-300">• {b}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">Focus Areas:</p>
              <ul className="mt-1 space-y-1">
                {insights.patterns.map((p: string, i: number) => (
                  <li key={i} className="text-blue-700 dark:text-blue-300">• {p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onCoachingComplete}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
      >
        Complete Patient Counseling
      </button>

      {/* AI Model Attribution */}
      <p className="text-xs text-center mt-4 text-gray-500 dark:text-gray-400">
        Powered by Reka AI • Personalized adherence strategies based on behavioral science
      </p>
    </motion.div>
  );
}