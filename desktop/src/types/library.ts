export interface CommunityPackMeta {
  id: string;
  name: string;
  author: string;
  gender: 'male' | 'female';
  description: string;
  clipCounts: Record<string, number>;
  createdAt: string;
  downloads: number;
  score: number;
  steamName?: string;
}

export interface CommunityLibraryFilters {
  sort: 'newest' | 'top';
  q: string;
  gender: 'all' | 'male' | 'female';
}

export interface CommunityLibraryResult {
  packs: CommunityPackMeta[];
  total: number;
  hasMore: boolean;
}
