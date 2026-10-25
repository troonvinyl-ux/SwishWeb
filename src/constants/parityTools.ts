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
    limitation: 'The dedicated batch workflow is not implemented in this web client. The existing coin capture screen handles one coin at a time; specialist service availability is determined by the backend.',
    destination: '/identify', actionLabel: 'Open single-coin capture',
  },
  {
    path: '/tools/silver-batch', title: 'Silver batch processing',
    summary: 'Review coin images and measurement evidence before identification and valuation.',
    limitation: 'The dedicated silver batch workflow is not implemented in this web client. Single-coin capture is available; this shortcut does not perform batch processing.',
    destination: '/identify', actionLabel: 'Open single-coin capture',
  },
  {
    path: '/tools/bike-flipper', title: 'Bike Flipper tools',
    summary: 'Record a bicycle’s identity, fit, mechanical condition and known faults.',
    limitation: 'The existing bicycle form records user-entered details for review. Dedicated repair-cost and profit workflows are not implemented here, and manual estimates are not verified valuations.',
    destination: '/scan/bikes', actionLabel: 'Open bicycle capture',
  },
  {
    path: '/tools/listing-preflight', title: 'Listing preflight',
    summary: 'Choose a listing, open its editor, save the draft and select Preflight.',
    limitation: 'Preflight is invoked from a saved listing through the existing backend function. Its result and availability must be confirmed by the server; this directory does not run a check.',
    destination: '/listings', actionLabel: 'Choose a listing',
  },
];
