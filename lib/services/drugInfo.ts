/**
 * Drug Information Service using Reka AI
 * Fetches detailed drug information, side effects, statistics, and safety data
 */

export interface DrugInformation {
  drugName: string;
  description: string;
  uses: string[];
  sideEffects: string[];
  warnings: string[];
  interactions: string[];
  dosageInfo: string;
  statistics?: {
    prescriptionVolume: string;
    commonDemographics: string;
    effectivenessRate: string;
  };
}

export interface DrugAnalysis {
  summary: string;
  keyPoints: string[];
  safetyScore?: string;
  patientGuidance: string;
}

/**
 * Generate a comprehensive prompt for Reka AI to analyze drug information
 */
function generateDrugInfoPrompt(medication: string, dosage: string): string {
  return `Provide comprehensive medical information about the medication "${medication}" at dosage "${dosage}".

Please structure your response with the following sections:

1. DESCRIPTION: A clear, patient-friendly explanation of what this medication is and how it works

2. PRIMARY USES: List 3-5 main conditions or symptoms this medication treats

3. COMMON SIDE EFFECTS: List 5-7 most common side effects patients should be aware of

4. WARNINGS & PRECAUTIONS: Important safety warnings, contraindications, and who should avoid this medication

5. DRUG INTERACTIONS: Common medications or substances that interact with this drug

6. DOSAGE GUIDANCE: General information about how this medication should be taken (with food, timing, etc.)

7. STATISTICS (if available):
   - Approximate number of prescriptions annually in the US
   - Common patient demographics
   - General effectiveness rates or success metrics

8. PATIENT GUIDANCE: Key advice for patients taking this medication

Please provide accurate, evidence-based medical information suitable for patient education. Focus on practical information that helps patients understand their treatment.`;
}

/**
 * Parse Reka AI response into structured drug information
 * This is a basic parser - you may need to adjust based on actual Reka response format
 */
function parseDrugInfoResponse(response: string, drugName: string): DrugInformation {
  const sections = {
    description: '',
    uses: [] as string[],
    sideEffects: [] as string[],
    warnings: [] as string[],
    interactions: [] as string[],
    dosageInfo: '',
    statistics: {
      prescriptionVolume: '',
      commonDemographics: '',
      effectivenessRate: '',
    },
  };

  // Split response into sections
  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.match(/^(1\.|DESCRIPTION:)/i)) {
      currentSection = 'description';
      continue;
    } else if (trimmedLine.match(/^(2\.|PRIMARY USES:)/i)) {
      currentSection = 'uses';
      continue;
    } else if (trimmedLine.match(/^(3\.|COMMON SIDE EFFECTS:)/i)) {
      currentSection = 'sideEffects';
      continue;
    } else if (trimmedLine.match(/^(4\.|WARNINGS|PRECAUTIONS:)/i)) {
      currentSection = 'warnings';
      continue;
    } else if (trimmedLine.match(/^(5\.|DRUG INTERACTIONS:)/i)) {
      currentSection = 'interactions';
      continue;
    } else if (trimmedLine.match(/^(6\.|DOSAGE GUIDANCE:)/i)) {
      currentSection = 'dosageInfo';
      continue;
    } else if (trimmedLine.match(/^(7\.|STATISTICS:)/i)) {
      currentSection = 'statistics';
      continue;
    } else if (trimmedLine.match(/^(8\.|PATIENT GUIDANCE:)/i)) {
      currentSection = 'patientGuidance';
      continue;
    }

    // Parse content based on current section
    if (!trimmedLine || trimmedLine.length < 2) continue;

    switch (currentSection) {
      case 'description':
        sections.description += (sections.description ? ' ' : '') + trimmedLine;
        break;
      case 'uses':
        if (trimmedLine.match(/^[-•*]/)) {
          sections.uses.push(trimmedLine.replace(/^[-•*]\s*/, ''));
        }
        break;
      case 'sideEffects':
        if (trimmedLine.match(/^[-•*]/)) {
          sections.sideEffects.push(trimmedLine.replace(/^[-•*]\s*/, ''));
        }
        break;
      case 'warnings':
        if (trimmedLine.match(/^[-•*]/)) {
          sections.warnings.push(trimmedLine.replace(/^[-•*]\s*/, ''));
        }
        break;
      case 'interactions':
        if (trimmedLine.match(/^[-•*]/)) {
          sections.interactions.push(trimmedLine.replace(/^[-•*]\s*/, ''));
        }
        break;
      case 'dosageInfo':
        sections.dosageInfo += (sections.dosageInfo ? ' ' : '') + trimmedLine;
        break;
      case 'statistics':
        if (trimmedLine.toLowerCase().includes('prescription')) {
          sections.statistics.prescriptionVolume = trimmedLine;
        } else if (trimmedLine.toLowerCase().includes('demographic')) {
          sections.statistics.commonDemographics = trimmedLine;
        } else if (trimmedLine.toLowerCase().includes('effectiveness') || trimmedLine.toLowerCase().includes('success')) {
          sections.statistics.effectivenessRate = trimmedLine;
        }
        break;
    }
  }

  return {
    drugName,
    description: sections.description || 'Information not available',
    uses: sections.uses.length > 0 ? sections.uses : ['Uses information not available'],
    sideEffects: sections.sideEffects.length > 0 ? sections.sideEffects : ['Side effects information not available'],
    warnings: sections.warnings.length > 0 ? sections.warnings : ['Warnings information not available'],
    interactions: sections.interactions.length > 0 ? sections.interactions : ['Interactions information not available'],
    dosageInfo: sections.dosageInfo || 'Dosage information not available',
    statistics: sections.statistics.prescriptionVolume || sections.statistics.commonDemographics || sections.statistics.effectivenessRate
      ? sections.statistics
      : undefined,
  };
}

/**
 * Fetch drug information using web search and AI analysis
 * Note: In production, you would call the Reka AI API directly
 * For now, this provides the structure for integration
 */
export async function fetchDrugInformation(
  medication: string,
  dosage: string
): Promise<DrugInformation> {
  try {
    // In a real implementation, you would call your backend API
    // which would use the Reka AI MCP tools
    // For now, we'll structure it to work with a backend endpoint

    const response = await fetch('/api/drug-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        medication,
        dosage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch drug information: ${response.statusText}`);
    }

    const data = await response.json();
    return data.drugInfo;
  } catch (error) {
    console.error('Error fetching drug information:', error);

    // Return fallback structure
    return {
      drugName: medication,
      description: 'Unable to fetch drug information at this time. Please consult with your doctor or pharmacist.',
      uses: ['Information temporarily unavailable'],
      sideEffects: ['Information temporarily unavailable'],
      warnings: ['Please consult your healthcare provider for complete information'],
      interactions: ['Information temporarily unavailable'],
      dosageInfo: dosage,
    };
  }
}

/**
 * Generate AI-powered analysis and guidance for a specific prescription
 */
export async function generateDrugAnalysis(
  medication: string,
  dosage: string,
  patientContext?: string
): Promise<DrugAnalysis> {
  try {
    const response = await fetch('/api/drug-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        medication,
        dosage,
        patientContext,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate drug analysis: ${response.statusText}`);
    }

    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error generating drug analysis:', error);

    return {
      summary: 'Analysis temporarily unavailable',
      keyPoints: ['Please consult your healthcare provider for personalized guidance'],
      patientGuidance: 'Always follow your doctor\'s instructions and consult with them if you have any questions.',
    };
  }
}

export { generateDrugInfoPrompt, parseDrugInfoResponse };
