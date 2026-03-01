# StellarSplit — Security Notes

Bu belge kontrat ve uygulama ile ilgili bilinen riskleri ve “demo only” davranışları özetler. Production / mainnet öncesi bu maddelerin gözden geçirilmesi önerilir.

---

## 1. settle_group ve mint çağrısı (Kontrat)

**Davranış:** `settle_group` içinde, gerçek XLM transferleri tamamlandıktan sonra `group.token` adresine `invoke_contract` ile `mint(settler, 100)` çağrısı yapılıyor. Amaç settler’a “reward” vermek.

**Risk:** Stellar’da **XLM Native SAC** (Stellar Asset Contract) bir `mint` fonksiyonuna sahip değildir. Grup XLM ile oluşturulduğunda `group.token` = XLM SAC olur; bu durumda `mint` çağrısı **başarısız olur** ve tüm `settle_group` işlemi revert eder. Sonuç: XLM ile açılan gruplarda settle pratikte tamamlanamaz.

**Mevcut durum:** Hackathon / demo senaryosunda bazen özel bir “reward token” contract’ı (mint’i olan) kullanılıyor olabilir; bu durumda sorun görünmeyebilir. **Gerçek XLM-only kullanımda** (testnet/mainnet) bu blok panic/revert üretir.

**Öneri (mainnet öncesi):**

- **Seçenek A:** Mint’i yalnızca ayrı bir “reward token” contract’ı ile sınırla; `group.token` XLM SAC ise mint çağrısını **yapma** (veya kontrat tarafında “reward token” adresi ayrı tutulup sadece o adres için mint çağrılsın).
- **Seçenek B:** Mint blokunu tamamen kaldır; reward mantığını başka bir mekanizma veya sonraki kontrat sürümüne taşı.
- **Seçenek C:** Mint’i opsiyonel yap (ör. grup oluşturulurken “reward token” adresi verilmezse mint atlanır).

Şu anki kodda değişiklik yapılmadı; risk dokümante edildi. Mainnet veya XLM-only production kullanımından önce yukarıdaki seçeneklerden biri uygulanmalıdır.

---

## 2. Guardian / Recovery (Kontrat)

Guardian ve recovery fonksiyonları (`set_guardians`, `initiate_recovery`, `approve_recovery`) mevcut; frontend’te tam entegre değil (mock/localStorage). Kontrat tarafında geçerli threshold ve guardian listesi kontrolleri yapılıyor; edge case’ler için unit test eklenmesi önerilir (bkz. SKILLS-IMPLEMENTATION-PLAN.md Faz 2.1).

---

## 3. Genel

- Tüm yazma işlemleri ilgili adresin `require_auth` ile yetkilendirilmesine bağlı.
- Input validasyonları (grup adı, üye sayısı, amount > 0, split_among üyelik) kontrat içinde yapılıyor.
- TTL (storage bump) kullanımı mevcut; süreler `storage.rs` içinde tanımlı.

Detaylı madde listesi için `docs/SECURITY-CHECKLIST.md` kullanılabilir.
