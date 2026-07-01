import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyGoal - Tech Career Success Tracker',
    short_name: 'MyGoal',
    description: 'One year of relentless consistency to master DSA, LLD, and High-Level System Design.',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#f97316',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
