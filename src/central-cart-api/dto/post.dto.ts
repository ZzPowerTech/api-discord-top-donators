export interface PostDto {
  id: number;
  title: string;
  content: string;
  image?: string;
  author?: string;
  created_at: string;
  updated_at: string;
  slug?: string;
  path?: string;
  published_at?: string;
}
