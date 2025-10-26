import { NextRequest, NextResponse } from 'next/server';

// Adherence patterns and behavioral insights
const ADHERENCE_PATTERNS = {
  barriers: {
    forgetfulness: {
      indicators: ['missed_morning', 'irregular_timing'],
      interventions: ['smart_reminders', 'habit_stacking', 'visual_cues']
    },
    side_effects: {
      indicators: ['stopped_after_days', 'reduced_dose'],
      interventions: ['side_effect_management', 'dose_titration', 'alternative_formulations']
    },
    cost: {
      indicators: ['partial_fills', 'skipped_doses'],
      interventions: ['generic_alternatives', 'assistance_programs', 'pill_splitting']
    },
    complexity: {
      indicators: ['multiple_medications', 'frequent_dosing'],
      interventions: ['simplification', 'combination_products', 'pill_organizers']
    },
    beliefs: {
      indicators: ['intermittent_use', 'self_adjustment'],
      interventions: ['education', 'motivational_interviewing', 'shared_decision_making']
    }
  },

  motivationalStrategies: {
    achievement: ['Track your streak!', 'You\'re building healthy habits', 'Celebrate milestones'],
    health: ['Protect your health', 'Feel better every day', 'Prevent complications'],
    family: ['Be there for loved ones', 'Set a good example', 'Stay healthy for them'],
    autonomy: ['Take control', 'Your choice matters', 'Empower yourself'],
    social: ['Join our community', 'Share your progress', 'Support others']
  },

  behavioralTechniques: {
    habit_stacking: 'Link medication to existing routine (e.g., with morning coffee)',
    implementation_intention: 'If-then planning (If I brush teeth, then I take medication)',
    visual_reminders: 'Place medications in visible location',
    reward_systems: 'Small rewards for adherence milestones',
    social_support: 'Involve family member or friend',
    simplification: 'Use pill organizers or blister packs'
  }
};

// Personalized reminder optimization
const REMINDER_OPTIMIZATION = {
  timing: {
    morning_person: ['6:00 AM', '7:00 AM', '8:00 AM'],
    evening_person: ['8:00 PM', '9:00 PM', '10:00 PM'],
    meal_based: ['breakfast', 'lunch', 'dinner'],
    work_schedule: ['before_work', 'lunch_break', 'after_work']
  },

  channels: {
    text: { effectiveness: 0.75, fatigue_rate: 0.1 },
    app_notification: { effectiveness: 0.80, fatigue_rate: 0.15 },
    email: { effectiveness: 0.60, fatigue_rate: 0.05 },
    smart_speaker: { effectiveness: 0.85, fatigue_rate: 0.08 },
    wearable: { effectiveness: 0.90, fatigue_rate: 0.12 }
  },

  escalation: {
    level1: 'gentle_reminder',
    level2: 'importance_emphasis',
    level3: 'consequence_warning',
    level4: 'caregiver_alert'
  }
};

interface AdherenceCoachRequest {
  patientId: string;
  medications: Array<{
    name: string;
    schedule: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
    startDate: string;
    refillDate?: string;
  }>;
  adherenceHistory?: Array<{
    date: string;
    medication: string;
    taken: boolean;
    time?: string;
    reason?: string;
  }>;
  patientProfile?: {
    age: number;
    preferences?: {
      reminderTime?: string[];
      communicationChannel?: string[];
      motivationType?: string;
    };
    lifestyle?: {
      workSchedule?: string;
      sleepSchedule?: string;
      mealTimes?: string[];
    };
    challenges?: string[];
  };
  currentQuery?: string;
}

interface AdherenceCoachResponse {
  adherenceScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  insights: {
    patterns: string[];
    barriers: string[];
    strengths: string[];
  };
  personalized_interventions: Array<{
    type: 'reminder' | 'education' | 'motivation' | 'simplification' | 'support';
    strategy: string;
    implementation: string;
    priority: 'immediate' | 'short_term' | 'long_term';
  }>;
  coaching_messages: {
    current: string;
    motivational: string;
    educational?: string;
    tips: string[];
  };
  reminder_schedule: Array<{
    medication: string;
    time: string;
    channel: string;
    message: string;
  }>;
  gamification: {
    current_streak: number;
    badges_earned: string[];
    next_milestone: string;
    points: number;
  };
  ai_recommendations?: string;
  refill_alerts?: Array<{
    medication: string;
    daysRemaining: number;
    action: string;
  }>;
}

async function generatePersonalizedCoaching(patient: any, medications: any, adherenceHistory: any): Promise<string> {
  try {
    const response = await fetch('https://api.reka.ai/v1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REKA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'reka-flash',
        messages: [{
          role: 'user',
          content: `As a medication adherence coach, create personalized strategies for this patient:

            Patient Profile: ${JSON.stringify(patient)}
            Medications: ${JSON.stringify(medications)}
            Adherence History: ${JSON.stringify(adherenceHistory?.slice(-30))}

            Provide:
            1. Personalized behavioral strategies based on adherence patterns
            2. Motivational messaging tailored to patient's values
            3. Practical tips for overcoming specific barriers
            4. Habit formation recommendations
            5. Technology integration suggestions
            6. Family/caregiver involvement strategies

            Be empathetic, encouraging, and solution-focused.`
        }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content;
    }
  } catch (error) {
    console.error('AI coaching generation failed:', error);
  }
  return '';
}

function calculateAdherenceScore(history: any[]): number {
  if (!history || history.length === 0) return 100;

  const recentHistory = history.slice(-30); // Last 30 entries
  const takenCount = recentHistory.filter(h => h.taken).length;
  const baseScore = (takenCount / recentHistory.length) * 100;

  // Apply weighting for recency
  const lastWeek = history.slice(-7);
  const lastWeekScore = lastWeek.filter(h => h.taken).length / lastWeek.length * 100;

  return Math.round(baseScore * 0.6 + lastWeekScore * 0.4);
}

function identifyBarriers(history: any[], patient: any): string[] {
  const barriers: string[] = [];

  if (!history || history.length === 0) return ['No adherence data available'];

  // Check for forgetfulness pattern
  const morningMisses = history.filter(h => !h.taken && h.time?.includes('morning')).length;
  if (morningMisses > 3) barriers.push('Morning routine disruption');

  // Check for weekend pattern
  const weekendMisses = history.filter(h => {
    const date = new Date(h.date);
    return !h.taken && (date.getDay() === 0 || date.getDay() === 6);
  }).length;
  if (weekendMisses > history.length * 0.3) barriers.push('Weekend adherence challenges');

  // Check for stopping pattern (consecutive misses)
  let consecutiveMisses = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].taken) consecutiveMisses++;
    else break;
  }
  if (consecutiveMisses >= 3) barriers.push('Possible discontinuation - may be experiencing side effects');

  // Check patient-reported challenges
  if (patient?.challenges) {
    barriers.push(...patient.challenges);
  }

  return barriers;
}

function generateGamification(adherenceScore: number, history: any[]): any {
  const streak = history ? history.filter(h => h.taken).length : 0;

  const badges: string[] = [];
  if (streak >= 7) badges.push('Week Warrior');
  if (streak >= 30) badges.push('Monthly Master');
  if (adherenceScore >= 90) badges.push('Adherence Star');
  if (streak >= 100) badges.push('Century Champion');

  const points = streak * 10 + Math.floor(adherenceScore);

  const nextMilestone = streak < 7 ? '7-day streak' :
                       streak < 30 ? '30-day streak' :
                       streak < 100 ? '100-day streak' : '365-day streak';

  return {
    current_streak: streak,
    badges_earned: badges,
    next_milestone: nextMilestone,
    points
  };
}

function optimizeReminderSchedule(medications: any[], patient: any): any[] {
  const schedule: any[] = [];

  medications.forEach(med => {
    // Determine optimal time based on medication schedule and patient preference
    let reminderTime = '9:00 AM'; // Default

    if (med.schedule.includes('morning')) {
      reminderTime = patient?.lifestyle?.mealTimes?.[0] || '8:00 AM';
    } else if (med.schedule.includes('evening')) {
      reminderTime = patient?.lifestyle?.mealTimes?.[2] || '7:00 PM';
    } else if (med.schedule.includes('bedtime')) {
      reminderTime = '10:00 PM';
    }

    // Select best channel based on patient preference and effectiveness
    const preferredChannel = patient?.preferences?.communicationChannel?.[0] || 'app_notification';

    // Create personalized message based on importance and motivation type
    const motivationType = patient?.preferences?.motivationType || 'health';
    const motivationalMessages = ADHERENCE_PATTERNS.motivationalStrategies[motivationType as keyof typeof ADHERENCE_PATTERNS.motivationalStrategies];
    const message = med.importance === 'critical' ?
      `⚠️ Time for ${med.name} - Critical for your health! ${motivationalMessages?.[0]}` :
      `💊 Time for ${med.name}! ${motivationalMessages?.[0]}`;

    schedule.push({
      medication: med.name,
      time: reminderTime,
      channel: preferredChannel,
      message
    });

    // Add second reminder for critical medications
    if (med.importance === 'critical') {
      schedule.push({
        medication: med.name,
        time: `${parseInt(reminderTime) + 1}:00 ${reminderTime.includes('PM') ? 'PM' : 'AM'}`,
        channel: 'text',
        message: `Second reminder: ${med.name} - Please confirm you've taken it`
      });
    }
  });

  return schedule;
}

export async function POST(req: NextRequest) {
  try {
    const {
      patientId,
      medications,
      adherenceHistory,
      patientProfile,
      currentQuery
    }: AdherenceCoachRequest = await req.json();

    // Calculate adherence metrics
    const adherenceScore = calculateAdherenceScore(adherenceHistory || []);
    const riskLevel: 'low' | 'medium' | 'high' =
      adherenceScore >= 80 ? 'low' :
      adherenceScore >= 60 ? 'medium' : 'high';

    // Identify patterns and barriers
    const barriers = identifyBarriers(adherenceHistory || [], patientProfile);

    const patterns: string[] = [];
    if (adherenceScore < 80) patterns.push('Suboptimal adherence detected');
    if (barriers.includes('Morning routine disruption')) patterns.push('Difficulty with morning medications');
    if (barriers.includes('Weekend adherence challenges')) patterns.push('Weekend schedule affects adherence');

    const strengths: string[] = [];
    if (adherenceScore > 70) strengths.push('Generally good adherence');
    if (adherenceHistory?.some(h => h.taken && h.medication.includes('critical'))) {
      strengths.push('Prioritizes critical medications');
    }

    // Generate personalized interventions
    const interventions: any[] = [];

    if (barriers.includes('Morning routine disruption')) {
      interventions.push({
        type: 'reminder',
        strategy: 'Habit stacking with morning routine',
        implementation: 'Set medication next to coffee maker or toothbrush',
        priority: 'immediate'
      });
    }

    if (barriers.includes('Possible discontinuation - may be experiencing side effects')) {
      interventions.push({
        type: 'support',
        strategy: 'Side effect management consultation',
        implementation: 'Schedule pharmacist consultation for side effect mitigation',
        priority: 'immediate'
      });
    }

    if (medications.length > 3) {
      interventions.push({
        type: 'simplification',
        strategy: 'Medication synchronization',
        implementation: 'Align refill dates and consider combination products',
        priority: 'short_term'
      });
    }

    // Generate coaching messages
    const aiCoaching = await generatePersonalizedCoaching(patientProfile, medications, adherenceHistory);

    const coachingMessages = {
      current: riskLevel === 'high' ?
        'Let\'s work together to improve your medication routine. Small changes can make a big difference!' :
        'You\'re doing well! Let\'s keep building on your success.',
      motivational: `Your health is worth the effort. Every dose counts toward feeling your best!`,
      educational: medications.some(m => m.importance === 'critical') ?
        'Your critical medications work best when taken consistently as prescribed.' : undefined,
      tips: [
        'Use a pill organizer to simplify your routine',
        'Set up automatic refill reminders',
        'Keep a backup dose in your car or office',
        'Track your progress with our app',
        'Celebrate adherence milestones'
      ].slice(0, 3)
    };

    // Check refill needs
    const refillAlerts: any[] = [];
    const today = new Date();

    medications.forEach(med => {
      if (med.refillDate) {
        const refillDate = new Date(med.refillDate);
        const daysRemaining = Math.ceil((refillDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 7) {
          refillAlerts.push({
            medication: med.name,
            daysRemaining,
            action: daysRemaining <= 3 ? 'Urgent: Refill immediately' : 'Schedule refill soon'
          });
        }
      }
    });

    // Generate reminder schedule
    const reminderSchedule = optimizeReminderSchedule(medications, patientProfile);

    // Calculate gamification elements
    const gamification = generateGamification(adherenceScore, adherenceHistory || []);

    const response: AdherenceCoachResponse = {
      adherenceScore,
      riskLevel,
      insights: {
        patterns,
        barriers,
        strengths
      },
      personalized_interventions: interventions,
      coaching_messages: coachingMessages,
      reminder_schedule: reminderSchedule,
      gamification,
      ai_recommendations: aiCoaching,
      refill_alerts: refillAlerts.length > 0 ? refillAlerts : undefined
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Adherence coach error:', error);
    return NextResponse.json(
      { error: 'Failed to generate adherence coaching' },
      { status: 500 }
    );
  }
}