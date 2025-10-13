export type SignType = 'Regulatory' | 'Warning' | 'Informational';
export type SignStatus = 'Verified' | 'Pending';

export interface TrafficSign {
  id: string;
  lat: number;
  lng: number;
  type: SignType;
  status: SignStatus;
  imageUrl: string;
}

export interface Submission {
  id: string;
  lat: number;
  lng: number;
  type: SignType;
  imageUrl: string;
  submittedAt: string;
  votesFor: number;
  votesAgainst: number;
}

export interface UserProfile {
  id: string;
  name: string;
  tslCoins: number;
}

export interface FilterState {
  types: Set<SignType>;
  statuses: Set<SignStatus>;
}
