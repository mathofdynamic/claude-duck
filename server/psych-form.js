/**
 * Creates a beautifully formatted Psychological Wellness Evaluation in Google Docs.
 * Uses the Docs batchUpdate API to apply rich text and paragraph styles.
 */

import { google } from 'googleapis'
import { getAuthenticatedClient } from './google-auth.js'

// ── Colour helpers ────────────────────────────────────────────────────────────

const rgb = (r, g, b) => ({ red: r / 255, green: g / 255, blue: b / 255 })

const C = {
  navy:   rgb(26,  35, 126),   // deep blue   — titles / section headers
  purple: rgb(74,  20, 140),   // deep purple — instructions / scoring
  teal:   rgb(0,   96, 100),   // teal        — rating circles
  gray:   rgb(97,  97,  97),   // mid-gray    — body / subtitles
  lgray:  rgb(189, 189, 189),  // light gray  — dividers
}

const fg = c => ({ foregroundColor: { color: { rgbColor: c } } })

// ── Document builder ──────────────────────────────────────────────────────────
// Tracks the running character index so formatting ranges are calculated
// automatically as content is added.

class Builder {
  constructor() {
    this.chunks   = []
    this.idx      = 1   // Google Docs body starts at index 1
    this.textFmt  = []
    this.paraFmt  = []
  }

  add(text, textStyle = null, paraStyle = null) {
    const start = this.idx
    this.chunks.push(text)
    this.idx += text.length
    const end = this.idx

    if (textStyle)
      this.textFmt.push({ start, end, style: textStyle })
    if (paraStyle)
      this.paraFmt.push({ start, end, style: paraStyle })

    return this
  }

  /** Returns the full text and the batchUpdate formatting requests. */
  build() {
    const text = this.chunks.join('')

    const toTextReq = f => ({
      updateTextStyle: {
        range: { startIndex: f.start, endIndex: f.end },
        textStyle: f.style,
        fields: Object.keys(f.style).join(',')
      }
    })

    const toParaReq = f => ({
      updateParagraphStyle: {
        range: { startIndex: f.start, endIndex: f.end },
        paragraphStyle: f.style,
        fields: Object.keys(f.style).join(',')
      }
    })

    return {
      text,
      requests: [
        ...this.textFmt.map(toTextReq),
        ...this.paraFmt.map(toParaReq)
      ]
    }
  }
}

// ── Form layout ───────────────────────────────────────────────────────────────

function buildForm() {
  const b   = new Builder()
  const DIV = '─'.repeat(68) + '\n'

  // ── Cover ─────────────────────────────────────────────────────────────────

  b.add('Psychological Wellness Evaluation\n',
    { bold: true, fontSize: { magnitude: 28, unit: 'PT' }, ...fg(C.navy) },
    { alignment: 'CENTER', spaceBelow: { magnitude: 4, unit: 'PT' } })

  b.add('Comprehensive Self-Assessment Tool\n',
    { italic: true, fontSize: { magnitude: 13, unit: 'PT' }, ...fg(C.gray) },
    { alignment: 'CENTER', spaceBelow: { magnitude: 14, unit: 'PT' } })

  b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })

  // ── Instructions ──────────────────────────────────────────────────────────

  b.add('\nINSTRUCTIONS\n',
    { bold: true, fontSize: { magnitude: 11, unit: 'PT' }, ...fg(C.purple) })

  b.add(
    'Please answer each question honestly and thoughtfully. ' +
    'There are no right or wrong answers. This form is designed to help understand ' +
    'your current psychological well-being. All responses are strictly confidential.\n\n',
    { italic: true, fontSize: { magnitude: 11, unit: 'PT' }, ...fg(C.gray) })

  b.add('Date: ________________________________     Evaluator: ________________________________\n\n',
    { fontSize: { magnitude: 11, unit: 'PT' } })

  b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })

  // ── Helpers ───────────────────────────────────────────────────────────────

  function sectionHeader(num, title) {
    b.add(`\nSECTION ${num}  —  ${title}\n`,
      { bold: true, fontSize: { magnitude: 14, unit: 'PT' }, ...fg(C.navy) },
      { spaceAbove: { magnitude: 8, unit: 'PT' }, spaceBelow: { magnitude: 6, unit: 'PT' } })
  }

  function scaleNote(note) {
    b.add(note + '\n',
      { italic: true, fontSize: { magnitude: 10, unit: 'PT' }, ...fg(C.gray) })
    b.add('\n')
  }

  function question(text) {
    b.add(text + '\n',
      { fontSize: { magnitude: 11, unit: 'PT' } })
    b.add('     ○ 1         ○ 2         ○ 3         ○ 4         ○ 5\n\n',
      { bold: true, fontSize: { magnitude: 12, unit: 'PT' }, ...fg(C.teal) })
  }

  function field(label) {
    b.add(label + '\n', { fontSize: { magnitude: 11, unit: 'PT' } })
  }

  function sectionScore(outOf) {
    b.add(`\n                                        Section Score: _______ / ${outOf}\n`,
      { bold: true, fontSize: { magnitude: 11, unit: 'PT' }, ...fg(C.navy) })
    b.add('\n')
    b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })
  }

  function openQuestion(q) {
    b.add(q + '\n',
      { bold: true, fontSize: { magnitude: 11, unit: 'PT' } })
    b.add('_________________________________________________________________________\n')
    b.add('_________________________________________________________________________\n')
    b.add('_________________________________________________________________________\n\n')
  }

  // ── Section 1: Personal Information ──────────────────────────────────────

  sectionHeader(1, 'PERSONAL INFORMATION')
  b.add('\n')
  field('Full Name:            _______________________________________________')
  field('Date of Birth:        _____________________     Age: _______________')
  field('Gender Identity:      _______________________________________________')
  field('Occupation / Role:    _______________________________________________')
  field('Referred by:          _______________________________________________')
  b.add('\n')
  b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })

  // ── Section 2: Emotional Well-Being ──────────────────────────────────────

  sectionHeader(2, 'EMOTIONAL WELL-BEING')
  scaleNote('Rate each statement from 1 to 5:   1 = Never    2 = Rarely    3 = Sometimes    4 = Often    5 = Always')
  question('1.   I feel a sense of purpose and direction in my daily life.')
  question('2.   I can recognize and name my emotions as they arise.')
  question('3.   I feel emotionally balanced and stable throughout the day.')
  question('4.   I manage difficult emotions without feeling overwhelmed.')
  question('5.   I experience positive emotions on a regular basis.')
  sectionScore(25)

  // ── Section 3: Stress & Anxiety ──────────────────────────────────────────

  sectionHeader(3, 'STRESS & ANXIETY')
  scaleNote('Rate each statement from 1 to 5:   1 = Never    2 = Rarely    3 = Sometimes    4 = Often    5 = Always')
  question('6.   I feel tense or on edge without a clear reason.')
  question('7.   I find it difficult to stop worrying.')
  question('8.   I experience physical symptoms of stress (headaches, tension, stomach issues).')
  question('9.   I feel overwhelmed by my daily responsibilities.')
  question('10.  I have difficulty relaxing even when I have free time.')
  sectionScore(25)

  // ── Section 4: Social Functioning ────────────────────────────────────────

  sectionHeader(4, 'SOCIAL FUNCTIONING & RELATIONSHIPS')
  scaleNote('Rate each statement from 1 to 5:   1 = Never    2 = Rarely    3 = Sometimes    4 = Often    5 = Always')
  question('11.  I feel comfortable in social situations.')
  question('12.  I maintain meaningful and supportive connections with others.')
  question('13.  I feel understood and supported by the people closest to me.')
  question('14.  I am able to set healthy boundaries in my relationships.')
  question('15.  I feel a sense of belonging in my community or social circle.')
  sectionScore(25)

  // ── Section 5: Self-Perception ────────────────────────────────────────────

  sectionHeader(5, 'SELF-PERCEPTION & IDENTITY')
  scaleNote('Rate each statement:   1 = Strongly Disagree    2 = Disagree    3 = Neutral    4 = Agree    5 = Strongly Agree')
  question('16.  I accept myself, including my flaws and limitations.')
  question('17.  I believe I am capable of achieving my goals.')
  question('18.  I treat myself with the same kindness I would show a good friend.')
  question('19.  I have a clear sense of who I am and what I value.')
  question('20.  I do not rely on external validation to feel worthy.')
  sectionScore(25)

  // ── Section 6: Life Satisfaction ─────────────────────────────────────────

  sectionHeader(6, 'LIFE SATISFACTION INDEX')
  scaleNote('Rate your current satisfaction in each life area from 1 (Very Dissatisfied) to 10 (Completely Satisfied):')

  const lifeAreas = [
    'Career & Sense of Purpose',
    'Romantic Relationship',
    'Family Relationships',
    'Health & Physical Well-being',
    'Financial Stability',
    'Personal Growth & Learning',
  ]
  for (const area of lifeAreas) {
    b.add(`  ${area.padEnd(34)}  _______ / 10\n`,
      { fontSize: { magnitude: 11, unit: 'PT' } })
  }

  b.add('\n')
  b.add('                                      Total Life Satisfaction: _______ / 60\n',
    { bold: true, fontSize: { magnitude: 11, unit: 'PT' }, ...fg(C.navy) })
  b.add('\n')
  b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })

  // ── Section 7: Open Reflection ────────────────────────────────────────────

  sectionHeader(7, 'OPEN REFLECTION')
  b.add('Please answer the following in your own words:\n\n',
    { italic: true, fontSize: { magnitude: 11, unit: 'PT' }, ...fg(C.gray) })
  openQuestion('What brings you the most joy and meaning in your life right now?')
  openQuestion('What is your greatest source of stress or concern at this time?')
  openQuestion('What personal strength do you rely on most in difficult situations?')
  openQuestion('What is one area of your life you most want to improve or change?')
  b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })

  // ── Scoring Guide ──────────────────────────────────────────────────────────

  b.add('\nSCORING GUIDE\n',
    { bold: true, fontSize: { magnitude: 14, unit: 'PT' }, ...fg(C.purple) },
    { spaceAbove: { magnitude: 6, unit: 'PT' }, spaceBelow: { magnitude: 6, unit: 'PT' } })

  b.add('Sections 2–5 Combined Score  (out of 100)\n',
    { bold: true, fontSize: { magnitude: 11, unit: 'PT' } })

  const ranges1 = [
    ['80 – 100', 'Excellent psychological well-being'],
    ['60 – 79 ', 'Good — some minor areas to strengthen'],
    ['40 – 59 ', 'Moderate — several areas need attention'],
    ['20 – 39 ', 'Low — professional support is recommended'],
    ['Below 20 ', 'Please seek immediate professional support'],
  ]
  for (const [r, d] of ranges1)
    b.add(`    ${r}   →   ${d}\n`, { fontSize: { magnitude: 11, unit: 'PT' } })

  b.add('\n')
  b.add('Life Satisfaction Section 6  (out of 60)\n',
    { bold: true, fontSize: { magnitude: 11, unit: 'PT' } })

  const ranges2 = [
    ['50 – 60', 'Highly satisfied across life domains'],
    ['35 – 49', 'Moderately satisfied — some areas to explore'],
    ['20 – 34', 'Notable dissatisfaction — worth exploring professionally'],
    ['Below 20', 'Significant dissatisfaction — professional support advised'],
  ]
  for (const [r, d] of ranges2)
    b.add(`    ${r}   →   ${d}\n`, { fontSize: { magnitude: 11, unit: 'PT' } })

  b.add('\n')
  b.add(DIV, { fontSize: { magnitude: 9, unit: 'PT' }, ...fg(C.lgray) })

  // ── Clinician Notes ────────────────────────────────────────────────────────

  sectionHeader('', 'CLINICIAN NOTES')
  b.add('\n')
  openQuestion('Overall Clinical Impression:')
  openQuestion('Key Observations & Concerns:')
  openQuestion('Recommended Follow-up Actions:')

  b.add('Next Session Date:       ___________________________\n',
    { fontSize: { magnitude: 11, unit: 'PT' } })
  b.add('Clinician Name:         ___________________________\n',
    { fontSize: { magnitude: 11, unit: 'PT' } })
  b.add('Clinician Signature:    ___________________________\n',
    { fontSize: { magnitude: 11, unit: 'PT' } })

  return b.build()
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createPsychEvalForm() {
  const docs = google.docs({ version: 'v1', auth: getAuthenticatedClient() })

  // 1. Create the document
  const createRes = await docs.documents.create({
    requestBody: { title: 'Psychological Wellness Evaluation' }
  })
  const docId = createRes.data.documentId

  const { text, requests } = buildForm()

  // 2. Insert all text in one shot
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{ insertText: { location: { index: 1 }, text } }]
    }
  })

  // 3. Apply all formatting in one shot
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    })
  }

  return {
    documentId: docId,
    title: 'Psychological Wellness Evaluation',
    url: `https://docs.google.com/document/d/${docId}/edit`
  }
}
