# E-BDAD (E-Ticaret Davranış Analitiği ve Karar Destek Sistemi)

Bu proje, e-ticaret platformlarındaki kullanıcı davranışlarını analiz eden, ürün kataloglarındaki sürtünme (friction) noktalarını makine öğrenimi modelleri ile tespit eden ve bunları otomatik olarak operasyonel aksiyonlara dönüştüren akıllı bir karar destek sistemidir.

## Başlangıç Kılavuzu

Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyebilirsiniz.

### 1. Gereksinimleri Yükleyin

Proje, Python bağımlılıklarını yönetmek için `requirements.txt` dosyasını kullanır. Terminalinizi veya komut satırınızı açın, projenin içindeki `ebdad-core` dizinine gidin ve gerekli paketleri yükleyin:

```bash
cd ebdad-core
pip install -r requirements.txt
```

*(Not: Bu işlemi sanal bir ortamda (virtual environment) yapmanız önerilir.)*

### 2. Sistemi Başlatın

Bağımlılıklar yüklendikten sonra, sistemi tek bir komutla başlatabilirsiniz. Bu komut hem testleri çalıştıracak hem de FastAPI sunucusunu ayağa kaldıracaktır:

```bash
python run_system.py
```

Sistem başarıyla başlatıldığında terminalde aşağıdaki gibi bir çıktı göreceksiniz:
```text
==================================================
System is successfully running!
Dashboard available at: http://127.0.0.1:8000
==================================================
```

### 3. Arayüze Erişin

Sunucu çalışmaya başladıktan sonra tarayıcınızı açın ve [http://127.0.0.1:8000](http://127.0.0.1:8000) adresine giderek kontrol paneline (dashboard) erişin.

## Proje Yapısı

- `ebdad-core/`: Projenin ana kaynak kodlarının, testlerin ve yapılandırma dosyalarının bulunduğu dizindir.
  - `requirements.txt`: Python paket bağımlılıkları.
  - `run_system.py`: Projeyi başlatmak için kullanılan ana script.
  - `SYSTEM_ARCHITECTURE.md`: Sistemin detaylı mimarisi ve çalışan algoritmalar hakkında dokümantasyon.
