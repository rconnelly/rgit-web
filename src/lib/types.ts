export interface SessionUser {
  user: string;
  admin: boolean;
  actor: string;
}

export interface RepoInfo {
  name: string;
  path: string;
  visibility: string;
  default_branch?: string | null;
  clone_url: string;
  description?: string | null;
  role?: string | null;
  access: { user: string; role: string }[];
}

export interface TreeEntry {
  name: string;
  kind: string;
  mode: string;
  size?: number;
  sha: string;
}

export interface Tree {
  repo: string;
  ref: string;
  path: string;
  entries: TreeEntry[];
}

export interface Blob {
  repo: string;
  ref: string;
  path: string;
  sha: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content?: string | null;
}

export interface BlameLine {
  line: number;
  sha: string;
  author: string;
  email: string;
  author_time: number;
  text: string;
}

export interface Blame {
  repo: string;
  ref: string;
  path: string;
  lines: BlameLine[];
}

export interface CommitInfo {
  sha: string;
  short: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  body: string;
}

export interface Log {
  repo: string;
  ref: string;
  path?: string | null;
  commits: CommitInfo[];
}

export interface Refs {
  repo: string;
  default_branch?: string | null;
  branches: { name: string; sha: string }[];
  tags: { name: string; sha: string }[];
}

export interface Review {
  author: string;
  verdict: string;
  comment: string;
  at: string;
}

export interface MergeRequest {
  id: number;
  title: string;
  author: string;
  body: string;
  state: string;
  base_branch: string;
  head_branch: string;
  created_at: string;
  reviews: Review[];
  head_sha?: string;
  base_sha?: string;
}

export interface Diff {
  repo: string;
  base: string;
  head: string;
  diff: string;
  commits: CommitInfo[];
}
