# Ana sayfa fotoğrafları

Sitede 6 fotoğraf alanı var. Bir alanın fotoğrafı tanımlı değilse yerine marka renklerinde dekoratif bir görsel çizilir.

## Nasıl eklenir

1. Fotoğrafı WEBP'ye çevirip (kalite ~80, ~100–200 KB) `public/images/` klasörüne aşağıdaki dosya adıyla koyun. Orijinaller `archive/foto-orijinal/` içinde.
2. `src/lib/landing-content.ts` içindeki `PHOTOS` listesinde ilgili satırı güncelleyin:
   ```ts
   hero: '/images/hero.webp',
   ```
3. Commit + push. Vercel fotoğrafları otomatik olarak küçültüp optimize eder.

**Not:** Gerçek fotoğraflar (kendi ekibiniz, aracınız, yaptığınız işler) yapay zekâ görsellerinden her zaman daha güven verir. Yapay zekâ görsellerini geçici olarak kullanıp zamanla gerçekleriyle değiştirmenizi öneririm. Yapay zekâ görsellerinde logo, yazı veya plaka olmamasına dikkat edin.

## Ortak stil (her prompta ekleyin)

> Photorealistic professional photograph, natural light, shallow depth of field, warm color grading with subtle red and orange tones, dark moody background, no text, no logos, no watermarks, Turkish workers in Istanbul.

## Fotoğraflar

| Alan | Dosya | Oran | Nerede görünür |
|---|---|---|---|
| `hero` | `hero.webp` | 4:5 dikey, en az 1200×1500 | Ana başlığın yanındaki büyük görsel |
| `baca` | `baca.webp` | 16:9, en az 1600×900 | Baca Temizliği kartı |
| `sondurme` | `sondurme.webp` | 16:9, en az 1600×900 | Yangın Söndürme Sistemleri kartı |
| `itfaiye` | `itfaiye.webp` | 16:9, en az 1600×900 | İtfaiye Raporu kartı |
| `egitim` | `egitim.webp` | 16:9, en az 1600×900 | İSG ve Yangın Eğitimi kartı |
| `ekip` | `ekip.webp` | 4:3, en az 1600×1200 | "Neden Ziva?" bölümü |

### hero
> A fire safety technician in a dark navy work uniform and safety helmet inspecting a red fire sprinkler pipe system in a modern commercial building ceiling, looking up confidently, warm dramatic side lighting, vertical 4:5 composition with empty dark space at the bottom.

### baca
> A professional chimney sweep in protective gear and mask cleaning a large stainless steel industrial kitchen exhaust hood and duct with brushes, restaurant kitchen at night, warm light, 16:9 wide composition.

### sondurme
> Close-up of red fire suppression system equipment in a clean technical room: red sprinkler pipes, pressure gauges and valves, a technician's gloved hand adjusting a valve, warm red tones, 16:9 wide composition.

### itfaiye
> A fire safety inspector holding a clipboard and checking a wall-mounted fire hose cabinet and fire extinguisher in a shopping mall service corridor, professional and focused, 16:9 wide composition.

### egitim
> Fire safety training for office employees in an outdoor parking area: an instructor demonstrating how to use a red fire extinguisher on a small controlled training fire, employees in reflective vests watching, daytime, 16:9 wide composition.

### ekip
> A team of four fire safety technicians in matching dark work uniforms standing confidently next to a white service van in front of a commercial building in Istanbul, golden hour light, 4:3 composition.
