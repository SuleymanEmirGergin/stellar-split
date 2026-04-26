import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "StellarSplit",
  description: "AI-Powered Cross-Chain Expense Management on Stellar",
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'Pitch', link: '/pitch/problem-solution' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/installation' }
        ]
      },
      {
        text: 'Core Features',
        items: [
          { text: 'AI Assistant (Gemini)', link: '/features/ai-assistant' },
          { text: 'Gamification & Badges', link: '/features/gamification' },
          { text: 'Cross-Chain Bridge', link: '/features/bridge' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Soroban Contracts', link: '/architecture/soroban' },
          { text: 'Wormhole NTT', link: '/architecture/wormhole' }
        ]
      },
      {
        text: 'Pitch & Vision',
        items: [
          { text: 'Problem & Solution', link: '/pitch/problem-solution' },
          { text: 'Market & Roadmap', link: '/pitch/market-roadmap' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SuleymanEmirGergin/Birik' }
    ],
    footer: {
      message: 'Built for Stellar Journey to Mastery Hackathon',
      copyright: 'Copyright © 2026 StellarSplit Team'
    }
  }
})
