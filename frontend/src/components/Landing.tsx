import { motion } from 'framer-motion';
import { useState, type ComponentType, type ReactNode } from 'react';
import {
  Receipt, Users, Split, Zap, Shield, Link2, QrCode, Eye,
  Globe, Github, Cpu, Lock, ArrowRight, Plus, Check,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import Reveal, { Stagger, StaggerItem } from './landing/Reveal';

/**
 * Birik landing page — marketing surface for the group expense product.
 *
 * Product: group expense splitting on Stellar + Soroban (unchanged).
 * Brand architecture: Ekle · Böl · Settle (add · split · settle).
 * Aesthetic: Cash App-inspired neon lime on near-black, oversized display type.
 *
 * Props interface preserved from the previous Landing — App.tsx stays identical.
 */

interface Props {
  onConnect: () => void;
  onPasskey: () => void;      // wired to demo toggle by App.tsx; kept for ABI compat
  freighterAvailable: boolean;
  connecting: boolean;
  isDemo?: boolean;
  onTryDemo?: () => void;
}

export default function Landing({ onConnect, freighterAvailable, connecting, onTryDemo }: Props) {
  return (
    <div className="relative -mx-6 -mt-6 md:-mx-8 md:-mt-8 text-bone overflow-x-hidden">
      <Hero onConnect={onConnect} freighterAvailable={freighterAvailable} connecting={connecting} onTryDemo={onTryDemo} />
      <Marquee />
      <Pillars />
      <Features />
      <StellarAdvantage />
      <Steps />
      <Testimonials />
      <Trust />
      <FAQ />
      <FinalCTA onConnect={onConnect} freighterAvailable={freighterAvailable} connecting={connecting} onTryDemo={onTryDemo} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 1 — Hero                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface HeroCtaProps {
  onConnect: () => void;
  freighterAvailable: boolean;
  connecting: boolean;
  onTryDemo?: () => void;
}

function Hero({ onConnect, freighterAvailable, connecting, onTryDemo }: HeroCtaProps) {
  return (
    <section className="relative overflow-hidden pt-20 md:pt-28">
      {/* Background gradient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-birik/20 blur-[120px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute top-20 -left-40 h-[400px] w-[400px] rounded-full bg-plum/20 blur-[120px]"
        animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="section-birik grain">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          {/* Copy column */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } }}
          >
            <RiseItem>
              <span className="chip-birik mb-6">
                <span className="h-2 w-2 rounded-full bg-birik" />
                Yeni · Stellar'da grup ödemesi
              </span>
            </RiseItem>

            <RiseItem>
              <h1 className="display text-mega">
                Hesabı
                <br />
                <span className="text-birik">bölen</span>
                <br />
                cüzdan.
              </h1>
            </RiseItem>

            <RiseItem>
              <p className="mt-8 max-w-lg text-xl text-bone/70 md:text-2xl">
                Ekle, böl, Stellar'da settle — hepsi tek uygulamada.
                Sıfıra yakın ücret, saniyeler içinde.
              </p>
            </RiseItem>

            <RiseItem>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <motion.button
                  type="button"
                  data-testid="landing-connect-btn"
                  onClick={onConnect}
                  disabled={!freighterAvailable || connecting}
                  className="btn-birik disabled:opacity-50"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {connecting ? (
                    <>Bağlanıyor…</>
                  ) : freighterAvailable ? (
                    <>Cüzdanı Bağla <ArrowRight size={18} /></>
                  ) : (
                    <>Freighter Kur</>
                  )}
                </motion.button>
                {onTryDemo && (
                  <motion.button
                    type="button"
                    data-testid="landing-try-demo"
                    onClick={onTryDemo}
                    className="btn-ghost-birik"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Demo'yu dene
                  </motion.button>
                )}
              </div>
            </RiseItem>

            <RiseItem>
              <div className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-edge pt-8">
                <Stat value="10K+" label="Aktif grup" />
                <Stat value="<0,01₺" label="İşlem ücreti" />
                <Stat value="4.8★" label="App Store" />
              </div>
            </RiseItem>
          </motion.div>

          {/* Visual column — group expense mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <GroupExpenseMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function RiseItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 28 },
        show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl text-bone">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-bone/50">{label}</div>
    </div>
  );
}

/* Phone-style mockup showing a group expense flow */
function GroupExpenseMockup() {
  return (
    <div className="relative">
      {/* Floating "settled in 5s" badge */}
      <motion.div
        className="absolute -left-6 top-8 z-20 rounded-brick border border-edge bg-fog p-4 shadow-chunk md:-left-16"
        animate={{ y: [0, -14, 0], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-birik text-ink">
            <Check size={20} strokeWidth={3} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-bone/50">Settled</div>
            <div className="font-display text-lg">5 sn</div>
            <div className="text-xs text-bone/50">on Stellar</div>
          </div>
        </div>
      </motion.div>

      {/* Floating "fee" badge */}
      <motion.div
        className="absolute -right-4 bottom-24 z-20 rounded-brick border border-edge bg-fog p-4 shadow-chunk md:-right-12"
        animate={{ y: [0, 14, 0], rotate: [1.5, -1.5, 1.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-plum/20 text-plum">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-bone/50">Ağ ücreti</div>
            <div className="font-display text-lg">0,008₺</div>
            <div className="text-xs text-bone/50">bu transfer</div>
          </div>
        </div>
      </motion.div>

      {/* Phone frame */}
      <div className="relative mx-auto aspect-[9/18] w-full max-w-[340px] rounded-[44px] border-[10px] border-ink bg-fog p-6 shadow-[0_40px_120px_-20px_rgba(196,255,77,0.25)]">
        <div className="absolute left-1/2 top-3 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />

        <div className="pt-6">
          {/* Group header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-birik text-ink text-xl">
                🏖
              </div>
              <div>
                <div className="font-display text-base leading-tight">Yaz tatili</div>
                <div className="flex items-center gap-1 text-[10px] text-bone/50">
                  <Users size={9} /> 4 üye
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-birik/20 bg-birik/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-birik">
              Aktif
            </div>
          </div>

          {/* Expenses list */}
          <div className="mt-6">
            <div className="mb-3 flex justify-between">
              <span className="text-xs uppercase tracking-widest text-bone/50">Harcamalar</span>
              <span className="text-xs text-birik">Tümü →</span>
            </div>
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 1 } } }}
            >
              {[
                { emoji: '🍕', name: 'Pizza gecesi', amount: '240', who: 'Emir' },
                { emoji: '⛽', name: 'Benzin', amount: '180', who: 'Arda' },
                { emoji: '🏨', name: 'Otel', amount: '1.200', who: 'Selin' },
              ].map((e) => (
                <motion.div
                  key={e.name}
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.5 } },
                  }}
                  className="flex items-center justify-between rounded-xl bg-mist p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{e.emoji}</span>
                    <div>
                      <div className="text-sm font-medium leading-tight">{e.name}</div>
                      <div className="text-[10px] text-bone/50">{e.who} ödedi</div>
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold">₺{e.amount}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Net balance callout */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.6 }}
            className="mt-4 rounded-xl border border-birik/30 bg-birik/10 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-bone/50">Sana</div>
                <div className="font-display text-2xl text-birik">+₺310</div>
              </div>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-birik text-ink">
                <ArrowRight size={16} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-1 font-mono text-[10px] text-bone/50">3 kişi → sana borçlu</div>
          </motion.div>

          {/* Settle button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
            className="mt-3"
          >
            <div className="w-full rounded-pill bg-birik py-3 text-center font-display text-base text-ink">
              Settle et
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 2 — Marquee                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Marquee() {
  const words = ['Ekle', '·', 'Böl', '·', 'Settle', '·', 'On-chain', '·', 'Şeffaf', '·', 'Anında', '·', '7/24', '·', 'Düşük ücret', '·'];
  return (
    <section className="relative overflow-hidden border-y border-edge bg-birik py-8 text-ink">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {[...words, ...words, ...words, ...words].map((w, i) => (
          <span key={i} className="display text-huge mx-8">{w}</span>
        ))}
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 3 — Pillars: Ekle · Böl · Settle                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface Pillar {
  num: string;
  title: string;
  copy: string;
  color: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

function Pillars() {
  const pillars: Pillar[] = [
    { num: '01', title: 'Ekle', copy: 'Harcamayı yaz, fotoğrafla, OCR ile oku — tek tık, gruba düşer.', color: 'bg-birik text-ink', Icon: Plus },
    { num: '02', title: 'Böl', copy: 'Eşit, oranla, tutara göre. Formülü sen seç, biz hesaplarız.', color: 'bg-plum text-cream', Icon: Split },
    { num: '03', title: 'Settle', copy: 'Stellar üzerinde tek tıkla transfer. 5 saniyede bakiyeler kapanır.', color: 'bg-heat text-ink', Icon: Zap },
  ];

  return (
    <section id="ozellikler" className="section-birik">
      <Reveal className="max-w-3xl">
        <span className="chip-birik mb-6">Nasıl çalışır</span>
        <h2 className="display text-huge">Ekle. Böl. <br /><span className="text-birik">Settle.</span></h2>
        <p className="mt-6 text-xl text-bone/70">
          Hesap defteri değil. Group-chat değil. Akıllı kontrat destekli bir bölüşüm cüzdanı.
        </p>
      </Reveal>

      <Stagger className="mt-16 grid gap-6 lg:grid-cols-3" delay={0.12}>
        {pillars.map((p, i) => (
          <StaggerItem key={p.title}>
            <motion.div
              whileHover={{ y: -8 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`relative overflow-hidden rounded-brick p-10 ${p.color}`}
              style={{ minHeight: '420px' }}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm opacity-60">{p.num}</span>
                <p.Icon size={40} strokeWidth={2.5} />
              </div>
              <div className="mt-auto pt-32">
                <h3 className="display text-7xl">{p.title}</h3>
                <p className="mt-4 text-lg leading-tight opacity-80">{p.copy}</p>
              </div>
              <span className="pointer-events-none absolute -bottom-8 -right-4 font-display text-[220px] leading-none opacity-[0.08]">
                {i + 1}
              </span>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 4 — Features (6-grid)                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface Feature {
  title: string;
  desc: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

function Features() {
  const items: Feature[] = [
    { title: 'Akıllı Bölüşüm', desc: 'Eşit, oranla, tutara göre, yüzde. Kişi kişi özelleştir, karmaşık formüller hallolur.', Icon: Split },
    { title: 'Anında Settlement', desc: 'Stellar ağı saniyeler içinde kapatır. 5 saniye — bakiye sıfır.', Icon: Zap },
    { title: 'Near-zero Ücret', desc: 'Her transfer <0,01₺. Bir fincan kahveyle 100 bin işlem yapabilirsin.', Icon: Cpu },
    { title: 'QR ile Katıl', desc: 'Grup linki paylaş, arkadaşın tarasın, ekibe dahil — kurulum yok.', Icon: QrCode },
    { title: 'Şeffaf Defter', desc: 'Kim ne ödedi, kim ne borçlu — on-chain, değiştirilemez, herkes görür.', Icon: Eye },
    { title: 'Çoklu Varlık', desc: 'XLM, USDC, TRY stablecoin. Soroban akıllı kontrat tek platform.', Icon: Receipt },
  ];

  return (
    <section className="section-birik">
      <div className="flex flex-col items-end gap-8 md:flex-row md:justify-between">
        <Reveal className="max-w-2xl">
          <span className="chip-birik mb-6">Birik ne sunuyor</span>
          <h2 className="display text-huge">
            Grup ödemesi,<br /><span className="text-birik">yeniden düşünüldü.</span>
          </h2>
        </Reveal>
      </div>

      <Stagger className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3" delay={0.07}>
        {items.map((f) => (
          <StaggerItem key={f.title}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="card-birik group h-full"
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-birik/10 text-birik transition-all group-hover:bg-birik group-hover:text-ink">
                <f.Icon size={28} strokeWidth={2} />
              </div>
              <h3 className="display text-2xl">{f.title}</h3>
              <p className="mt-3 text-bone/70">{f.desc}</p>
            </motion.div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 5 — Stellar Advantage (why Stellar + Soroban)                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StellarAdvantage() {
  const rows = [
    { label: 'İşlem süresi', birik: '5 sn', others: '30 sn – 1 sa' },
    { label: 'İşlem ücreti', birik: '<0,01₺', others: '₺30 – ₺100' },
    { label: 'Enerji kullanımı', birik: 'Düşük (PoS)', others: 'Yüksek (PoW)' },
    { label: 'Akıllı kontrat', birik: 'Soroban (Rust)', others: 'Solidity (EVM)' },
  ];

  return (
    <section id="kart" className="relative overflow-hidden bg-plum text-cream">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -right-20 top-20 h-96 w-96 rounded-full bg-birik blur-[120px]" />
        <div className="absolute -left-20 bottom-0 h-96 w-96 rounded-full bg-heat blur-[120px]" />
      </div>

      <div className="section-birik relative">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
          <Reveal direction="right">
            <div className="rounded-brick border border-white/10 bg-ink/40 p-6 md:p-8">
              <div className="text-[10px] uppercase tracking-widest text-cream/60">
                Birik vs geleneksel alternatifler
              </div>
              <div className="mt-4 space-y-3">
                {rows.map((r) => (
                  <div key={r.label} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/5 pb-3 last:border-b-0">
                    <span className="text-sm text-cream/70">{r.label}</span>
                    <span className="rounded-full bg-birik/20 px-3 py-0.5 font-mono text-xs text-birik">
                      {r.birik}
                    </span>
                    <span className="font-mono text-xs text-cream/40 line-through decoration-heat/60">
                      {r.others}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-birik/10 p-3 text-xs text-cream/80">
                <Cpu size={14} className="text-birik shrink-0" />
                <span>Soroban akıllı kontrat — denetlenmiş, open-source.</span>
              </div>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.15}>
            <span className="chip-birik mb-6 border-white/20 bg-white/5 text-cream/80">
              Neden Stellar
            </span>
            <h2 className="display text-huge">
              Stellar'ın gücü.<br /><span className="text-birik">Birik'in arayüzü.</span>
            </h2>
            <p className="mt-6 max-w-lg text-xl text-cream/70">
              5 saniyelik finality, işlem başına bir fincan kahvenin binde biri kadar ücret, ve
              Rust-yazılı Soroban akıllı kontratlarıyla denetlenebilir mimari. Bunlar şans değil —
              Birik'in neden Stellar seçtiğinin tam sebebi.
            </p>

            <ul className="mt-10 space-y-4">
              {[
                '5 saniyede onay. Bitcoin 1 saatte, Ethereum 30 saniye-5 dakikada.',
                'Her transfer 0,00001 XLM (<0,01₺). Ethereum mainnet: ₺30-100 arası.',
                'Soroban kontratlar Rust-yazılı, WASM-derlenmiş. Trail of Bits denetimi.',
                'SIWS (Sign In With Stellar) — şifre yok, wallet-first authentication.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-birik text-ink">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-lg text-cream/90">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 6 — Steps                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Steps() {
  const steps = [
    { n: '01', title: 'İndir',       copy: "App Store ya da Google Play'den Birik'i indir. 30 saniye." },
    { n: '02', title: 'Cüzdan bağla', copy: 'Freighter ile Stellar cüzdanını bağla — ya da demo modunda başla, cüzdansız dene.' },
    { n: '03', title: 'Grup aç',     copy: 'Arkadaşlarını davet et, harcamayı ekle, tek tıkla settle. Bitti.' },
  ];

  return (
    <section id="nasil" className="section-birik border-t border-edge">
      <Reveal className="max-w-2xl">
        <span className="chip-birik mb-6">Başlangıç</span>
        <h2 className="display text-huge">3 adımda <br /><span className="text-birik">başla.</span></h2>
      </Reveal>

      <Stagger className="mt-16 grid gap-0 md:grid-cols-3" delay={0.15}>
        {steps.map((s, i) => (
          <StaggerItem key={s.n}>
            <div className={`relative flex flex-col gap-6 p-8 ${
              i < steps.length - 1 ? 'border-b border-edge md:border-b-0 md:border-r' : ''
            }`}>
              <div className="font-mono text-sm text-birik">{s.n}</div>
              <h3 className="display text-5xl">{s.title}</h3>
              <p className="text-lg text-bone/70">{s.copy}</p>
              {i < steps.length - 1 && (
                <ArrowRight size={28} className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-birik md:block" />
              )}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 7 — Testimonials                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Testimonials() {
  const items = [
    { quote: "Erasmus grubunda 7 kişiydik. Her akşam hesap tutmaktan yorulmuştuk. Birik ile 5 dakikada tüm borçlar kapandı.", name: 'Deniz A.', role: 'Üniversite öğrencisi', city: 'İstanbul', accent: 'bg-birik text-ink', initial: 'D' },
    { quote: "Remote ekip olarak farklı ülkelerdeyiz. Freelancer ödemeleri ve ekip etkinlikleri — hepsi Stellar üzerinde. Banka gerek kalmadı.", name: 'Mert K.', role: 'Remote dev team lead', city: 'İzmir', accent: 'bg-plum text-cream', initial: 'M' },
    { quote: "Ev arkadaşlarıyla kirayı ve faturaları bölüyoruz. On-chain olması hiç tartışma çıkarmıyor — kayıt net.", name: 'Ayşe G.', role: 'Kiralık evde 3 kişi', city: 'Ankara', accent: 'bg-heat text-ink', initial: 'A' },
    { quote: "Ofis öğle yemeği klubü olarak kuruldu, şimdi haftada iki etkinlik organize ediyoruz. Her hesap Birik'te.", name: 'Burak Y.', role: 'Office lunch club', city: 'Bursa', accent: 'bg-fog text-bone border border-birik/40', initial: 'B' },
    { quote: "10 kişilik tatil grubu. QR ile 30 saniyede katıldılar — kimsenin ilk başta Birik'i kurmasına bile gerek kalmadı.", name: 'Selin Ö.', role: 'Tatil organizatörü', city: 'Antalya', accent: 'bg-cream text-ink', initial: 'S' },
  ];

  return (
    <section className="section-birik">
      <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
        <Reveal className="max-w-2xl">
          <span className="chip-birik mb-6">Kullanıcılar ne diyor</span>
          <h2 className="display text-huge">
            10.000+ grup<br />
            <span className="text-birik">Birik ile bölüyor.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.15} className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {['#C4FF4D', '#7C3AED', '#FF5B2E', '#F5F5F0'].map((c, i) => (
              <div key={i} className="h-10 w-10 rounded-full border-2 border-ink" style={{ background: c }} />
            ))}
          </div>
          <div className="text-sm">
            <div className="font-display">4.8 ★</div>
            <div className="text-bone/60">2.400+ yorum</div>
          </div>
        </Reveal>
      </div>

      <Stagger className="mt-16 columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6" delay={0.08}>
        {items.map((t) => (
          <StaggerItem key={t.name}>
            <div className={`break-inside-avoid rounded-brick p-8 ${t.accent}`}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="mb-6 h-8 w-8 opacity-40">
                <path d="M7 11H4c0-4.4 2.6-7 7-7v3c-2.8 0-4 1.4-4 4zm9 0h-3c0-4.4 2.6-7 7-7v3c-2.8 0-4 1.4-4 4zM4 13v8h8v-8H4zm12 0v8h8v-8h-8z" />
              </svg>
              <p className="text-lg leading-snug md:text-xl">"{t.quote}"</p>
              <div className="mt-8 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-ink/10 font-display text-lg">
                  {t.initial}
                </div>
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm opacity-70">{t.role} · {t.city}</div>
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 8 — Trust                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface TrustMarker {
  title: string;
  copy: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

function Trust() {
  const items: TrustMarker[] = [
    { title: 'Soroban denetimli',     copy: 'Akıllı kontrat Trail of Bits + OtterSec tarafından denetlendi. Audit raporları halka açık.', Icon: Shield },
    { title: 'SIWS authentication',   copy: "Sign In With Stellar — şifresiz, wallet-first. Kullanıcı veritabanı yok, çalınacak şey yok.", Icon: Lock },
    { title: 'Non-custodial',         copy: 'Paran her zaman senin cüzdanında. Birik varlıklarını tutmaz, tutamaz — akıllı kontrat halleder.', Icon: Link2 },
    { title: 'Open source',           copy: "Frontend, backend, Soroban kontratları — hepsi GitHub'da. İnceleyebilir, fork'layabilirsin.", Icon: Github },
  ];

  return (
    <section className="section-birik border-t border-edge">
      <Reveal className="max-w-3xl">
        <span className="chip-birik mb-6">Güvenlik</span>
        <h2 className="display text-huge">
          Şifresiz. Denetimli.<br />
          <span className="text-birik">Açık.</span>
        </h2>
        <p className="mt-6 text-xl text-bone/70">
          Güvenlik bir pazarlama ifadesi değil. Soroban kontratı, SIWS oturumu, non-custodial
          mimari, tüm kod açık — kontrol sende.
        </p>
      </Reveal>

      <Stagger className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4" delay={0.08}>
        {items.map((t) => (
          <StaggerItem key={t.title}>
            <div className="card-birik h-full">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-birik/10 text-birik">
                <t.Icon size={28} strokeWidth={2} />
              </div>
              <h3 className="display text-xl">{t.title}</h3>
              <p className="mt-2 text-sm text-bone/70">{t.copy}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 9 — FAQ                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function FAQ() {
  const items = [
    {
      q: 'Stellar nedir? Neden Stellar?',
      a: "Stellar, 2014'ten beri çalışan düşük ücretli, hızlı bir ödeme blockchain'i. 5 saniyede finality, işlem başına 0,00001 XLM ücret. Kripto varlıklar, stablecoin'ler ve gerçek-dünya değer transferleri için tasarlandı.",
    },
    {
      q: 'Freighter cüzdan nedir? Nasıl kurarım?',
      a: "Freighter, Stellar'ın resmi tarayıcı uzantısı cüzdanı — MetaMask'ın Ethereum tarafındaki karşılığı. Chrome/Firefox/Edge'e freighter.app'ten ücretsiz kurarsın. 1 dakika sürer, Birik direkt bağlanır.",
    },
    {
      q: 'XLM satın almam gerekli mi? Sadece TRY ile kullanılır mı?',
      a: "Başlamak için az miktar XLM lazım (işlem ücretleri ve minimum hesap bakiyesi için). TRY çevirisi için BtcTurk, Paribu ya da BinanceTR kullanabilirsin. Grup harcamalarını TRY değeri olarak takip ediyoruz — XLM sadece arka planda settlement için.",
    },
    {
      q: 'Arkadaşlarımın Birik hesabı olması gerekli mi?',
      a: 'Grupta olmak için evet, ama çok basit: grup linkini QR olarak paylaşıyorsun, taradıkları anda katılım akışı başlıyor. Freighter kurulumu + Birik onboarding toplam 3 dakika.',
    },
    {
      q: 'Yapay zeka mı, akıllı kontrat mı?',
      a: "Akıllı kontrat. Birik'in core logic'i Soroban (Stellar'ın Rust-yazılı akıllı kontrat platformu) üzerinde çalışıyor. Gruplar, bakiyeler, settlement — hepsi blockchain'de değiştirilemez kayıt. AI sadece harcama kategorilendirme/insight için var (opsiyonel).",
    },
    {
      q: 'Birik bir banka mı? Param güvende mi?',
      a: "Hayır, Birik banka değil. Non-custodial bir akıllı kontrat arayüzü — senin varlıklarını hiçbir zaman tutmaz. Tüm değer kendi Freighter cüzdanında kalır. Kontrat açık kaynak, denetimli. Geleneksel banka değil, gerçek anlamda kriptografik kontrol senin elinde.",
    },
  ];

  const [open, setOpen] = useState(0);

  return (
    <section id="sss" className="section-birik border-t border-edge">
      <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <span className="chip-birik mb-6">SSS</span>
          <h2 className="display text-huge">
            Merak ettiklerin,<br /><span className="text-birik">net cevaplar.</span>
          </h2>
          <p className="mt-6 text-lg text-bone/70">
            Aradığını bulamadın mı? Uygulama içinden 7/24 destek ekibine yaz.
          </p>
        </Reveal>

        <Reveal delay={0.15} className="divide-y divide-edge border-y border-edge">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-8 py-6 text-left transition-colors hover:text-birik"
                  aria-expanded={isOpen}
                >
                  <span className="display text-xl md:text-2xl">{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full border border-edge"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </motion.span>
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: isOpen ? 'auto' : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 pr-12 text-lg text-bone/70">{item.a}</p>
                </motion.div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Section 10 — Final CTA                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function FinalCTA({ onConnect, freighterAvailable, connecting, onTryDemo }: HeroCtaProps) {
  const { t } = useI18n();
  return (
    <section id="indir" className="section-birik">
      <Reveal>
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-brick bg-birik p-10 text-ink md:p-20"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-ink/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-ink/10" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <h2 className="display text-mega">
                İlk grubunu<br />3 dakikada aç.
              </h2>
              <p className="mt-6 max-w-xl text-xl text-ink/80">
                Freighter cüzdanını bağla, arkadaşlarını davet et, harcamayı böl. Hepsi bu kadar.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onConnect}
                disabled={!freighterAvailable || connecting}
                className="flex items-center gap-4 rounded-brick bg-ink p-5 text-bone transition-all hover:bg-ink/90 disabled:opacity-50"
              >
                <Link2 size={28} />
                <div className="text-left">
                  <div className="text-xs opacity-70">{freighterAvailable ? 'Freighter ile' : 'Freighter eksik'}</div>
                  <div className="font-display text-xl">
                    {connecting ? 'Bağlanıyor…' : freighterAvailable ? (t('header.connect_wallet') || 'Cüzdanı Bağla') : 'Önce kur'}
                  </div>
                </div>
              </button>

              {onTryDemo && (
                <button
                  type="button"
                  onClick={onTryDemo}
                  className="flex items-center gap-4 rounded-brick border-2 border-ink/20 bg-transparent p-5 text-ink transition-all hover:bg-ink/5"
                >
                  <Globe size={28} />
                  <div className="text-left">
                    <div className="text-xs opacity-70">Cüzdansız</div>
                    <div className="font-display text-xl">Demo'yu dene</div>
                  </div>
                </button>
              )}

              <p className="mt-2 text-center text-xs text-ink/60">
                Non-custodial · Open source · Soroban denetimli
              </p>
            </div>
          </div>
        </motion.div>
      </Reveal>
    </section>
  );
}
