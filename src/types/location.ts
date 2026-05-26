export interface LiveLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  battery_level: number;
  is_sharing: boolean;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'admin' | 'member';
  avatar_url?: string | null;
  isSharing?: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  batteryLevel?: number;
  lastUpdated?: string;
}

export type LocationStatus = 'active' | 'inactive' | 'background';

export interface GPSState {
  myLocation: [number, number] | null;
  isSharing: boolean;
  timestamp: number;
}
