export interface Report {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  type: 'dog' | 'cat' | 'other';
  description: string;
  timestamp: number;
  status: 'active' | 'resolved';
}

export const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    position: { lat: 3.451647, lng: -76.531982 }, // Near Plaza Caycedo
    imageUrl: 'https://images.pexels.com/photos/2023384/pexels-photo-2023384.jpeg',
    type: 'dog',
    description: 'Friendly brown dog needs help, seems hungry',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    status: 'active'
  },
  {
    id: '2',
    position: { lat: 3.454123, lng: -76.533876 }, // Near San Antonio neighborhood
    imageUrl: 'https://images.pexels.com/photos/1643457/pexels-photo-1643457.jpeg',
    type: 'cat',
    description: 'Gray cat with injured paw',
    timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    status: 'active'
  }
];