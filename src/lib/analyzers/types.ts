export interface WebsiteAnalysis {
  source: "website";
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyText: string;
  features: string[];
  pricing: string | null;
  testimonials: string[];
  ctas: string[];
  techStack: string[];
  raw: Record<string, unknown>;
}

export interface TwitterAnalysis {
  source: "twitter";
  handle: string;
  displayName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  tweetCount: number;
  profileUrl: string;
  websiteFromBio: string | null;
  recentTweets: Array<{
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    createdAt: string;
  }>;
  topTweets: Array<{
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    impressions: number;
    createdAt: string;
  }>;
  commonTopics: string[];
  averageEngagement: number;
  postingFrequency: string;
  voiceTone: string;
  raw: Record<string, unknown>;
}

export interface InstagramAnalysis {
  source: "instagram";
  handle: string;
  displayName: string;
  bio: string;
  followerCount: number | null;
  postCount: number | null;
  externalUrl: string | null;
  isBusinessAccount: boolean | null;
  category: string | null;
  manualInput: {
    businessType?: string;
    targetAudience?: string;
    mainOffering?: string;
  } | null;
  raw: Record<string, unknown>;
}

export interface LinkedInAnalysis {
  source: "linkedin";
  profileType: "personal" | "company";
  name: string;
  headline: string;
  description: string;
  industry: string | null;
  followerCount: number | null;
  websiteUrl: string | null;
  manualInput: {
    aboutText?: string;
    headline?: string;
    industry?: string;
  } | null;
  raw: Record<string, unknown>;
}

export interface SourceInputs {
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  instagram_manual?: Record<string, string>;
  linkedin_manual?: Record<string, string>;
}

export interface MergedAnalysis {
  sources: {
    website?: WebsiteAnalysis;
    twitter?: TwitterAnalysis;
    instagram?: InstagramAnalysis;
    linkedin?: LinkedInAnalysis;
  };
  sourceCount: number;
  primarySource: string;
  merged: {
    businessName: string;
    description: string;
    offerings: string[];
    targetAudience: string;
    existingChannels: string[];
    followerCounts: Record<string, number>;
    contentVoice: string;
    websiteUrl: string | null;
    pricing: string | null;
    socialProof: string[];
  };
}
