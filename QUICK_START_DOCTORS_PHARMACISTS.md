# Quick Start Guide - Doctor & Pharmacist AI Features

## 🚀 What's New

We've added powerful AI and analytics features to help doctors and pharmacists make better decisions:

### For Doctors:
- 📊 **Analytics Dashboard** - Visual charts of patient prescription history
- 🤖 **AI Insights** - Automated abuse detection and clinical recommendations
- ⚠️ **Risk Warnings** - Real-time alerts for suspicious patterns

### For Pharmacists:
- 💊 **Drug Information** - Comprehensive AI-powered drug details
- ✅ **Safety Checklist** - Verification workflow for dispensing
- 🤖 **Clinical Support** - Side effects, interactions, and warnings

---

## 👨‍⚕️ For Doctors

### Testing the New Features:

```bash
# 1. Start the dev server (if not already running)
npm run dev

# 2. Navigate to doctor lookup
# Open: http://localhost:3000/doctor/lookup

# 3. Connect your wallet (must have Doctor SBT credential)

# 4. Search for a patient:
#    - Name: aaa (or any existing patient)
#    - DOB: Any date
#    - Patient ID: Any ID

# 5. Explore the three tabs!
```

### Tab 1: 📋 Prescription List

**What you'll see:**
- Summary cards (Total, Active, Dispensed, Risk Level)
- List of all prescriptions with status badges
- Warnings if multiple active prescriptions detected
- Links to individual prescription details

**When to use:**
- Quick overview of patient history
- Checking for red flags before prescribing
- Reviewing patient's active medications

### Tab 2: 📊 Analytics Dashboard

**What you'll see:**
- Timeline chart (prescriptions over time)
- Medication frequency bar chart
- Status distribution pie chart
- Detailed prescription list sorted by date

**When to use:**
- Understanding prescription patterns
- Identifying chronic conditions
- Analyzing adherence trends
- Visual presentation for case discussions

### Tab 3: 🤖 AI Insights

**What you'll see:**
- Automated patient analysis report
- Risk level assessment (NORMAL / ELEVATED)
- Abuse detection warnings
- Clinical recommendations
- Follow-up suggestions

**When to use:**
- Before prescribing controlled substances
- Evaluating high-risk patients
- Clinical decision support
- Documentation for medical records

---

## 💊 For Pharmacists

### Testing the New Features:

```bash
# 1. Start the dev server (if not already running)
npm run dev

# 2. Navigate to pharmacist dispense
# Open: http://localhost:3000/pharmacist/dispense

# 3. Connect your wallet (must have Pharmacist SBT credential)

# 4. Scan a prescription QR code (or paste JSON)

# 5. Two tabs will appear!
```

### Tab 1: 📋 Prescription Details

**What you'll see:**
- Patient information (name, DOB, ID)
- Medication details (drug, dosage, quantity, refills)
- Instructions
- Prescription status and expiration
- Dispense button

**When to use:**
- Standard dispensing workflow
- Verifying prescription authenticity
- Confirming patient identity
- Completing the dispensing process

### Tab 2: 💊 Drug Information & Safety

**What you'll see:**
- **Overview Tab:**
  - What the medication is
  - Primary uses
  - Dosage information
  - Statistics (prescription volume, demographics)

- **Details Tab:**
  - Common side effects
  - Warnings and precautions
  - Drug interactions

- **AI Guidance Tab:**
  - AI-generated summary
  - Key points to remember
  - Safety assessment
  - Patient guidance

- **Safety Checklist:**
  - 5-point verification checklist
  - Return to prescription button

**When to use:**
- Before dispensing unfamiliar medications
- Patient counseling
- Verifying no contraindications
- Safety verification
- Documentation purposes

---

## 🎯 Quick Workflows

### Doctor: Evaluating New Patient

```
1. Search patient in lookup portal
2. Click "AI Insights" tab
3. Review risk level and warnings
4. Check "Analytics" for patterns
5. Make informed prescribing decision
6. Document findings
```

### Doctor: Suspicious Pattern Detection

```
1. Search patient
2. Notice "ELEVATED" risk level in summary
3. Read warning: "⚠️ Multiple active prescriptions"
4. Review AI Insights for details
5. Check Analytics for timeline
6. Decide if further investigation needed
```

### Pharmacist: Dispensing Controlled Substance

```
1. Scan prescription QR code
2. Verify prescription details
3. Click "Drug Information & Safety" tab
4. Review all three info tabs
5. Check for warnings/interactions
6. Complete safety checklist
7. Return to prescription tab
8. Dispense medication
9. Counsel patient using AI info
```

### Pharmacist: Patient Counseling

```
1. Dispense prescription (Tab 1)
2. Switch to "Drug Information" (Tab 2)
3. Review "AI Guidance" tab
4. Share key points with patient
5. Explain side effects to watch for
6. Answer patient questions using details
```

---

## ⚡ Keyboard Shortcuts & Tips

### Doctor Portal:
- Search multiple patients to compare patterns
- Use AI Insights as supplementary documentation
- Export/screenshot analytics for case files
- Review warnings before every controlled substance prescription

### Pharmacist Portal:
- Switch tabs freely without losing prescription data
- Use drug info for patient education
- Complete checklist for compliance
- Reference Overview tab for quick facts
- Use Details tab for specific warnings

---

## 🎨 Visual Guide

### Risk Level Indicators:

```
✓ NORMAL (Green)
  - Normal prescription pattern
  - 0-1 active prescriptions
  - Standard workflow

⚠️ ELEVATED (Orange/Red)
  - Multiple active prescriptions
  - High prescription volume
  - Extra scrutiny required
```

### Status Badges:

```
🟢 Active - Ready to dispense
🔵 Dispensed - Already filled
🔴 Cancelled - Voided by doctor
⚪ Expired - Past expiration date
```

---

## 📊 Understanding Analytics

### Timeline Chart:
- **X-axis**: Months
- **Y-axis**: Number of prescriptions
- **Use**: Identify trends (increasing, stable, decreasing)

### Frequency Chart:
- **X-axis**: Medication names
- **Y-axis**: Prescription count
- **Use**: See most prescribed medications

### Status Pie Chart:
- Shows distribution of prescription statuses
- Helps understand patient compliance
- Visual summary of prescription lifecycle

---

## 🚨 Common Warning Scenarios

### "Multiple Active Prescriptions"

**What it means:**
Patient has more than one active prescription simultaneously.

**What to do:**
1. Review all active prescriptions
2. Check for potential doctor shopping
3. Verify legitimate medical need
4. Consider drug interactions
5. Document reasoning

### "High Prescription Volume"

**What it means:**
Patient has >5 total prescriptions in system.

**What to do:**
1. Review prescription timeline
2. Check for chronic conditions
3. Evaluate adherence patterns
4. Consider if volume is justified
5. Monitor closely

---

## 🔧 Troubleshooting

### Doctor Analytics Not Loading:
- Verify patient has prescriptions in system
- Check wallet connection
- Try refreshing the page
- Test with patient "aaa" first

### AI Insights Not Generating:
- Wait a few seconds (auto-generates)
- Click on AI Insights tab again
- Check console for errors
- Verify prescription data loaded

### Pharmacist Drug Info Showing Template:
- Expected until Reka AI API integrated
- Shows structure and layout
- See REKA_AI_SETUP.md to complete integration

### Charts Not Rendering:
- Verify recharts is installed: `npm list recharts`
- Clear browser cache
- Check browser console for errors

---

## 💡 Pro Tips

### For Doctors:

1. **Start with AI Insights** - Quick overview before diving into details
2. **Compare Patterns** - Look at analytics across multiple visits
3. **Document Warnings** - Screenshot risk warnings for records
4. **Use for Education** - Show patients their prescription timeline
5. **Regular Reviews** - Check high-risk patients periodically

### For Pharmacists:

1. **Review Before Dispensing** - Always check drug info tab
2. **Use for Counseling** - Share AI guidance with patients
3. **Complete Checklist** - For compliance and documentation
4. **Reference Interactions** - Check before dispensing multiple meds
5. **Print if Needed** - Drug info can be printed for patients

---

## 📚 Additional Resources

- **Full Documentation**: `DOCTOR_PHARMACIST_FEATURES.md`
- **Reka AI Setup**: `REKA_AI_SETUP.md`
- **General Features**: `REKA_AI_FEATURES.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`

---

## ✅ Pre-Flight Checklist

Before using in production:

**For Doctors:**
- [ ] Wallet connected with valid Doctor SBT
- [ ] Tested search with known patient
- [ ] Reviewed all three tabs
- [ ] Understand risk level indicators
- [ ] Know when to flag suspicious patterns

**For Pharmacists:**
- [ ] Wallet connected with valid Pharmacist SBT
- [ ] Tested prescription scanning
- [ ] Reviewed drug information tabs
- [ ] Familiar with safety checklist
- [ ] Know how to counsel patients

---

## 🎉 You're Ready!

### Next Steps:

1. **Test Features**: Use the workflows above
2. **Explore UI**: Click around and get familiar
3. **Read Documentation**: Check detailed guides
4. **Provide Feedback**: Report any issues
5. **Train Team**: Share this guide with colleagues

### Quick Test:

```bash
# Doctor Test
1. Go to /doctor/lookup
2. Search for patient "aaa"
3. Click through all 3 tabs
4. Review AI insights

# Pharmacist Test
1. Go to /pharmacist/dispense
2. Scan a prescription QR
3. Toggle between tabs
4. Review drug information
```

---

**Need Help?**
- Check `DOCTOR_PHARMACIST_FEATURES.md` for detailed info
- Review code comments in the implementation files
- Test with sample data first

**Have an issue?**
- Check console for errors
- Verify wallet connection
- Ensure credentials are valid
- Try refreshing the page

Happy prescribing! 🩺💊
