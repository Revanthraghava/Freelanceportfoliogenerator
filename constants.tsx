
import React from 'react';
import { 
  Camera, 
  Code, 
  Video, 
  ChefHat, 
  Palette, 
  PenTool, 
  Layout,
  Instagram,
  Github,
  Linkedin,
  Twitter,
  Globe
} from 'lucide-react';
import { Category, PortfolioData } from './types';

export const CATEGORIES: { id: Category; icon: React.ReactNode; description: string; color: string; bgLight: string }[] = [
  { id: 'Photography', icon: <Camera size={24} />, description: 'Showcase your visual storytelling through stunning galleries.', color: 'text-rose-600', bgLight: 'bg-rose-500' },
  { id: 'Web Development', icon: <Code size={24} />, description: 'Display code projects, technical skills, and software solutions.', color: 'text-indigo-600', bgLight: 'bg-indigo-500' },
  { id: 'Video Editing', icon: <Video size={24} />, description: 'Highlight showreels, motion graphics, and cinematic works.', color: 'text-purple-600', bgLight: 'bg-purple-500' },
  { id: 'Cooking', icon: <ChefHat size={24} />, description: 'Share recipes, culinary adventures, and professional plating.', color: 'text-amber-600', bgLight: 'bg-amber-500' },
  { id: 'Painting', icon: <Palette size={24} />, description: 'An online gallery for your fine art, sketches, and digital paintings.', color: 'text-emerald-600', bgLight: 'bg-emerald-500' },
  { id: 'Writing', icon: <PenTool size={24} />, description: 'A clean layout for articles, copy, scripts, and literary works.', color: 'text-sky-600', bgLight: 'bg-sky-500' },
  { id: 'Design', icon: <Layout size={24} />, description: 'Portfolio for UI/UX, graphics, and brand identity specialists.', color: 'text-fuchsia-600', bgLight: 'bg-fuchsia-500' },
];

export const SOCIAL_ICONS = {
  instagram: <Instagram size={20} />,
  github: <Github size={20} />,
  linkedin: <Linkedin size={20} />,
  twitter: <Twitter size={20} />,
  portfolio: <Globe size={20} />,
};

export const INITIAL_DATA: PortfolioData = {
  fullName: '',
  tagline: '',
  about: '',
  email: '',
  location: '',
  category: 'Web Development',
  skills: [],
  projects: [],
  qualifications: [],
  certifications: [],
  socials: {}
};
