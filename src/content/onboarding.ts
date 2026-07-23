// First-run onboarding tour content (gap G4). Skippable, and re-openable later
// from the Help button in the header.

export interface OnboardingStep {
  heading: string
  body: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    heading: 'Welcome to SalesForge',
    body: "This short tour covers the basics. You can skip it now and reopen it any time from the Help button in the header.",
  },
  {
    heading: 'Getting around',
    body: 'The navigation bar at the top moves you between sections: Today, All Leads, Map, History, My List, Nurture, Reports, and Settings.',
  },
  {
    heading: 'Your daily priorities',
    body: 'Today shows the leads that need attention right now: Hot leads to call, Warm leads to follow up with, and a Hot Lead Alert when a big deal needs your attention.',
  },
  {
    heading: 'Open a lead for the full picture',
    body: 'Select "View details" on any lead to see its briefing, an AI-written call opener, next-step tips, an email draft, and a way to log your call.',
  },
  {
    heading: "If you're ever unsure",
    body: 'Look for a small "?" button next to any term you don\'t recognize, or select Help in the header for the full glossary. This tour is there too, whenever you want to replay it.',
  },
]
