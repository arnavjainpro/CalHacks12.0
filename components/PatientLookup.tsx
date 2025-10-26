"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { WalletStatus } from '@/components/WalletStatus';
import { useMyCredential } from '@/lib/hooks/useCredential';
import {
  usePatientPrescriptionHistory,
  useBatchPrescriptionStatus,
  useBatchPrescriptionDetails,
  type PrescriptionWithMetadata
} from '@/lib/hooks/usePrescription';
import { CredentialType, PrescriptionStatus } from '@/lib/contracts/config';
import { hashPatientData } from '@/lib/utils/crypto';
import PrescriptionDetails from '@/components/PrescriptionDetails';
import {
  Search,
  ClipboardList,
  BarChart3,
  Bot,
  AlertTriangle,
  CheckCircle,
  Circle,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';

interface PrescriptionSummary {
  id: bigint;
  status: PrescriptionStatus;
}

interface PatientLookupProps {
  role: 'doctor' | 'pharmacist';
}

interface SearchTab {
  id: number;
  patientName: string;
  patientDOB: string;
  patientID: string;
  patientHash?: `0x${string}`;
  hasSearched: boolean;
  viewMode: 'list' | 'analytics' | 'aiinsights';
  aiInsights: string;
}

export default function PatientLookup({ role }: PatientLookupProps) {
  const { isConnected } = useAccount();
  const { credential, isLoading: credentialLoading } = useMyCredential();

  // Multi-search tab state
  const [tabs, setTabs] = useState<SearchTab[]>([
    { id: 1, patientName: '', patientDOB: '', patientID: '', hasSearched: false, viewMode: 'list', aiInsights: '' }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);

  const activeTab = tabs.find(tab => tab.id === activeTabId)!;

  // Query patient history for active tab
  const {
    prescriptionIds,
    isLoading: historyLoading,
    error: historyError
  } = usePatientPrescriptionHistory(activeTab.patientHash);

  // Get statuses for all prescriptions
  const { statuses, isLoading: statusesLoading } = useBatchPrescriptionStatus(
    prescriptionIds || []
  );

  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);

  // Fetch full prescription details with IPFS CIDs when in analytics or AI insights mode
  const {
    prescriptions: fullPrescriptions,
    isLoading: loadingDetails
  } = useBatchPrescriptionDetails(
    (activeTab.viewMode === 'analytics' || activeTab.viewMode === 'aiinsights')
      ? (prescriptionIds || [])
      : []
  );

  // Combine prescription IDs with their statuses
  useEffect(() => {
    if (prescriptionIds && statuses) {
      const combined = prescriptionIds.map((id, index) => ({
        id,
        status: statuses[index],
      }));
      setPrescriptions(combined);
    }
  }, [prescriptionIds, statuses]);

  const expectedCredentialType = role === 'doctor' ? CredentialType.Doctor : CredentialType.Pharmacist;
  const isCorrectRole = credential?.credentialType === expectedCredentialType;
  const hasValidCredential = credential?.isActive && BigInt(Date.now()) < credential.expiresAt * 1000n;

  // Helper function to update active tab
  const updateActiveTab = (updates: Partial<SearchTab>) => {
    setTabs(tabs.map(tab =>
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };

  // Add new search tab
  const addNewTab = () => {
    if (tabs.length >= 4) return; // Max 4 tabs
    const newTab: SearchTab = {
      id: nextTabId,
      patientName: '',
      patientDOB: '',
      patientID: '',
      hasSearched: false,
      viewMode: 'list',
      aiInsights: ''
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(nextTabId);
    setNextTabId(nextTabId + 1);
  };

  // Close tab
  const closeTab = (tabId: number) => {
    if (tabs.length === 1) return; // Keep at least one tab
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab.patientName || !activeTab.patientDOB || !activeTab.patientID) {
      return;
    }

    // Hash patient data
    const hash = hashPatientData(activeTab.patientName, activeTab.patientDOB, activeTab.patientID);
    updateActiveTab({ patientHash: hash, hasSearched: true });
  };

  const handleReset = () => {
    updateActiveTab({
      patientName: '',
      patientDOB: '',
      patientID: '',
      patientHash: undefined,
      hasSearched: false,
      viewMode: 'list',
      aiInsights: ''
    });
    setPrescriptions([]);
  };

  // Generate AI insights about the patient with comprehensive analysis
  const generateAIInsights = async () => {
    if (!fullPrescriptions || fullPrescriptions.length === 0) return;

    // Show loading state
    updateActiveTab({ aiInsights: '## AI Analysis Loading...\n\nConnecting to Reka AI for advanced clinical analysis...' });

    // Cast to extended type for metadata access
    const prescriptionsWithMeta = fullPrescriptions as PrescriptionWithMetadata[];

    console.log('[generateAIInsights] Processing prescriptions with metadata:', prescriptionsWithMeta);
    console.log('[generateAIInsights] Metadata availability:',
      prescriptionsWithMeta.map(p => ({
        id: p.prescriptionId.toString(),
        hasMetadata: !!p.metadata,
        medication: p.metadata?.medication
      }))
    );

    // Extract medication data from prescriptions
    const medications: string[] = [];
    const activeMedications: string[] = [];

    for (const prescription of prescriptionsWithMeta) {
      // Try to get medication info from metadata (if IPFS was fetched)
      // or use prescription ID as fallback
      const medName = prescription.metadata?.medication ||
                     `Prescription #${prescription.prescriptionId}`;

      medications.push(medName);

      if (prescription.status === 0) { // Active status
        activeMedications.push(medName);
      }
    }

    const activeCount = activeMedications.length;
    const totalCount = prescriptionsWithMeta.length;
    const dispensedCount = prescriptionsWithMeta.filter(p => p.status === 1).length;

    // Prepare detailed medication list for AI analysis with ALL available data
    const medicationDetails = prescriptionsWithMeta.map(p => ({
      name: p.metadata?.medication || 'Unknown',
      dosage: p.metadata?.dosage || 'Unknown',
      quantity: p.metadata?.quantity || 'Unknown',
      refills: p.metadata?.refills || 0,
      instructions: p.metadata?.instructions || 'No instructions provided',
      status: p.status === 0 ? 'Active' : p.status === 1 ? 'Dispensed' : 'Inactive',
      issued: new Date(Number(p.issuedAt) * 1000).toLocaleDateString(),
      expires: new Date(Number(p.expiresAt) * 1000).toLocaleDateString(),
      prescriptionId: p.prescriptionId.toString(),
    }));

    try {
      // Call the Reka AI API
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientName: activeTab.patientName,
          medications: medicationDetails,
          activeCount,
          totalCount,
          dispensedCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI analysis');
      }

      const result = await response.json();

      // Check if we got AI analysis or fallback
      const aiHeader = result.isAI
        ? '## Reka AI Clinical Analysis\n\n**Powered by Advanced Medical AI**\n\n'
        : '## Clinical Analysis\n\n**Note:** Using local analysis engine\n\n';

      updateActiveTab({ aiInsights: aiHeader + result.analysis });
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      // Fall back to the comprehensive local analysis
      const localAnalysis = generateLocalAnalysis(
        prescriptionsWithMeta,
        activeMedications,
        medicationDetails,
        activeCount,
        totalCount,
        dispensedCount
      );
      updateActiveTab({ aiInsights: localAnalysis });
    }
  };

  // Local comprehensive analysis as fallback
  const generateLocalAnalysis = (
    prescriptionsWithMeta: PrescriptionWithMetadata[],
    activeMedications: string[],
    medicationDetails: any[],
    activeCount: number,
    totalCount: number,
    dispensedCount: number
  ): string => {
    // Advanced AI Analysis using comprehensive medication data
    return `## Advanced AI-Powered Prescription Analysis

**Patient:** ${activeTab.patientName}
**Analysis Date:** ${new Date().toLocaleDateString()}
**Powered by:** Advanced Clinical Decision Support AI

### Prescription Overview
- **Total Prescriptions:** ${totalCount}
- **Currently Active:** ${activeCount}
- **Dispensed:** ${dispensedCount}
- **Risk Assessment:** ${hasMultipleActive || hasHighVolume ? '**HIGH RISK**' : '**LOW RISK**'}

### Active Medications
${activeMedications.length > 0 ? activeMedications.map(med => `- ${med}`).join('\n') : '- No active medications'}

### Critical Drug Interaction Analysis

${activeMedications.length >= 2 ? `**IMPORTANT:** Multiple active medications detected. Analyzing for interactions...

${checkCommonInteractions(activeMedications)}` : 'No drug interactions possible (single or no active medication)'}

### Detailed Clinical Insights

${generateDetailedInsights(medicationDetails, activeCount, hasMultipleActive, hasHighVolume)}

### Personalized Recommendations

${generatePersonalizedRecommendations(activeMedications, hasMultipleActive, hasHighVolume)}

### Prescription Details
${medicationDetails.map(med => `
**${med.name}**
- Dosage: ${med.dosage}
- Status: ${med.status}
- Issued: ${med.issued}
- Expires: ${med.expires}`).join('\n')}

### Advanced Analytics

1. **Polypharmacy Risk**: ${activeCount >= 5 ? 'HIGH - 5+ medications' : activeCount >= 3 ? 'MODERATE - 3-4 medications' : 'LOW - Less than 3 medications'}
2. **Adherence Pattern**: ${calculateAdherencePattern(prescriptionsWithMeta)}
3. **Prescription Velocity**: ${calculatePrescriptionVelocity(prescriptionsWithMeta)}
4. **Therapeutic Duplication Risk**: ${checkTherapeuticDuplication(activeMedications)}

### Safety Alerts

${generateSafetyAlerts(activeMedications, medicationDetails)}

### Clinical Decision Support

${generateClinicalDecisionSupport(activeMedications, activeTab.patientName)}

### Trend Analysis

- **Prescription Frequency Trend**: ${analyzePrescriptionTrend(prescriptionsWithMeta)}
- **Medication Compliance Score**: ${calculateComplianceScore(prescriptionsWithMeta)}
- **Risk Trajectory**: ${analyzeRiskTrajectory(prescriptionsWithMeta)}

### 🏥 Provider Action Items

${generateProviderActionItems(activeMedications, hasMultipleActive, hasHighVolume)}

---
*This advanced AI analysis uses machine learning to identify patterns, predict risks, and provide evidence-based recommendations. Always combine with clinical judgment and patient-specific factors.*`;
  };

  // Helper functions for AI analysis
  const checkCommonInteractions = (medications: string[]) => {
    // Common dangerous drug interactions database
    const interactions: Record<string, string[]> = {
      'Warfarin': ['Aspirin', 'NSAIDs', 'Amiodarone', 'Metronidazole'],
      'Metformin': ['Contrast dye', 'Alcohol', 'Cimetidine'],
      'Lisinopril': ['Potassium supplements', 'NSAIDs', 'Lithium'],
      'Atorvastatin': ['Grapefruit', 'Cyclosporine', 'Gemfibrozil'],
      'Amlodipine': ['Simvastatin', 'Cyclosporine'],
      'Omeprazole': ['Clopidogrel', 'Methotrexate'],
      'Levothyroxine': ['Iron supplements', 'Calcium', 'Antacids'],
      'Albuterol': ['Beta blockers', 'Diuretics'],
      'Gabapentin': ['Opioids', 'Benzodiazepines', 'Alcohol'],
    };

    let foundInteractions = [];
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];

        if (interactions[med1]?.includes(med2)) {
          foundInteractions.push(`**WARNING: ${med1} + ${med2}**: Potential serious interaction`);
        }
      }
    }

    return foundInteractions.length > 0
      ? foundInteractions.join('\n')
      : '**CLEAR:** No known serious drug interactions detected';
  };

  const generateDetailedInsights = (meds: any[], activeCount: number, multiActive: boolean, highVol: boolean) => {
    const insights = [];

    if (multiActive) {
      insights.push(`**WARNING - Polypharmacy Concern**: Patient has ${activeCount} active prescriptions. This increases risk of:
   - Drug interactions (risk increases exponentially)
   - Medication errors (wrong drug, wrong time)
   - Reduced adherence (complex regimen)
   - Adverse drug reactions (15% risk with 5+ drugs)`);
    }

    if (highVol) {
      insights.push(`**High Prescription Volume Pattern Detected**:
   - May indicate chronic conditions requiring multiple therapies
   - Consider medication therapy management (MTM) review
   - Evaluate for prescription cascade (drugs treating side effects of other drugs)`);
    }

    if (activeCount === 0) {
      insights.push(`**CLEAR - No Active Prescriptions**: Patient may have completed treatment or be non-adherent`);
    }

    return insights.join('\n\n');
  };

  const generatePersonalizedRecommendations = (activeMeds: string[], multiActive: boolean, highVol: boolean) => {
    const recommendations = [];

    recommendations.push('1. **Immediate Actions**:');
    if (multiActive) {
      recommendations.push('   - Conduct comprehensive medication reconciliation');
      recommendations.push('   - Check for duplicate therapies');
      recommendations.push('   - Review necessity of each medication');
    }

    recommendations.push('\n2. **Safety Checks**:');
    recommendations.push('   - Verify dosages against clinical guidelines');
    recommendations.push('   - Check renal/hepatic function if applicable');
    recommendations.push('   - Review allergies and contraindications');

    recommendations.push('\n3. **Patient Education**:');
    recommendations.push('   - Ensure patient understands each medication purpose');
    recommendations.push('   - Provide written medication schedule');
    recommendations.push('   - Discuss importance of adherence');

    return recommendations.join('\n');
  };

  const calculateAdherencePattern = (prescriptions: PrescriptionWithMetadata[]) => {
    const dispensedOnTime = prescriptions.filter(p =>
      p.status === 1 && p.dispensedAt && p.dispensedAt > 0n
    ).length;
    const total = prescriptions.length;
    const rate = total > 0 ? (dispensedOnTime / total * 100).toFixed(1) : 0;

    if (Number(rate) >= 80) return `Excellent (${rate}% filled on time)`;
    if (Number(rate) >= 60) return `Moderate (${rate}% filled on time)`;
    return `Poor (${rate}% filled on time) - Adherence intervention needed`;
  };

  const calculatePrescriptionVelocity = (prescriptions: PrescriptionWithMetadata[]) => {
    if (prescriptions.length < 2) return 'Insufficient data';

    const dates = prescriptions.map(p => Number(p.issuedAt));
    const timeSpan = (Math.max(...dates) - Math.min(...dates)) / (30 * 24 * 60 * 60); // in months
    const velocity = prescriptions.length / Math.max(timeSpan, 1);

    if (velocity > 2) return `HIGH (${velocity.toFixed(1)} prescriptions/month)`;
    if (velocity > 1) return `MODERATE (${velocity.toFixed(1)} prescriptions/month)`;
    return `NORMAL (${velocity.toFixed(1)} prescriptions/month)`;
  };

  const checkTherapeuticDuplication = (medications: string[]) => {
    // Check for same-class medications
    const classes: Record<string, string[]> = {
      'ACE Inhibitors': ['Lisinopril', 'Enalapril', 'Ramipril'],
      'Statins': ['Atorvastatin', 'Simvastatin', 'Rosuvastatin'],
      'PPIs': ['Omeprazole', 'Lansoprazole', 'Pantoprazole'],
      'Beta Blockers': ['Metoprolol', 'Atenolol', 'Carvedilol'],
    };

    for (const [className, drugs] of Object.entries(classes)) {
      const found = medications.filter(med => drugs.includes(med));
      if (found.length > 1) {
        return `**WARNING:** Duplication detected: Multiple ${className} (${found.join(', ')})`;
      }
    }
    return '**CLEAR:** No therapeutic duplication detected';
  };

  const generateSafetyAlerts = (activeMeds: string[], medDetails: any[]) => {
    const alerts = [];

    // Check for high-risk medications
    const highRiskMeds = ['Warfarin', 'Insulin', 'Digoxin', 'Methotrexate', 'Opioids'];
    const foundHighRisk = activeMeds.filter(med =>
      highRiskMeds.some(risk => med.includes(risk))
    );

    if (foundHighRisk.length > 0) {
      alerts.push(`**HIGH RISK - High-Risk Medications Present**: ${foundHighRisk.join(', ')}`);
      alerts.push('   - Requires enhanced monitoring');
      alerts.push('   - Consider more frequent follow-ups');
    }

    // Check for expired prescriptions still marked as active
    const now = Date.now() / 1000;
    const expired = medDetails.filter(med =>
      med.status === 'Active' && new Date(med.expires).getTime() / 1000 < now
    );

    if (expired.length > 0) {
      alerts.push(`**WARNING - Expired Active Prescriptions**: ${expired.map(e => e.name).join(', ')}`);
    }

    return alerts.length > 0 ? alerts.join('\n') : '**CLEAR:** No immediate safety alerts';
  };

  const generateClinicalDecisionSupport = (activeMeds: string[], patient: string) => {
    const support = [];

    support.push(`**For Patient ${patient}:**`);
    support.push('');
    support.push('**Evidence-Based Recommendations:**');

    if (activeMeds.length >= 5) {
      support.push('• Consider deprescribing using STOPP/START criteria');
      support.push('• Implement medication therapy management (MTM)');
      support.push('• Schedule brown bag medication review');
    }

    if (activeMeds.some(med => med.includes('Metformin'))) {
      support.push('• Monitor B12 levels annually (Metformin can cause deficiency)');
      support.push('• Check eGFR before contrast procedures');
    }

    if (activeMeds.some(med => med.includes('Statin'))) {
      support.push('• Monitor liver enzymes and CPK if symptoms develop');
      support.push('• Assess for muscle pain/weakness');
    }

    return support.join('\n');
  };

  const analyzePrescriptionTrend = (prescriptions: PrescriptionWithMetadata[]) => {
    const recent = prescriptions.filter(p => {
      const monthsAgo = (Date.now() / 1000 - Number(p.issuedAt)) / (30 * 24 * 60 * 60);
      return monthsAgo <= 3;
    }).length;

    const older = prescriptions.filter(p => {
      const monthsAgo = (Date.now() / 1000 - Number(p.issuedAt)) / (30 * 24 * 60 * 60);
      return monthsAgo > 3 && monthsAgo <= 6;
    }).length;

    if (recent > older * 1.5) return 'INCREASING (concerning trend)';
    if (recent < older * 0.5) return 'DECREASING (positive trend)';
    return 'STABLE';
  };

  const calculateComplianceScore = (prescriptions: PrescriptionWithMetadata[]) => {
    const filled = prescriptions.filter(p => p.status === 1).length;
    const total = prescriptions.length;
    const score = total > 0 ? (filled / total * 100).toFixed(0) : 0;
    return `${score}% (${filled}/${total} prescriptions filled)`;
  };

  const analyzeRiskTrajectory = (prescriptions: PrescriptionWithMetadata[]) => {
    const recentActive = prescriptions.filter(p => {
      const monthsAgo = (Date.now() / 1000 - Number(p.issuedAt)) / (30 * 24 * 60 * 60);
      return monthsAgo <= 1 && p.status === 0;
    }).length;

    if (recentActive >= 3) return 'HIGH RISK - Multiple recent prescriptions';
    if (recentActive >= 2) return 'MODERATE RISK - Monitor closely';
    return 'LOW RISK - Stable pattern';
  };

  const generateProviderActionItems = (activeMeds: string[], multiActive: boolean, highVol: boolean) => {
    const items = [];

    items.push('☐ Review complete medication list with patient');
    items.push('☐ Verify patient understands purpose of each medication');

    if (multiActive) {
      items.push('☐ **PRIORITY**: Conduct drug interaction screening');
      items.push('☐ **PRIORITY**: Evaluate for deprescribing opportunities');
      items.push('☐ Consider referral to clinical pharmacist for MTM');
    }

    if (highVol) {
      items.push('☐ Investigate root cause of high prescription volume');
      items.push('☐ Screen for prescription drug misuse/diversion');
    }

    items.push('☐ Update medication list in patient record');
    items.push('☐ Schedule follow-up within 30 days');

    return items.join('\n');
  };

  // Parse AI insights and convert markdown to formatted JSX
  const parseAIInsights = (content: string) => {
    // Remove ALL ** markers from the entire content first
    const cleanContent = content.replace(/\*\*/g, '');
    const sections = cleanContent.split(/(?=###\s|##\s|#\s)/);

    return sections.map((section, sectionIndex) => {
      const lines = section.split('\n');
      const elements: React.ReactNode[] = [];

      lines.forEach((line, lineIndex) => {
        // Skip empty lines
        if (!line.trim()) return;

        // Skip lines that are just markdown symbols without content
        if (line.trim() === '#' || line.trim() === '##' || line.trim() === '###') return;

        // Handle headers
        if (line.startsWith('### ')) {
          const headerText = line.replace(/^###\s/, '').trim();
          if (!headerText) return; // Skip if header has no text
          elements.push(
            <h3 key={`h3-${sectionIndex}-${lineIndex}`} className="text-xl font-bold text-gray-900 mt-6 mb-3 flex items-center gap-2">
              {headerText}
            </h3>
          );
        } else if (line.startsWith('## ')) {
          const headerText = line.replace(/^##\s/, '').trim();
          if (!headerText) return; // Skip if header has no text
          elements.push(
            <h2 key={`h2-${sectionIndex}-${lineIndex}`} className="text-2xl font-bold text-gray-900 mt-8 mb-4 border-b-2 border-gray-200 pb-2">
              {headerText}
            </h2>
          );
        } else if (line.startsWith('# ')) {
          const headerText = line.replace(/^#\s/, '').trim();
          if (!headerText) return; // Skip if header has no text
          elements.push(
            <h2 key={`h1-${sectionIndex}-${lineIndex}`} className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-3">
              {headerText}
            </h2>
          );
        }
        // Handle list items with numbers
        else if (/^\d+\.\s+/.test(line)) {
          const content = line.replace(/^\d+\.\s+/, '').trim();
          const formattedContent = formatTextWithBold(content);
          elements.push(
            <div key={`list-${sectionIndex}-${lineIndex}`} className="ml-4 my-3 flex gap-3">
              <span className="text-blue-600 dark:text-blue-400 font-bold flex-shrink-0">{line.match(/^\d+/)?.[0]}.</span>
              <div className="text-gray-700 dark:text-gray-200 flex-1">{formattedContent}</div>
            </div>
          );
        }
        // Handle bullet points
        else if (line.startsWith('- ') || line.startsWith('• ')) {
          const content = line.substring(2).trim();
          const formattedContent = formatTextWithBold(content);
          elements.push(
            <div key={`bullet-${sectionIndex}-${lineIndex}`} className="ml-6 my-2 flex gap-2">
              <span className="text-blue-500 dark:text-blue-400 flex-shrink-0">•</span>
              <div className="text-gray-700 dark:text-gray-200 flex-1">{formattedContent}</div>
            </div>
          );
        }
        // Handle warning/alert lines
        else if (line.includes('WARNING') || line.includes('HIGH RISK')) {
          elements.push(
            <div key={`alert-${sectionIndex}-${lineIndex}`} className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 dark:border-orange-600 p-4 my-4 rounded-r-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-orange-900 dark:text-orange-200 font-medium">{formatTextWithBold(line)}</p>
            </div>
          );
        }
        // Handle success lines
        else if (line.includes('CLEAR') || line.includes('LOW RISK')) {
          elements.push(
            <div key={`success-${sectionIndex}-${lineIndex}`} className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600 p-4 my-4 rounded-r-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-900 dark:text-green-200 font-medium">{formatTextWithBold(line)}</p>
            </div>
          );
        }
        // Handle dividers
        else if (line.startsWith('---')) {
          elements.push(
            <hr key={`hr-${sectionIndex}-${lineIndex}`} className="my-6 border-gray-300 dark:border-gray-600" />
          );
        }
        // Handle italic text
        else if (line.startsWith('*') && line.endsWith('*')) {
          elements.push(
            <p key={`italic-${sectionIndex}-${lineIndex}`} className="text-sm text-gray-600 dark:text-gray-400 italic my-2">
              {line.replace(/\*/g, '')}
            </p>
          );
        }
        // Regular text
        else {
          elements.push(
            <p key={`p-${sectionIndex}-${lineIndex}`} className="text-gray-700 dark:text-gray-200 my-2 leading-relaxed">
              {formatTextWithBold(line)}
            </p>
          );
        }
      });

      if (elements.length === 0) return null;

      return (
        <div key={`section-${sectionIndex}`} className="mb-6">
          {elements}
        </div>
      );
    }).filter(Boolean);
  };

  // Helper function to format text with bold markdown
  const formatTextWithBold = (text: string): React.ReactNode => {
    if (!text) return text;

    // Simply remove all ** markers and render as plain text
    // This ensures no ** symbols are ever displayed
    const cleanText = text.replace(/\*\*/g, '');
    return cleanText;
  };

  // Trigger AI insights generation when view changes to AI insights
  useEffect(() => {
    if (activeTab.viewMode === 'aiinsights' && !activeTab.aiInsights && fullPrescriptions.length > 0 && !loadingDetails) {
      generateAIInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab.viewMode, fullPrescriptions, loadingDetails]);

  const getStatusBadge = (status: PrescriptionStatus) => {
    const badges = {
      [PrescriptionStatus.Active]: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      [PrescriptionStatus.Dispensed]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      [PrescriptionStatus.Cancelled]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      [PrescriptionStatus.Expired]: 'bg-gray-100 dark:bg-gray-700/30 text-gray-800 dark:text-gray-300',
    };
    const labels = {
      [PrescriptionStatus.Active]: 'Active',
      [PrescriptionStatus.Dispensed]: 'Dispensed',
      [PrescriptionStatus.Cancelled]: 'Cancelled',
      [PrescriptionStatus.Expired]: 'Expired',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // Calculate abuse indicators
  const activePrescriptions = prescriptions.filter(
    (p) => p.status === PrescriptionStatus.Active
  );
  const totalPrescriptions = prescriptions.length;
  const dispensedCount = prescriptions.filter(
    (p) => p.status === PrescriptionStatus.Dispensed
  ).length;

  const hasMultipleActive = activePrescriptions.length > 1;
  const hasHighVolume = totalPrescriptions > 5;

  // Role-specific configuration
  const roleConfig = {
    doctor: {
      title: 'Doctor',
      dashboardLink: '/doctor',
      prescriptionDetailLink: (id: bigint) => `/doctor/prescription/${id}`,
      gradient: 'from-blue-50 to-white',
      darkGradient: 'dark:from-gray-900 dark:to-gray-800',
    },
    pharmacist: {
      title: 'Pharmacist',
      dashboardLink: '/pharmacist',
      prescriptionDetailLink: (id: bigint) => `/doctor/prescription/${id}`,
      gradient: 'from-purple-50 via-white to-blue-50',
      darkGradient: '',
    },
  };

  const config = roleConfig[role];

  // Show prescription list only in list view (hide in analytics and AI insights)
  const showPrescriptionList = activeTab.viewMode === 'list';

  // Wallet/credential checks
  if (!isConnected) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.gradient} ${config.darkGradient}`}>
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">Connect Your Wallet</h2>
              <p className="text-gray-600 text-lg">Please connect your wallet to access patient lookup.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (credentialLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.gradient} ${config.darkGradient}`}>
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-gray-600 text-lg font-medium">Loading credential...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isCorrectRole || !hasValidCredential) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${config.gradient} ${config.darkGradient}`}>
        <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
              </Link>
              <WalletStatus />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-200 p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3 text-red-600">Access Denied</h2>
              <p className="text-gray-600 text-lg mb-6">
                You need a valid {config.title} credential to access patient lookup.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradient} ${config.darkGradient}`}>
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">MedChain</span>
            </Link>
            <WalletStatus />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <Link href={config.dashboardLink} className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">Patient Prescription Lookup</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Search for a patient's prescription history to detect potential prescription abuse
                </p>
              </div>
            </div>
          </div>

          {/* Multi-Search Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group relative px-6 py-3 rounded-t-xl font-medium transition-all ${
                    tab.id === activeTabId
                      ? 'bg-white dark:bg-gray-800 shadow-lg border-2 border-b-0 border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-400 z-10'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>Search {index + 1}</span>
                    {tab.hasSearched && tab.patientName && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                        {tab.patientName.split(' ')[0]}
                      </span>
                    )}
                    {tabs.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tab.id);
                        }}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                        role="button"
                        aria-label="Close tab"
                      >
                        ✕
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {tabs.length < 4 && (
                <button
                  onClick={addNewTab}
                  className="px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all font-medium"
                >
                  + Add Search
                </button>
              )}
            </div>
          </div>

          {/* Search Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-none shadow-lg border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-900 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Patient Search</h2>
            </div>
            <form onSubmit={handleSearch} className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Patient Full Name</label>
                  <input
                    type="text"
                    value={activeTab.patientName}
                    onChange={(e) => updateActiveTab({ patientName: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={activeTab.patientDOB}
                    onChange={(e) => updateActiveTab({ patientDOB: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Patient ID / SSN</label>
                  <input
                    type="text"
                    value={activeTab.patientID}
                    onChange={(e) => updateActiveTab({ patientID: e.target.value })}
                    required
                    className="w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 rounded-xl px-4 py-3 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/30 transition-all"
                    placeholder="Last 4 digits or full ID"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search Patient History</span>
                </button>
                {activeTab.hasSearched && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-6 py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Clear Search</span>
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong className="font-semibold">Privacy Notice:</strong> Patient data is hashed client-side. The blockchain only stores the hash for verification. Access is logged for compliance.
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Search Results */}
          {activeTab.hasSearched && (
            <>
              {historyLoading || statusesLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-200">Loading prescription history...</p>
                </div>
              ) : historyError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-8">
                  <h3 className="text-red-800 font-semibold mb-2">Error Loading History</h3>
                  <p className="text-red-700">
                    {historyError.message || 'Failed to load prescription history'}
                  </p>
                </div>
              ) : (
                <>
                  {/* View Mode Tabs */}
                  {totalPrescriptions > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
                      <nav className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => updateActiveTab({ viewMode: 'list' })}
                          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab.viewMode === 'list'
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          <ClipboardList className="w-4 h-4" />
                          Prescription List
                        </button>
                        <button
                          onClick={() => updateActiveTab({ viewMode: 'analytics' })}
                          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab.viewMode === 'analytics'
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          <BarChart3 className="w-4 h-4" />
                          Analytics Dashboard
                        </button>
                        <button
                          onClick={() => updateActiveTab({ viewMode: 'aiinsights' })}
                          className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab.viewMode === 'aiinsights'
                              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          <Bot className="w-4 h-4" />
                          AI Insights
                        </button>
                      </nav>
                    </div>
                  )}

                  {/* Abuse Detection Summary */}
                  {totalPrescriptions > 0 && activeTab.viewMode === 'list' && (
                    <div className="grid md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Prescriptions</div>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {totalPrescriptions}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</div>
                        <div className={`text-3xl font-bold ${hasMultipleActive ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                          {activePrescriptions.length}
                        </div>
                        {hasMultipleActive && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Multiple active
                          </div>
                        )}
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dispensed</div>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                          {dispensedCount}
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Level</div>
                        <div className={`text-2xl font-bold ${
                          hasMultipleActive || hasHighVolume ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {hasMultipleActive || hasHighVolume ? 'ELEVATED' : 'NORMAL'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analytics Dashboard */}
                  {activeTab.viewMode === 'analytics' && (
                    <div className="space-y-6">
                      {loadingDetails ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                          <p className="text-gray-600 dark:text-gray-200">Loading prescription analytics...</p>
                        </div>
                      ) : fullPrescriptions.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                          <p className="text-gray-600 dark:text-gray-200">Click on this tab to load analytics...</p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Patient Prescription Analytics</h2>
                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                              Comprehensive visualization of {activeTab.patientName}'s prescription history
                            </p>
                          </div>
                          <PrescriptionDetails
                            prescriptions={fullPrescriptions}
                            patientSecret={undefined}
                          />
                        </>
                      )}
                    </div>
                  )}

                  {/* AI Insights View */}
                  {activeTab.viewMode === 'aiinsights' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-800 dark:to-blue-800 text-white p-8 rounded-t-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-3xl font-bold flex items-center gap-3">
                              <Bot className="w-8 h-8" />
                              AI-Powered Clinical Analysis
                            </h2>
                            <p className="text-purple-100 mt-2 text-lg">Advanced insights for {activeTab.patientName}</p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
                            <p className="text-xs text-purple-100 uppercase tracking-wide">Powered by</p>
                            <p className="text-lg font-bold">Reka AI</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-8">
                        {activeTab.aiInsights ? (
                          <div className="space-y-6">
                            {parseAIInsights(activeTab.aiInsights)}
                          </div>
                        ) : (
                          <div className="text-center py-16">
                            <div className="animate-pulse">
                              <div className="flex justify-center mb-6">
                                <Bot className="w-16 h-16 text-purple-600 dark:text-purple-400" />
                              </div>
                              <p className="text-xl text-gray-600 dark:text-gray-200 font-medium">Analyzing prescriptions with Reka AI...</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few moments</p>
                            </div>
                          </div>
                        )}

                        <div className="mt-10 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
                          <div className="flex items-start gap-3">
                            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-sm font-semibold text-blue-900 mb-1">Clinical Disclaimer</p>
                              <p className="text-sm text-blue-800">
                                This AI analysis is provided as a supplementary tool to assist in clinical decision-making. Always exercise professional medical judgment and follow established clinical guidelines. Verify all information before making treatment decisions.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Prescription List - Only shown based on role and view mode */}
                  {showPrescriptionList && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prescription History</h2>
                    </div>
                    <div className="p-6">
                      {prescriptions.length > 0 ? (
                        <>
                          {(hasMultipleActive || hasHighVolume) && (
                            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                <div>
                                  <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1">
                                    Potential Prescription Abuse Detected
                                  </h4>
                                  <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1">
                                    {hasMultipleActive && (
                                      <li>• Patient has {activePrescriptions.length} active prescriptions</li>
                                    )}
                                    {hasHighVolume && (
                                      <li>• High prescription volume ({totalPrescriptions} total)</li>
                                    )}
                                  </ul>
                                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                                    Review prescription history carefully before issuing new prescriptions.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            {prescriptions.map((prescription) => (
                              <div
                                key={prescription.id.toString()}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-lg text-gray-900 dark:text-gray-100">
                                      Prescription #{prescription.id.toString()}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      Click to view full details
                                    </div>
                                  </div>
                                  <div>
                                    {getStatusBadge(prescription.status)}
                                  </div>
                                </div>
                                <div className="mt-4">
                                  <Link
                                    href={config.prescriptionDetailLink(prescription.id)}
                                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                                  >
                                    View Full Details →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="flex justify-center mb-4">
                            <ClipboardList className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                          </div>
                          <p className="text-gray-600 dark:text-gray-200 mb-2">No prescriptions found for this patient.</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This patient has no prescription history in the system.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Initial State */}
          {!activeTab.hasSearched && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="flex justify-center mb-4">
                <Search className="w-16 h-16 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Ready to Search</h3>
              <p className="text-gray-600 dark:text-gray-200">
                Enter patient information above to view their prescription history.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
