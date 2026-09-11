# E-BDAD (E-Ticaret Davranış Analitiği ve Karar Destek Sistemi)
## Sistem Mimarisi ve Algoritma Referans Kılavuzu

E-BDAD, e-ticaret platformlarındaki kullanıcı davranışlarını analiz eden, ürün kataloglarındaki sürtünme (friction) noktalarını makine öğrenimi modelleri ile tespit eden ve bunları otomatik olarak operasyonel aksiyonlara dönüştüren akıllı bir karar destek sistemidir.

### 1. Temel Algoritmalar ve Rolleri

#### A. LightGBM (Dönüşüm Tahmin Modeli)
- **Görev:** Ürünün özelliklerine (fiyat, görsel sayısı, açıklama uzunluğu, varyant, beden tablosu varlığı) ve tarihsel metriklerine bakarak bir ürünün satışa dönüşme (Conversion Rate - CR) olasılığını tahmin eder.
- **Kullanım Yeri:** Her ürün için baz (baseline) dönüşüm skorunu hesaplar.

#### B. SHAP (Kök Neden ve Sürtünme Tespiti)
- **Görev:** LightGBM'in tahminini etkileyen özellikleri izole ederek her bir özelliğin dönüşüme olan marjinal katkısını (SHAP değerini) hesaplar.
- **Kural:** Eğer bir özelliğin SHAP değeri **Tau eşiğinden (örn. -0.05)** daha düşük (negatif) ise, bu özellik ürünün dönüşümünü olumsuz etkileyen bir "Sürtünme (Friction)" olarak işaretlenir. Örneğin görsel sayısının az olması negatif SHAP üretiyorsa sistem "Yetersiz Görsel" uyarısı verir.

#### C. K-Means (Müşteri Segmentasyonu)
- **Görev:** Kullanıcı oturumlarını (session) analiz ederek farklı müşteri davranış gruplarını (örn: Kampanya Avcıları, İade Eğilimliler, Hızlı Alıcılar) tespit eder. 
- **Kullanım Yeri:** Aksiyonların veya pazar analizlerinin farklı kitleler (personalar) bazında sınıflandırılmasını sağlar.

#### D. DiD - Difference-in-Differences (Nedensel Ekonometrik Etki Ölçümü)
- **Görev:** Bir ürüne müdahale (aksiyon) yapıldığında, pazarın genel organik büyümesini (veya düşüşünü) ayrıştırarak aksiyonun getirdiği NET (Causal) Uplift'i hesaplar.
- **Formül:** `DiD = (Treated_Post - Treated_Pre) - (Control_Post - Control_Pre)`
- **Kullanım Yeri:** Aksiyon uygulandıktan sonra elde edilen ek ciroyu (Atfedilen Ciro) ve net dönüşüm artışını raporlar.

### 2. Kural Motoru ve Eşikler
Sistem, SHAP çıktılarını okunabilir iş kararlarına dönüştürmek için belirli kurallara dayanır:
- **Görsel Sayısı (image_count):** Genellikle 3'ün altındayken negatif SHAP üretir. Tavsiye: "Görsel ekleyin".
- **Fiyat (base_price):** Kategori ortalamasından çok yüksekse negatif SHAP üretir. Tavsiye: "Fiyatı optimize edin".
- **Açıklama (description_word_count):** Çok kısa (örn: < 20 kelime) olduğunda negatif SHAP üretir. Tavsiye: "Açıklamayı detaylandırın".
- **Beden Tablosu (has_size_chart):** Giyim kategorisinde 0 (Yok) ise yüksek iade riski ve düşük dönüşüm üretir.
- **SHAP Tau Threshold:** Varsayılan -0.05'tir. Sistem sadece bu değerin altında negatif etki yaratan kusurları aksiyon olarak sunar.

### 3. Operasyonel Süreçler
- **BEKLEYEN:** Modelin tespit ettiği sürtünme kaynaklı sorunlar.
- **UYGULANDI:** Operatör tarafından kabul edilen iyileştirme adımları. 14 günlük DiD ölçüm penceresi (window) başlar.
- **ÇÖZÜLDÜ:** Ölçüm süresi dolan, net finansal katkısı hesaplanan aksiyonlar.
- **REDDEDİLDİ:** Operatörlerin spesifik iş kuralları gereği (örneğin "Fiyat sabit, değiştirilemez") kabul etmediği öneriler.
