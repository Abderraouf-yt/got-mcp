import { z } from 'zod';
import path from 'node:path';

export const BrandConfigSchema = z.object({
  identity: z.object({
    name: z.string().default('findiacs'),
    tagline: z.string().default('Professional Compliance Intelligence'),
    logoText: z.string().default('findiacs'),
    logoAssetPath: z.string().optional().describe('Optional path to a .png/.svg logo file'),
  }),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i).default('#0F172A'), // Navy
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i).default('#0369A1'), // Brand Blue
    accent: z.string().regex(/^#[0-9A-F]{6}$/i).default('#15803d'), // Green
    warning: z.string().regex(/^#[0-9A-F]{6}$/i).default('#b45309'), // Amber
    text: z.string().regex(/^#[0-9A-F]{6}$/i).default('#1E293B'), // Slate 800
    muted: z.string().regex(/^#[0-9A-F]{6}$/i).default('#64748B'), // Slate 500
  }),
  fonts: z.object({
    header: z.string().default('RoyalSerif'),
    body: z.string().default('Morgan'),
    mono: z.string().default('Roboto'),
  }),
  paths: z.object({
    fontsDir: z.string().default('assets/fonts'),
    headerFile: z.string().default('Royal-Serif.otf'),
    bodyFile: z.string().default('Morgan44-Regular.ttf'),
  }),
});

export type BrandConfig = z.infer<typeof BrandConfigSchema>;

export const BRAND_CONFIG: BrandConfig = {
  identity: {
    name: 'findiacs',
    tagline: 'Professional Compliance Intelligence',
    logoText: 'findiacs',
  },
  colors: {
    primary: '#0F172A',
    secondary: '#0369A1',
    accent: '#15803d',
    warning: '#b45309',
    text: '#1E293B',
    muted: '#64748B',
  },
  fonts: {
    header: 'RoyalSerif',
    body: 'Morgan',
    mono: 'Roboto',
  },
  paths: {
    fontsDir: 'assets/fonts',
    headerFile: 'Royal-Serif.otf',
    bodyFile: 'Morgan44-Regular.ttf',
  },
};
