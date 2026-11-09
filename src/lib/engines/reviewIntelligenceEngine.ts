import type { LocalReview, ReviewIntelligenceReport, ComplaintSummaryItem, PraiseSummaryItem } from '@/types';

const COMPLAINT_TOPICS = [
  {
    topic: 'Response Delay & Late Arrival',
    keywords: ['late', 'delayed', 'delayed arrival', 'waited', 'hours late', 'no show', 'rescheduled', 'slow response', 'took forever'],
  },
  {
    topic: 'Pricing Transparency & Unexpected Fees',
    keywords: ['overpriced', 'hidden fee', 'surprise bill', 'expensive', 'cost more than quoted', 'estimate was off', 'price gouging'],
  },
  {
    topic: 'Communication & Follow-up Failure',
    keywords: ['never called back', 'no response', 'poor communication', 'ignored', 'left on hold', 'could not reach', 'unreachable'],
  },
  {
    topic: 'Recurring Breakdowns & Repeat Visits',
    keywords: ['broke again', 'came back twice', 'still not fixed', 'unresolved', 'leaking again', 'same problem', 'not repaired properly'],
  },
  {
    topic: 'Billing & Invoice Inaccuracies',
    keywords: ['billing error', 'charged twice', 'invoice dispute', 'warranty denied', 'wrong charge'],
  },
];

const PRAISE_TOPICS = [
  {
    serviceOrAspect: 'Rapid Emergency Dispatch & Punctuality',
    keywords: ['fast response', 'same day', 'came within an hour', 'on time', 'emergency', 'quick turnaround', 'lifesaver', 'prompt'],
  },
  {
    serviceOrAspect: 'Technical Diagnostic Accuracy & Commercial Expertise',
    keywords: ['knowledgeable', 'diagnosed immediately', 'expert', 'chiller', 'rooftop unit', 'knew exactly', 'thorough diagnosis', 'commercial HVAC'],
  },
  {
    serviceOrAspect: 'Honest Pricing & Upfront Estimates',
    keywords: ['fair price', 'honest', 'reasonable', 'no hidden costs', 'explained options', 'transparent quote', 'saved us money'],
  },
  {
    serviceOrAspect: 'Professional & Courteous Technicians',
    keywords: ['professional', 'polite', 'clean', 'respectful', 'courteous', 'protective shoe covers', 'explained everything clearly'],
  },
  {
    serviceOrAspect: 'Preventative Maintenance & Long-term Reliability',
    keywords: ['annual contract', 'preventative maintenance', 'service plan', 'running smoothly', 'tune-up', 'reliable maintenance'],
  },
];

/**
 * Analyzes a collection of local business reviews and owner responses.
 * Detects patterns, extracts verified complaint/praise citations, calculates response metrics.
 */
export function analyzeReviews(reviews: LocalReview[]): ReviewIntelligenceReport {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviewsAnalyzed: 0,
      responseRatePercentage: 0,
      positiveCount: 0,
      neutralCount: 0,
      negativeCount: 0,
      commonComplaints: [],
      frequentlyPraised: [],
      customerExpectations: [
        'Rapid emergency dispatch with under 2-hour commercial SLA',
        'Transparent upfront pricing without surprise diagnostic add-ons',
        'Digital service logs with photos of repaired rooftop units',
      ],
      trustBuildingOpportunities: [
        'Implement an automated review generation system to build verified social proof',
        'Establish an active owner response policy to acknowledge all feedback within 24 hours',
      ],
    };
  }

  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  let respondedCount = 0;

  const complaintMatches: Record<string, { count: number; quotes: string[] }> = {};
  const praiseMatches: Record<string, { count: number; quotes: string[] }> = {};

  for (const review of reviews) {
    if (review.rating >= 4) positiveCount++;
    else if (review.rating === 3) neutralCount++;
    else negativeCount++;

    if (review.ownerResponseText && review.ownerResponseText.trim().length > 0) {
      respondedCount++;
    }

    const textLower = (review.reviewText || '').toLowerCase();

    // Check Complaints (especially on <= 3 stars)
    if (review.rating <= 3) {
      for (const cat of COMPLAINT_TOPICS) {
        const matched = cat.keywords.some(kw => textLower.includes(kw));
        if (matched) {
          if (!complaintMatches[cat.topic]) {
            complaintMatches[cat.topic] = { count: 0, quotes: [] };
          }
          complaintMatches[cat.topic].count++;
          if (complaintMatches[cat.topic].quotes.length < 3 && review.reviewText) {
            complaintMatches[cat.topic].quotes.push(review.reviewText);
          }
        }
      }
    }

    // Check Praises (especially on >= 4 stars)
    if (review.rating >= 4) {
      for (const p of PRAISE_TOPICS) {
        const matched = p.keywords.some(kw => textLower.includes(kw));
        if (matched) {
          if (!praiseMatches[p.serviceOrAspect]) {
            praiseMatches[p.serviceOrAspect] = { count: 0, quotes: [] };
          }
          praiseMatches[p.serviceOrAspect].count++;
          if (praiseMatches[p.serviceOrAspect].quotes.length < 3 && review.reviewText) {
            praiseMatches[p.serviceOrAspect].quotes.push(review.reviewText);
          }
        }
      }
    }
  }

  const commonComplaints: ComplaintSummaryItem[] = Object.entries(complaintMatches)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      evidenceQuotes: data.quotes,
    }))
    .sort((a, b) => b.count - a.count);

  const frequentlyPraised: PraiseSummaryItem[] = Object.entries(praiseMatches)
    .map(([serviceOrAspect, data]) => ({
      serviceOrAspect,
      count: data.count,
      evidenceQuotes: data.quotes,
    }))
    .sort((a, b) => b.count - a.count);

  const responseRatePercentage = Math.round((respondedCount / reviews.length) * 100);

  // Derive Customer Expectations from verified feedback
  const customerExpectations: string[] = [];
  if (commonComplaints.some(c => c.topic.includes('Pricing'))) {
    customerExpectations.push('Explicit written quotes prior to dispatching technicians or ordering commercial parts');
  }
  if (commonComplaints.some(c => c.topic.includes('Response Delay'))) {
    customerExpectations.push('Strict arrival time windows with SMS tracking link when technician is en route');
  }
  if (commonComplaints.some(c => c.topic.includes('Communication'))) {
    customerExpectations.push('Dedicated dispatch manager phone line and rapid follow-up on service requests');
  }
  if (customerExpectations.length === 0) {
    customerExpectations.push('Prompt 24/7 commercial emergency dispatch and upfront transparent maintenance contracts');
  }

  // Derive Trust-Building Opportunities
  const trustBuildingOpportunities: string[] = [];
  if (responseRatePercentage < 60) {
    trustBuildingOpportunities.push(
      `Owner response rate is currently ${responseRatePercentage}%. Publicly responding to all 1-3 star reviews demonstrates executive accountability to prospective commercial clients.`
    );
  }
  if (frequentlyPraised.length > 0) {
    trustBuildingOpportunities.push(
      `Feature proven strengths ("${frequentlyPraised[0].serviceOrAspect}") prominently on the homepage hero section and in Google Business Profile post updates.`
    );
  }
  if (reviews.length < 50) {
    trustBuildingOpportunities.push(
      `Total review volume (${reviews.length}) is below local category leaders (>80). Implement automated post-service SMS review requests via Watech CRM.`
    );
  }

  return {
    totalReviewsAnalyzed: reviews.length,
    responseRatePercentage,
    positiveCount,
    neutralCount,
    negativeCount,
    commonComplaints,
    frequentlyPraised,
    customerExpectations,
    trustBuildingOpportunities,
  };
}
