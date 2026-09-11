# E-BDAD Yönetici Sunumu - Konuşma Metni Dökümü (14 Slayt - Ar-Ge & Bitirme Projesi Vizyonu)

## Slayt 1: Kapak & Misyon Bildirisi
Saygıdeğer hocalarım ve değerli katılımcılar, hoş geldiniz. Bugün sizlere e-ticaret sektöründe devasa bir analitik kör noktayı çözmek üzere, uçtan uca bizzat tasarlayıp geliştirdiğim bağımsız Ar-Ge ve Yazılım Mühendisliği bitirme projem olan E-BDAD sistemini sunacağım.

## Slayt 2: Neden Yaptım? (İş Problemi & Korelasyon Yanılsaması)
E-ticaret ekosisteminde gözlemlediğim en büyük sorun sahte başarı yanılsaması, yani korelasyon körlüğüdür. Pazar %20 büyürken bir ürün %5 büyüyorsa bu başarı değil, gizli bir ciro erozyonudur. On binlerce ürünlük kataloglarda manuel A/B testi yapılamadığı için, hatalı fiyat ve görsel kararları genel büyümenin ardına saklanarak büyük zararlar yaratmaktadır. Bu projeyi tam da bu kaosu çözmek için tasarladım.

## Slayt 3: Projenin Amacı ve Çözüm Hipotezi (Kapalı Çevrim Mimari)
Bu projeyi tasarlarken temel motivasyonum; salt bir veri seti üzerinde model eğitip bırakmak değildi. Endüstri standartlarında yaşayan, kapalı çevrim bir karar mimarisini baştan sona inşa etmekti. Sistem veriyi çeker, makine öğrenmesiyle teşhis eder, insan onayına sunar, DiD yöntemiyle matematiğini doğrular ve LLM ile kendi kararlarını denetler.

## Slayt 4: Veri Seti Mimarisi ve Çözümleme
Sistemimin beslendiği veri seti temelde ikiye ayrılıyor. Bir tarafta fiyat ve görsel sayısı gibi algoritmik olarak müdahale edilebilen Katalog Nitelikleri, diğer tarafta müşterinin buna verdiği gerçek davranışsal tepkiyi ölçen Telemetri verileri var. Ekranda oluşturduğum simülatör verisinden bir kesit görüyorsunuz.

## Slayt 5: Veri Madenciliği Stratejisi
Buradaki veri madenciliği stratejim nedensellik bağı üzerine kuruludur. Katalog özellikleri bağımsız değişkenimizdir; onlarla sistemi simüle ederiz. Telemetri ise bağımlı değişkendir. Tabi ki ham trafiği doğrudan kullanmadım; botları ve sahte tıklamaları algoritmik bir filtreyle ayıklayarak saf müşteri dönüşüm oranlarına ulaştım.

## Slayt 6: Hangi Teknolojileri Neden Tercih Ettim? (Hibrit Tech Stack)
Kullandığım bu Tech Stack'i, yani DuckDB, PostgreSQL, FastAPI ve makine öğrenmesi araçlarını rastgele seçmedim. Hem büyük veri analitiğini hem de finansal işlem güvenliğini eşzamanlı deneyimlemek için bu mimaride hibrit kurguladım. Veri bilimi için Python, in-memory hız için DuckDB, finansal veri bütünlüğü için PostgreSQL ve asenkron servis için FastAPI kullandım.

## Slayt 7: Makine Öğrenmesi Modeli (LightGBM)
Tahmin modeli olarak derin öğrenme yerine LightGBM'i tercih ettim. Çünkü e-ticaretin karmaşık ve bol eksikli tablosal verilerinde ağaç tabanlı yapılar çok daha performanslı çalışıyor. Modelin ürettiği ham istatistiksel skoru Sigmoid fonksiyonundan geçirerek yüzde cinsinden satın alma olasılığına çeviren bir ardışık düzen kurguladım.

## Slayt 8: Model Açıklanabilirliği (XAI) ve Tau Eşiği
Geliştirdiğim bu sistemin en kritik Ar-Ge özelliklerinden biri modeli kara kutu olmaktan çıkarmasıdır. Oyun teorisi tabanlı SHAP ile her bir fiyatın veya metnin olasılığa olan marjinal katkısını ölçüyorum. Satın alma ihtimalini tek başına %5'ten fazla düşüren her parametreyi, müşterinin ayağına takılan bir 'Sürtünme' olarak saptıyorum.

## Slayt 9: Algoritmik Aksiyon ve Kural Motoru
Sürtünmeyi tespit ettikten sonra sistem bunu otonom bir iş kuralına dönüştürüyor. Ancak binlerce ürün için hangi görevin önce yapılacağı sorusunu çözmek adına bir Öncelik Puanı algoritması geliştirdim. Aylık oturum ve birim fiyatı tahmini uplift ile çarparak, en yüksek finansal etkiye sahip ürünleri kuyruğun en önüne alıyorum.

## Slayt 10: Operasyonel Güvenlik: "Human-in-the-Loop" Mimarisi
Tam otonom sistemler e-ticarette iflas riski taşır. Çünkü yapay zeka kargo kısıtlarını veya tedarikçi sözleşmelerini bilemez. Bu nedenle mimariyi 'Human-in-the-Loop' yapısında kurguladım. Sistem teşhis edip öneriyor, insan onaylıyor. Üstelik finansal kâr marjının altındaki öneriler algoritmik olarak engelleniyor ve ekrana dahi yansımıyor.

## Slayt 11: Ekonometrik Doğrulama: Difference-in-Differences (DiD)
Mühendislik projemin en güçlü kası, yaptığı işin başarısını ekonometrik olarak ispatlamasıdır. Müdahale edilen ürüne en çok benzeyen, müdahale edilmemiş doğal bir 'ikiz' buluyorum. DiD (Difference-in-Differences) formülü sayesinde pazarın genel dalgalanmasını eliyor ve sağlanan artışın tamamen bizim sistemimizden kaynaklandığını kanıtlıyorum.

## Slayt 12: Risk Yönetimi: Negatif Vaka ve Rollback Mekanizması
Tabi ki sistemin önerdiği kararların insan tarafından uygulandıktan sonra ters tepme ihtimali de var. Algoritma, P-2041 örneğinde olduğu gibi bir güven erozyonu ve düşüş tespit ederse, sistem bunu derhal raporlar. Geliştirdiğim Rollback mekanizması sayesinde hatalı parametreler tek tıkla eski haline döndürülür ve ciro kaybı anında kesilir.

## Slayt 13: Bilişsel Denetçi (Llama 3.2) ve What-If Simülatörü
İleri düzey bir analiz için What-If simülatörü geliştirdim. Canlıya almadan önce parametre değiştirip sonucunu test edebiliyoruz. Ve en kritik Ar-Ge modülü: Yerel yapay zekamız Llama 3.2, operatörlerin reddettiği kararları inceleyerek sistemin kendi kendine öğrenmesini ve iş kurallarını düzeltmesini sağlıyor.

## Slayt 14: Sektörel Değer & Canlı Demoya Geçiş
Sonuç olarak bu proje; e-ticaret analitiğindeki devasa bir kör noktayı hedef alan, tahmin yerine ispat sunan uçtan uca kapalı çevrim bir mühendislik sistemidir. Dinlediğiniz için teşekkür ederim. Şimdi geliştirdiğim tüm bu algoritmik mimariyi ve veri akışını canlı demo üzerinde çalıştırarak göstereceğim.
