export interface ParityTool {
  path: string;
  title: string;
  summary: string;
  limitation: string;
  destination: string;
  actionLabel: string;
}

export const PARITY_TOOLS: ParityTool[] = [
  {
    path: '/tools/islamic-batch', title: 'Islamic & countermark batch',
    summary: 'Capture both sides, add measurements and select specialist identification options.',
    limitation: 'A dedicated web batch screen is now available. It sends each coin to the existing swish-islamic-identify Edge Function and displays returned evidence for review. Saving/confirming results into inventory remains a separate explicit action.',
    destination: '/tools/islamic-batch', actionLabel: 'Open batch identification',
  },
  {
    path: '/tools/silver-batch', title: 'Silver batch processing',
    summary: 'Review coin images and measurement evidence before identification and valuation.',
    limitation: 'The web client now supports multi-coin capture and sequential specialist identification using the existing backend. The native app's full silver commercial grouping, batch persistence and listing-strategy workflow is not yet fully ported.',
    destination: '/tools/silver-batch', actionLabel: 'Open silver batch',
  },
  {
    path: '/tools/bike-flipper', title: 'Bike Flipper tools',
    summary: 'Record a bicycle’s identity, fit, mechanical condition and known faults.',
    limitation: "Opens the existing bicycle capture workflow. The native app's dedicated repair-cost, profit-decision and buying recommendation logic still requires a web parity pass.",
    destination: '/scan/bikes', actionLabel: 'Open bicycle capture',
  },
  {
    path: '/tools/listing-preflight', title: 'Listing preflight',
    summary: 'Choose a listing, open its editor, save the draft and select Preflight.',
    limitation: 'Opens the listing workspace where a draft can be selected and its editor/preflight action run. A dedicated parity screen with the native app's full checklist and submit confirmation remains to be completed.',
    destination: '/listings', actionLabel: 'Choose a listing',
  },
];
