# Plan: Frontend A-Items — 8 Özellik

## Mevcut Durum (Keşif Özeti)

| Alan | Gerçek Durum |
|------|-------------|
| Onboarding | `OnboardingTour.tsx` = Joyride overlay turu (hackathon demo), gerçek wizard yok |
| Empty States | Minimal — kategori yok, boş liste sadece "yok" gösteriyor |
| Skeletons | `Skeleton.tsx` var (2 varyant), `SkeletonShimmer` var ama inconsistent kullanım |
| Insights/Charts | `InsightsPanel.tsx` mevcut — DonutChart + ActivityFeed, recharts yok |
| Balance Widget | GroupDetail'de hiç summary header yok |
| Mobile/BottomSheet | Yok — tüm modaller fixed-position |
| Transaction History | `ExpensesTab.tsx` — search + category filtresi var, date/payer/sort yok |
| Settings | `SettingsPage.tsx` var — Profile/Appearance/Privacy mevcut, Notifications/Webhooks yok |

---

## Dosya Sahipliği (çakışma yok)

| Agent | Dosyalar |
|-------|---------|
| **α** | `InsightsPanel.tsx` + yeni recharts paneller |
| **β** | `SettingsPage.tsx` |
| **γ** | Yeni: `NewUserWizard.tsx`, `EmptyState.tsx`, `BottomSheet.tsx`, `Skeleton.tsx` (yeni varyantlar) + `Dashboard.tsx` |
| **δ** (wave 2) | `GroupDetail.tsx` (balance widget + skeleton + bottom sheet entegrasyon) |
| **ε** (wave 2) | `ExpensesTab.tsx` (gelişmiş filtreler + EmptyState) |

---

## F1 — Onboarding Wizard (Agent γ)

### Yeni: `frontend/src/components/NewUserWizard.tsx`
- 4 adımlı modal wizard (framer-motion AnimatePresence ile slide)
- Tetikleyici: Dashboard'da `groups.length === 0 && !localStorage.getItem('wizard_v1_done')`
- Adımlar: Welcome → Create Group (form) → Invite (copy link) → Done (confetti)
- Mevcut Stepper pattern'ini taklit et
- Tamamlanınca `wizard_v1_done` localStorage'a yaz

### Değişiklik: `Dashboard.tsx`
- `NewUserWizard` import et
- Gruplar yüklendiğinde ve boşsa wizard göster

---

## F2 — Empty States (Agent γ)

### Yeni: `frontend/src/components/EmptyState.tsx`
```tsx
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}
```
- Framer Motion: icon hafif yüzer (`y: [0, -8, 0]`, `duration: 3s`, `repeat: Infinity`)
- Tasarım: `bg-card/30 border border-white/5 rounded-3xl p-12` — mevcut kart stiliyle uyumlu
- Varyant kullanım yerleri:
  - **Dashboard** → grup yok: 🌍 "Henüz grup yok" + "Grup Oluştur" butonu  
  - **ExpensesTab** → harcama yok: 💸 "Harcama eklenmemiş" + "Harcama Ekle"
  - **BalancesTab** → herkes borçsuz: ✅ "Tüm hesaplar kapandı" (confetti style)

### Değişiklik: `Dashboard.tsx`
- Yükleme sonrası `groups.length === 0` durumunda `<EmptyState>` göster

---

## F3 — Loading Skeletons (Agent γ)

### Değişiklik: `frontend/src/components/Skeleton.tsx`
Mevcut `GroupCardSkeleton` ve `StatSkeleton`'a ek:
- `ExpenseRowSkeleton` — avatar + 2 satır text + sağda badge
- `MemberRowSkeleton` — avatar + isim + balance chip
- `BalanceCardSkeleton` — büyük rakam + alt label
- `ChartSkeleton` — kare placeholder, shimmer animasyonu

### Değişiklik: `Dashboard.tsx`  
- Grup listesi yüklenirken `[...Array(3)].map(() => <GroupCardSkeleton>)` → zaten var mı? kontrol et, yoksa ekle

---

## F4 — InsightsPanel Geliştirilmiş Grafikler (Agent α)

### Değişiklik: `frontend/src/components/InsightsPanel.tsx`
Mevcut DonutChart'ı koru, recharts ile 3 yeni panel ekle:

**Panel 1 — Kategori Dağılımı (recharts PieChart)**
- Mevcut `DonutChart`'ı `<ResponsiveContainer><PieChart>` ile değiştir veya yanına ekle
- Renkler: `CATEGORY_COLORS` map mevcut, aynısını kullan
- Tooltip: `{ category: 'Yemek', amount: '42.5 XLM', count: 5 }`

**Panel 2 — Kişi Bazlı Harcama (recharts BarChart)**
- X ekseni: truncateAddress(member)
- Y ekseni: toplam harcama tutarı (XLM)
- Her bar: `expenses.filter(e => e.payer === member).reduce(sum)`
- Renk: CSS var `hsl(var(--chart-1))`

**Panel 3 — Zaman Çizelgesi (recharts AreaChart)**
- X ekseni: gün (son 30 gün veya tüm süre)
- Y ekseni: günlük kümülatif harcama
- `expenses` zaten `createdAt` field'ı olan `backendExpenses` olarak mevcut
- Fallback: Soroban expenses'da timestamp olmadığında panel gizle

**CSS değişkenleri**: Mevcut `hsl(var(--chart-1))` ... `hsl(var(--chart-5))` pattern kullan

### Kritik not
`InsightsPanel.tsx` kendi `Expense` interface'ini tanımlıyor (BackendExpense ile uyumsuz).
Backend'den gelen `backendExpenses` → `GroupDetail.tsx`'de `activeExpenses` olarak pass ediliyor.
`createdAt` field'ı sadece backend expense'larda var — timeline paneli bu kontrolü yapmalı.

---

## F5 — Group Balance Widget (Agent δ)

### Değişiklik: `frontend/src/components/GroupDetail.tsx`
Tab navigation'ın ÜSTÜNE compact balance summary ekle:

```tsx
// tab navigation'dan önce (~line 500-ish)
<GroupBalanceSummary
  walletAddress={walletAddress}
  totalExpenses={activeExpenses.length}
  myBalance={activeBalances.get(walletAddress) ?? 0}
  currencyLabel={currencyLabel}
  xlmUsd={xlmUsd}
/>
```

### Yeni inline bileşen (GroupDetail içinde veya ayrı dosya)
3 stat card yatay sıra:
- **Grup Toplam**: `expenses.reduce(sum)` 
- **Benim Payım**: walletAddress bazlı hesap
- **Net Bakiye**: `myBalance > 0 ? "Alacaklısın" : "Borçlusun"` — renk kodlu

Tasarım: `grid grid-cols-3 gap-3 mb-4` — mevcut kart stiliyle (bg-card/50, border-white/5)

---

## F6 — Mobile BottomSheet (Agent δ)

### Yeni: `frontend/src/components/BottomSheet.tsx`
```tsx
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}
```
- Framer Motion `drag="y"`, `dragConstraints={{ top: 0 }}`
- `dragElastic: 0.2`, `onDragEnd: if velocity.y > 300 → onClose()`
- Başlıkta sürükleme tutacağı (handle bar)
- Arka plan overlay: `motion.div` opacity 0→0.6
- Sadece mobil: `md:hidden` → desktop'ta normal modal kullan

### Değişiklik: `frontend/src/components/GroupDetail.tsx`
"Add Expense" modal (şu an fixed-center) → mobilde BottomSheet'e çevir:
```tsx
// isMobile ? <BottomSheet open={showAdd}> : <div className="fixed inset-0 flex items-center">
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
```

---

## F7 — Gelişmiş Transaction History (Agent ε)

### Değişiklik: `frontend/src/components/tabs/ExpensesTab.tsx`

Mevcut durum: search (description) + category dropdown → TEK SATIR

Yeni: **Collapsible Filter Panel** (ChevronDown toggle ile açılır)

**Yeni filtreler:**
1. **Tarih Aralığı** — 2 date input (`from` / `to`), `createdAt` field var
2. **Payer** — select dropdown, üyelerden oluşur (`expenses.map(e => e.payer)` unique)
3. **Miktar Aralığı** — min/max number input (XLM cinsinden)
4. **Göster:** Active only / Cancelled / Tümü — toggle group
5. **Sıralama:** En Yeni / En Eski / En Yüksek / En Düşük

**`filteredExpenses` logic genişletme:**
```typescript
const filteredExpenses = expenses
  .filter(e => !filterCategory || e.category === filterCategory)
  .filter(e => e.description.toLowerCase().includes(filterSearch.toLowerCase()))
  .filter(e => !filterPayerAddr || e.payer === filterPayerAddr)
  .filter(e => !filterDateFrom || new Date(e.createdAt) >= filterDateFrom)
  .filter(e => !filterDateTo || new Date(e.createdAt) <= filterDateTo)
  .filter(e => filterShowCancelled ? true : e.status !== 'CANCELLED')
  .sort(sortFn)
```

**Not:** `e.createdAt` sadece backendExpenses'da var. Soroban expenses'da yoksa date filter gizle.

**Active filter sayacı badge:** "3 filtre aktif" göstergesi — açma butonunun yanında

---

## F8 — Settings Enhancement (Agent β)

### Değişiklik: `frontend/src/components/SettingsPage.tsx`

Mevcut: Profile, Appearance, Language/Motion, Data & Privacy

**Yeni section ekle: "Bildirimler"**
- Push toggle: `usePushSubscription` hook'u çağır (zaten oluşturduk!)  
- "Enable Push Notifications" switch → `subscribe()` çağrısı
- İzin durumu göster: ✅ Aktif / ❌ Kapalı / ⏳ Desteklenmiyor

**Yeni section ekle: "Webhook Entegrasyonları"**
- Discord Webhook URL — text input + "Test Gönder" butonu
- Slack Webhook URL — text input + "Test Gönder"  
- Test butonu: `POST /api/discord-webhook` (backend) veya frontend'den doğrudan POST
- Mevcut localStorage'daki `webhook_${groupId}` key'i group-level — bu settings-level olacak (`webhook_global_discord`)
- Kaydet butonu → localStorage'a yaz

---

## Uygulama Dalgaları

### Dalga 1 — Paralel (çakışma yok)
```
Agent α → InsightsPanel.tsx
Agent β → SettingsPage.tsx
Agent γ → Dashboard.tsx + yeni: NewUserWizard.tsx + EmptyState.tsx + BottomSheet.tsx + Skeleton.tsx
```

### Dalga 2 — Paralel (Dalga 1 bittikten sonra)
```
Agent δ → GroupDetail.tsx  (F5 balance widget + F6 BottomSheet entegre + F3 skeleton apply)
Agent ε → ExpensesTab.tsx  (F7 gelişmiş filtreler + F2 EmptyState apply)
```

### Doğrulama (her dalga sonrası)
```bash
cd frontend && npm run build
cd backend && npx tsc --noEmit
```

---

## Tasarım Kısıtları (Mevcut Sistemle Uyumluluk)
- **Renkler**: CSS var (`hsl(var(--chart-1..5))`, `bg-card/50`, `border-white/5`)
- **İkonlar**: Yalnızca `lucide-react`
- **Animasyon**: Yalnızca `framer-motion` + mevcut Tailwind animasyonları
- **Dark/Light**: `dark:` prefix ile her iki tema desteği
- **i18n**: `t()` fonksiyonu kullan, Türkçe/İngilizce fallback
- **Responsive**: `sm:`, `md:` breakpoints, mobile-first
