
export interface VKPost {
  id: string;
  text: string;
  likes: number;
  date: string; // Display string
  timestamp: number; // For sorting
  url: string;
  imageUrl?: string;
  comments: number;
  reposts: number;
}

export interface SearchParams {
  communityUrl: string;
  startDate: string;
  endDate: string;
  accessToken: string;
}

export interface AnalysisResult {
  posts: VKPost[];
  communityName: string;
  communityPhoto?: string;
}

export interface SavedCommunity {
  name: string;
  url: string;
}

export interface SavedToken {
  name: string;
  token: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  RESOLVING_ID = 'RESOLVING_ID',
  FETCHING_POSTS = 'FETCHING_POSTS',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}