import Logo from './Logo';
import { useI18n } from '../lib/i18n';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="max-w-[1200px] mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 text-sm">
            <Logo size={20} />
            <span className="font-semibold bg-gradient-to-r from-primary via-[#ffffff] to-accent bg-[length:200%_auto] animate-glimmer bg-clip-text text-transparent">
              StellarSplit
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {t('footer.built_on').split(/(Stellar|Soroban)/).map((part, i) => {
                if (part === 'Stellar') return <a key={i} href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Stellar</a>;
                if (part === 'Soroban') return <a key={i} href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Soroban</a>;
                return <span key={i}>{part}</span>;
              })}
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t('footer.github')}
            </a>
            <span className="text-border">·</span>
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t('footer.explorer')}
            </a>
            <span className="text-border">·</span>
            <a
              href="https://developers.stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {t('footer.docs')}
            </a>
            <span className="text-border">·</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-blink" />
              <span className="text-destructive font-medium">{t('footer.testnet')}</span>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-4 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
          {t('footer.tagline')}
        </div>
      </div>
    </footer>
  );
}
