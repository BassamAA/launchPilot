export interface MobileSiteSummary {
  id: string;
  name: string;
  url: string;
  status: string;
  queueCount: number;
  hasPlan: boolean;
  hasBrief: boolean;
  trackingReady: boolean;
  trackingActive: boolean;
  nextAction: {
    type: string;
    label: string;
  };
}

export interface MobileOverview {
  site: {
    id: string;
    name: string;
    url: string;
  };
  status: {
    hasBrief: boolean;
    hasPlan: boolean;
    queueCount: number;
    generatedCount: number;
    approvedCount: number;
    trackingReady: boolean;
    trackingActive: boolean;
  };
  nextAction: {
    type: string;
    label: string;
  };
  today: {
    scheduledCount: number;
    publishedCount: number;
  };
}

export interface MobileQueueItem {
  id: string;
  channel: string;
  title: string | null;
  body: string | null;
  status: string;
  scheduledDate: string | null;
  publishedUrl: string | null;
  platformUrl: string | null;
  helper: {
    copyBeforeOpen: boolean;
    primaryLabel: string;
    completeLabel: string;
    urlLabel: string;
    urlPlaceholder: string;
  };
  context: Record<string, string | null>;
}
