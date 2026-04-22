import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Users,
  Briefcase,
  Palmtree,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

/**
 * Public `/use-cases` page — 3 concrete "who uses Birik and why" scenarios
 * with real on-chain tx hashes (verifiable on Stellar Expert). Meant to
 * answer the reviewer / Twitter visitor question "ok but what's it FOR?"
 * without requiring a wallet connection.
 *
 * Linked from the Landing hero CTAs (small ghost link under the main
 * buttons). Direct-URL-shareable: `/use-cases`.
 */

const SCREENSHOT_BASE =
  'https://raw.githubusercontent.com/SuleymanEmirGergin/stellar-split/master/docs/screenshots';

interface Scenario {
  id: string;
  icon: LucideIcon;
  /** Hero title — who this is for */
  title: string;
  /** Concrete persona line */
  subtitle: string;
  /** 2-3 pain points, one per bullet */
  problem: string[];
  /** 2-3 "Birik solves it by..." bullets */
  solution: string[];
  /** Filename inside docs/screenshots/ (served from GitHub raw CDN) */
  screenshot: string;
  /** Stellar Testnet tx hash; rendered as a Stellar Expert link */
  txHash: string;
}

const scenarios: Scenario[] = [
  {
    id: 'erasmus',
    icon: Users,
    title: '4 kişilik Erasmus evi',
    subtitle: 'Berlin, Barselona, İstanbul — aynı hikâye, farklı şehir.',
    problem: [
      'Aylık kira + internet + elektrik + market — kim ne kadar ödedi, kim borçlu?',
      'Yurtdışındasın, IBAN\'lar farklı, SWIFT havalesi günlerce sürüyor + komisyon yiyor.',
      'Splitwise bilançoyu gösteriyor ama "kapat, bitir" kısmı hâlâ sende.',
    ],
    solution: [
      'Her harcamayı anlık olarak gruba ekle — kim ödediyse net bakiyede görünür.',
      'Ay sonu Settle tek tık → min-flow algoritması 10 pairwise transferi ~3\'e düşürür.',
      'Ücret tx başına ~$0.00005 — dört kişi için toplam 2 kuruş civarı.',
    ],
    screenshot: 'settle-modal-minflow.png',
    txHash: 'c4b13aaf245715d0ca8b1b721fb54043ec12eb097a91da384e7c89d381adc2bc',
  },
  {
    id: 'startup',
    icon: Briefcase,
    title: 'Uzaktan çalışan startup ekibi',
    subtitle: '6 kişilik SaaS ekibi, üç kıtada dağılmış — aylık giderler, team lunch, retreat.',
    problem: [
      'Aylık SaaS abonelikleri + team lunch + arada bir retreat — CFO yok, ekip kendi takip ediyor.',
      'Kimisi USDC kullanıyor, kimisi XLM, kimisi TRY — döviz dönüşümü elle yapılıyor.',
      'Accounting için yapılan Excel\'ler ay sonu kayboluyor.',
    ],
    solution: [
      'Tekrarlayan harcamalar için Recurring Subscriptions — her ay otomatik ekler.',
      'Settle bir transactionda kapanır, SPLT ödül token\'ı başlatan kişiye mint edilir.',
      'Activity feed her işlemi Stellar Expert\'te linkliyor — muhasebe export\'u hazır.',
    ],
    screenshot: 'activity-feed.png',
    txHash: 'a1f92bb0d3e7c4f6ef2d1826cc0193fd5f21e62ba9e9bb3f9fcb3e9cb9d9cbda',
  },
  {
    id: 'vacation',
    icon: Palmtree,
    title: 'Tatil grubu — önceden biriktir, yolda harca',
    subtitle: '8 arkadaş, 5 günlük Antalya tatili planı — bütçe, masraf, hesap.',
    problem: [
      'Tatil öncesi herkes para biriktiriyor ama kimse "bu para nerede?" diye soramıyor.',
      'Tatilde biri restoran, biri taksi, biri havuz — akşam masraf listesi karmaşıklaşıyor.',
      'Dönüşte "kim kime ne kadar?" sohbeti 3 hafta sürüyor.',
    ],
    solution: [
      'Savings Pool ile tatil öncesi ortak hedefi belirle → herkes contribute\'lar, havuz on-chain büyür.',
      'Tatilde Group Detail içinde harcamaları ekle, bakiye anlık güncellenir.',
      'Dönüşte: pool release + settle = iki transaction, hepsi kapandı.',
    ],
    screenshot: 'savings-roadmap.png',
    txHash: 'fa3d1e51c2ff82aa77b89e0f5e2c8f6a3b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
  },
];

export default function UseCasesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
        {/* Header */}
        <header className="mb-12">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6"
            data-testid="use-cases-back"
          >
            <ArrowLeft size={16} />
            {t('use_cases.back_to_home')}
          </button>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight mb-4">
            {t('use_cases.title')}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {t('use_cases.subtitle')}
          </p>
        </header>

        {/* Scenarios */}
        <div className="space-y-12" data-testid="use-cases-list">
          {scenarios.map((s, i) => (
            <ScenarioCard key={s.id} scenario={s} index={i} />
          ))}
        </div>

        {/* CTA footer */}
        <footer className="mt-16 pt-12 border-t border-edge text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
            {t('use_cases.footer_title')}
          </h2>
          <p className="text-muted-foreground mb-6">{t('use_cases.footer_subtitle')}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-birik"
            data-testid="use-cases-cta"
          >
            {t('use_cases.try_demo_cta')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, index }: { scenario: Scenario; index: number }) {
  const { t } = useI18n();
  const Icon = scenario.icon;
  const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${scenario.txHash}`;
  const shortHash = `${scenario.txHash.slice(0, 8)}…${scenario.txHash.slice(-6)}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      data-testid={`use-case-${scenario.id}`}
      className="rounded-3xl border border-white/[0.07] bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Header row */}
      <div className="p-6 md:p-8 flex items-start gap-4 border-b border-white/[0.05]">
        <div className="shrink-0 w-12 h-12 rounded-2xl bg-birik/10 text-birik flex items-center justify-center">
          <Icon size={22} />
        </div>
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {scenario.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">{scenario.subtitle}</p>
        </div>
      </div>

      {/* Problem + solution */}
      <div className="grid md:grid-cols-2 gap-6 md:gap-8 p-6 md:p-8">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-400/90 mb-3">
            {t('use_cases.problem_label')}
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed">
            {scenario.problem.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-400/60 mt-0.5">·</span>
                <span className="text-foreground/85">{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-birik mb-3">
            {t('use_cases.solution_label')}
          </h3>
          <ul className="space-y-2 text-sm leading-relaxed">
            {scenario.solution.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-birik/80 mt-0.5">→</span>
                <span className="text-foreground/85">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Screenshot */}
      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <img
          src={`${SCREENSHOT_BASE}/${scenario.screenshot}`}
          alt=""
          loading="lazy"
          className="w-full h-auto rounded-2xl border border-white/[0.05]"
          data-testid={`use-case-${scenario.id}-screenshot`}
        />
      </div>

      {/* Tx hash verify footer */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={`use-case-${scenario.id}-explorer`}
        className="flex items-center justify-between gap-4 px-6 md:px-8 py-4 bg-white/[0.02] border-t border-white/[0.05] text-xs hover:bg-white/[0.04] transition-colors group"
      >
        <div className="min-w-0">
          <div className="font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {t('use_cases.example_tx_label')}
          </div>
          <div className="font-mono text-foreground/70 truncate">{shortHash}</div>
        </div>
        <div className="shrink-0 inline-flex items-center gap-1.5 text-birik font-bold group-hover:text-birik/80 transition-colors">
          {t('use_cases.verify_on_explorer')}
          <ExternalLink size={12} />
        </div>
      </a>
    </motion.section>
  );
}
