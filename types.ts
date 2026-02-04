
export type Category = 
  | 'Photography' 
  | 'Web Development' 
  | 'Video Editing' 
  | 'Cooking' 
  | 'Painting' 
  | 'Writing' 
  | 'Design';

export interface Project {
  id: string;
  title: string;
  description: string;
  link: string; // Generic link for any media or project site
  tags: string[];
}

export interface Skill {
  name: string;
  level: number; // 0-100
}

export interface Qualification {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link?: string;
}

export interface PortfolioData {
  fullName: string;
  tagline: string;
  about: string;
  email: string;
  location: string;
  category: Category;
  skills: Skill[];
  projects: Project[];
  qualifications: Qualification[];
  certifications: Certification[];
  socials: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    portfolio?: string;
  };
}

export type Theme = 'minimal' | 'modern' | 'glass' | 'bold' | 'classic' | 'vibrant';

export interface AppState {
  view: 'login' | 'landing' | 'editor' | 'theme-selection' | 'preview' | 'profile';
  data: PortfolioData;
  theme: Theme;
}
