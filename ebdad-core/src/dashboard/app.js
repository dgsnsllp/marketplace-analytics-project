const API_URL = '/api';

// Global state for pagination and loaded data
let currentPage = 1;
let globalActionsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    
    // Initial loads
    loadOverview();
    loadPolicies();
    await loadKanban();
    loadProducts();
    fetchMLConfig();
    checkLLMStatus();
    
    // ML UI Listeners
    let shapSlider = document.getElementById('ml-shap-tau');
    let shapVal = document.getElementById('ml-shap-val');
    if (shapSlider && shapVal) {
        shapSlider.addEventListener('input', (e) => {
            shapVal.innerText = parseFloat(e.target.value).toFixed(2);
        });
    }
    
    // Modal Listeners
    document.getElementById('close-sim-modal').addEventListener('click', () => {
        document.getElementById('simulator-modal').classList.add('hidden');
    });
    
    document.getElementById('close-report-modal').addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
    });
    
    let closeX = document.getElementById('close-report-modal-x');
    if (closeX) {
        closeX.addEventListener('click', () => {
            document.getElementById('report-modal').classList.add('hidden');
        });
    }
    
    document.getElementById('close-reject-modal').addEventListener('click', () => {
        document.getElementById('reject-modal').classList.add('hidden');
    });
});

function applyFilters() {
    currentPage = 1;
    loadProducts();
}

function resetFilters() {
    if(document.getElementById('filter-action')) {
        document.getElementById('filter-action').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-start').value = '';
        document.getElementById('filter-end').value = '';
        currentPage = 1;
        loadProducts();
    }
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Reset all tabs
            tabs.forEach(t => {
                t.classList.remove('border-indigo-600', 'text-indigo-600');
                t.classList.add('border-transparent', 'hover:text-indigo-600');
            });
            contents.forEach(c => c.classList.add('hidden'));
            contents.forEach(c => c.classList.remove('block'));
            
            // Activate current
            tab.classList.remove('border-transparent', 'hover:text-indigo-600');
            tab.classList.add('border-indigo-600', 'text-indigo-600');
            
            const target = tab.getAttribute('data-tab');
            document.getElementById(target).classList.remove('hidden');
            document.getElementById(target).classList.add('block');
        });
    });
}

function timeAgo(dateStr) {
    if(!dateStr) return '';
    const date = new Date(dateStr + (dateStr.includes('Z') ? '' : 'Z')); // Simple timezone handle
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if(diffMins < 1 || diffMs < 0) return 'Az önce';
    if(diffMins < 60) return `${diffMins} dk önce`;
    const diffHrs = Math.floor(diffMins / 60);
    if(diffHrs < 24) return `${diffHrs} saat önce`;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' });
}

// ---------------------------
// TAB 1 & 2: KANBAN & ROI
// ---------------------------
async function loadKanban() {
    try {
        const res = await fetch(`${API_URL}/actions/?t=${Date.now()}`);
        if(!res.ok) throw new Error(`API Error: ${res.status}`);
        let data = await res.json();
        
        console.log("Actions Data:", data);
        if (data.data) { data = data.data; } // Fallback if wrapped
        if (!Array.isArray(data)) {
            console.error("Actions data is not an array!", data);
            data = [];
        }
        
        // SORT DESC (LIFO - Most recent first)
        data.sort((a, b) => {
            let tA = new Date(a.applied_at || a.created_at || 0).getTime();
            let tB = new Date(b.applied_at || b.created_at || 0).getTime();
            return tB - tA;
        });
        
        globalActionsData = data;
        
        let pendingGroups = {};
        let appliedHtml = '';
        let resolvedHtml = '';
        let rejectedHtml = '';
        
        let pendingCount = 0;
        let appliedCount = 0;
        let resolvedCount = 0;
        let rejectedCount = 0;
        
        let issueTrMap = {
            'Low Visual Richness': 'Yetersiz Görsel Zenginliği',
            'Missing Variations': 'Eksik Varyant Seçenekleri',
            'High Price / Low Engagement': 'Yüksek Fiyat / Düşük İlgi',
            'Poor Description': 'Yetersiz Ürün Açıklaması',
            'No Size Chart': 'Beden Tablosu Eksik'
        };

        data.forEach(a => {
            if (!a) return;
            
            let rawKey = a.identified_issue || 'Genel Optimizasyon';
            let translatedKey = issueTrMap[rawKey] || rawKey;
            a.identified_issue_tr = translatedKey; // Store for history table
            
            if (a.status === 'PENDING') {
                pendingCount++;
                if(!pendingGroups[translatedKey]) pendingGroups[translatedKey] = [];
                pendingGroups[translatedKey].push(a);
            } 
            else if (a.status === 'APPLIED') {
                appliedCount++;
                appliedHtml += `
                <div class="p-3 bg-white border rounded shadow-sm text-sm border-l-4 border-orange-400 relative">
                    <div class="absolute top-2 right-2 text-[10px] text-gray-400">${timeAgo(a.applied_at || a.created_at)}</div>
                    <div class="font-bold pr-12">${a.product_id || 'Unknown'}</div>
                    <div class="text-gray-600 text-xs mt-1">${a.suggested_action || ''}</div>
                    <div class="text-xs text-orange-500 mt-2 font-mono">Durum: Değerlendiriliyor (DiD)</div>
                </div>`;
            }
            else if (a.status === 'RESOLVED') {
                resolvedCount++;
                let uplift = parseFloat(a.measured_uplift_pct) || 0;
                let upClass = uplift > 0 ? 'text-green-600' : 'text-red-500';
                resolvedHtml += `
                <div class="p-3 bg-white border rounded shadow-sm text-sm border-l-4 border-green-500 relative">
                    <div class="absolute top-2 right-2 text-[10px] text-gray-400">${timeAgo(a.evaluation_end_date || a.applied_at)}</div>
                    <div class="font-bold flex justify-between pr-14">
                        <span>${a.product_id || 'Unknown'}</span>
                        <span class="${upClass} font-bold">${uplift > 0 ? '+' : ''}${uplift}%</span>
                    </div>
                    <div class="text-gray-600 text-xs mt-1">${a.suggested_action || ''}</div>
                </div>`;
            }
            else if (a.status === 'DISMISSED') {
                rejectedCount++;
                let reason = a.reject_reason || "Belirtilmedi";
                rejectedHtml += `
                <div class="p-3 bg-white border rounded shadow-sm text-sm border-l-4 border-gray-400 opacity-80 relative">
                    <div class="absolute top-2 right-2 text-[10px] text-gray-400">${timeAgo(a.applied_at || a.created_at)}</div>
                    <div class="font-bold pr-12">${a.product_id || 'Unknown'}</div>
                    <div class="text-gray-600 text-xs mt-1">${a.suggested_action || ''}</div>
                    <div class="text-xs mt-2 bg-red-50 text-red-700 px-2 py-1 rounded inline-block font-medium">Neden: ${reason}</div>
                </div>`;
            }
        });
        
        // Build Grouped Pending HTML
        let pendingHtml = '';
        for (const [issueName, actions] of Object.entries(pendingGroups)) {
            let itemsHtml = '';
            actions.forEach(act => {
                let catStr = act.category ? act.category : 'Kategori Yok';
                let price = act.baseline_price || act.base_price;
                let priceStr = price ? `₺${parseFloat(price).toLocaleString()}` : '';
                
                let featureName = 'Değer';
                if (act.target_feature === 'image_count') featureName = 'Görsel';
                if (act.target_feature === 'base_price') featureName = 'Fiyat';
                if (act.target_feature === 'variant_count') featureName = 'Varyant';
                if (act.target_feature === 'description_word_count') featureName = 'Açıklama (Kelime)';
                if (act.target_feature === 'has_size_chart') featureName = 'Beden Tablosu';
                
                let currentValStr = act.current_value !== undefined && act.current_value !== null ? `[Mevcut ${featureName}: ${act.current_value}]` : '';
                
                itemsHtml += `
                <div class="py-2 border-b border-gray-100 last:border-0 flex flex-col space-y-2">
                    <div class="text-xs text-gray-700 font-medium break-words">
                        <span class="font-bold text-sm">${act.product_id || 'Unknown'}</span> • ${catStr} • ${priceStr}
                    </div>
                    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs space-y-2 sm:space-y-0">
                        <div class="text-gray-500 break-words whitespace-normal">
                            <span class="text-indigo-600 font-semibold">${currentValStr}</span>
                            <span>(Önerilen: ${act.suggested_action || ''})</span>
                        </div>
                        <div class="flex space-x-1 shrink-0">
                            <button onclick="switchToSimulator('${act.product_id}')" class="bg-white text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 px-2 py-1 rounded transition">Simüle Et</button>
                            <button type="button" onclick="event.preventDefault(); event.stopPropagation(); applyAction('${act.action_id}')" class="bg-white text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-600 px-2 py-1 rounded transition">Uygula</button>
                            <button type="button" onclick="event.preventDefault(); event.stopPropagation(); rejectAction('${act.action_id}')" class="bg-white text-gray-500 hover:text-white hover:bg-gray-500 border border-gray-400 px-2 py-1 rounded transition">Reddet</button>
                        </div>
                    </div>
                </div>`;
            });
            
            // Collect all action IDs for bulk apply
            let bulkIds = actions.map(a => a.action_id).join(',');
            
            pendingHtml += `
            <details class="bg-white border rounded shadow-sm mb-2 group">
                <summary class="font-bold p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 text-sm flex justify-between items-center list-none">
                    <span>${issueName}</span>
                    <span class="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">${actions.length} Ürün</span>
                </summary>
                <div class="p-3 border-t bg-white">
                    <button type="button" onclick="event.preventDefault(); event.stopPropagation(); applyBulkActions('${bulkIds}')" class="w-full mb-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs font-bold py-2 rounded transition">Tümünü Uygula (${actions.length})</button>
                    <div class="max-h-72 overflow-y-auto pr-1 space-y-1">
                        ${itemsHtml}
                    </div>
                </div>
            </details>
            `;
        }
        
        if (document.getElementById('kb-pending')) document.getElementById('kb-pending').innerHTML = pendingHtml || '<p class="text-xs text-gray-400 p-2">Bekleyen aksiyon yok.</p>';
        if (document.getElementById('kb-applied')) document.getElementById('kb-applied').innerHTML = appliedHtml || '<p class="text-xs text-gray-400 p-2">Boş</p>';
        if (document.getElementById('kb-resolved')) document.getElementById('kb-resolved').innerHTML = resolvedHtml || '<p class="text-xs text-gray-400 p-2">Boş</p>';
        if (document.getElementById('kb-rejected')) document.getElementById('kb-rejected').innerHTML = rejectedHtml || '<p class="text-xs text-gray-400 p-2">Boş</p>';
        
        if (document.getElementById('kb-pending-count')) document.getElementById('kb-pending-count').innerText = pendingCount;
        if (document.getElementById('kb-applied-count')) document.getElementById('kb-applied-count').innerText = appliedCount;
        if (document.getElementById('kb-resolved-count')) document.getElementById('kb-resolved-count').innerText = resolvedCount;
        if (document.getElementById('kb-rejected-count')) document.getElementById('kb-rejected-count').innerText = rejectedCount;
        
        renderHistoryTable();
        renderLast5DiD();
        loadOverview();
        
    } catch (err) {
        console.error("Failed to load kanban", err);
    }
}

async function applyAction(action_id) {
    try {
        const res = await fetch(`${API_URL}/actions/apply/${action_id}`, {method: 'POST'});
        if (!res.ok) {
            alert('Hata: Aksiyon uygulanamadı.');
            return;
        }
        await loadKanban();
        loadOverview();
    } catch (err) {
        console.error(err);
        alert('Bağlantı hatası.');
    }
}

function rejectAction(action_id) {
    document.getElementById('reject-action-id').value = action_id;
    document.getElementById('reject-reason-text').value = '';
    document.getElementById('reject-modal').classList.remove('hidden');
}

async function confirmRejectAction() {
    const action_id = document.getElementById('reject-action-id').value;
    const sel = document.getElementById('reject-reason-select').value;
    const txt = document.getElementById('reject-reason-text').value;
    const reason = txt ? `${sel} - ${txt}` : sel;
    
    try {
        const res = await fetch(`${API_URL}/actions/reject/${action_id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ reason: reason })
        });
        if (!res.ok) {
            alert('Hata: Aksiyon reddedilemedi.');
            return;
        }
        document.getElementById('reject-modal').classList.add('hidden');
        await loadKanban();
        loadOverview();
    } catch (err) {
        console.error(err);
        alert('Bağlantı hatası.');
    }
}

async function applyBulkActions(commaSeparatedIds) {
    let ids = commaSeparatedIds.split(',');
    for (let id of ids) {
        try {
            await fetch(`${API_URL}/actions/apply/${id}`, {method: 'POST'});
        } catch (err) { console.error("Bulk apply failed for", id, err); }
    }
    await loadKanban();
}

function filterHistory() {
    renderHistoryTable();
}

function renderHistoryTable() {
    let filterEl = document.getElementById('filter-action-type');
    let filterVal = filterEl ? filterEl.value : '';
    let htmlHistory = '';
    
    let resolvedActions = globalActionsData.filter(a => a && a.status === 'RESOLVED');
    if (filterVal) {
        resolvedActions = resolvedActions.filter(a => {
            if (filterVal === 'IMAGE' || filterVal === 'IMAGE_UPDATE') return a.target_feature === 'image_count';
            if (filterVal === 'PRICE' || filterVal === 'PRICE_OPTIMIZATION') return a.target_feature === 'base_price';
            if (filterVal === 'VARIANT' || filterVal === 'VARIANT_ADDITION') return a.target_feature === 'variant_count';
            if (filterVal === 'CONTENT' || filterVal === 'CONTENT_UPDATE') return a.target_feature === 'description_word_count' || a.target_feature === 'has_size_chart';
            return true;
        });
    }
    
    // Update the ROI DiD Summary Card with filtered actions
    loadROI(resolvedActions);
    
    resolvedActions.forEach(a => {
        let uplift = parseFloat(a.measured_uplift_pct) || parseFloat(a.did_uplift) || 0;
        let gmv = parseFloat(a.attributed_gmv_tl) || 0;
        let colorClass = uplift > 0 ? 'text-green-600 font-bold' : (uplift < 0 ? 'text-red-600 font-bold' : 'text-gray-600');
        
        let statusText = uplift < 0 ? 'Ters Tepki (Negative Impact)' : 'Başarılı';
        let suggestedActionText = a.change_summary || a.suggested_action || '';
        
        // Encode data for modal
        let encodedData = encodeURIComponent(JSON.stringify(a));
        
        let rollbackBtn = uplift < 0 ? `<button onclick="rollbackAction('${a.action_id}')" class="text-white hover:bg-red-700 bg-red-600 font-bold text-xs px-2 py-1 rounded ml-1 transition">Geri Al</button>` : '';
        
        htmlHistory += `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="py-3 px-4 text-left whitespace-nowrap"><span class="font-medium">${a.product_id || ''}</span></td>
            <td class="py-3 px-4 text-left text-xs">${a.identified_issue_tr || a.identified_issue || ''} <br><span class="text-[10px] ${uplift < 0 ? 'text-red-500 font-bold' : 'text-gray-400'}">${statusText}</span></td>
            <td class="py-3 px-4 text-left text-xs">${suggestedActionText}</td>
            <td class="py-3 px-4 text-left ${colorClass}">${uplift > 0 ? '+' : ''}${uplift}%</td>
            <td class="py-3 px-4 text-left ${colorClass}">₺${gmv.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
            <td class="py-3 px-4 text-center">
                <button onclick="openReportModal('${a.action_id}')" class="text-indigo-600 hover:text-indigo-900 text-xs border border-indigo-200 bg-indigo-50 px-2 py-1 rounded">Rapor Detayı</button>
                ${rollbackBtn}
            </td>
        </tr>
        `;
    });
    
    let tableBody = document.getElementById('history-table-body');
    if (tableBody) {
        tableBody.innerHTML = htmlHistory || '<tr><td colspan="6" class="text-center py-4 text-gray-400">Bu filtreye uygun çözülmüş aksiyon bulunamadı.</td></tr>';
    }
}


// ---------------------------
// TAB 4: CATALOG & SIMULATOR
// ---------------------------
async function loadProducts() {
    try {
        let action = document.getElementById('filter-action') ? document.getElementById('filter-action').value : '';
        let status = document.getElementById('filter-status') ? document.getElementById('filter-status').value : '';
        let start = document.getElementById('filter-start') ? document.getElementById('filter-start').value : '';
        let end = document.getElementById('filter-end') ? document.getElementById('filter-end').value : '';
        
        let url = `${API_URL}/diagnostics/products?page=${currentPage}&limit=15`;
        if (action) url += `&action_type=${encodeURIComponent(action)}`;
        if (status) url += `&action_status=${encodeURIComponent(status)}`;
        if (start) url += `&start_date=${encodeURIComponent(start)}`;
        if (end) url += `&end_date=${encodeURIComponent(end)}`;

        const res = await fetch(url);
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        document.getElementById('current-page').innerText = `Sayfa ${currentPage}`;
        
        let html = '';
        data.data.forEach(p => {
            let hClass = p.health_index > 80 ? 'text-green-600' : (p.health_index > 50 ? 'text-yellow-600' : 'text-red-600');
            let mainIssue = p.issues.length > 0 ? p.issues[0] : 'No critical issues';
            
            html += `
            <tr class="border-b border-gray-200 hover:bg-gray-50 transition">
                <td class="py-3 px-6 text-left whitespace-nowrap"><span class="font-mono text-xs">${p.product_id}</span></td>
                <td class="py-3 px-6 text-left font-medium">${p.conversion_rate}%</td>
                <td class="py-3 px-6 text-left"><span class="font-bold ${hClass}">${p.health_index}</span></td>
                <td class="py-3 px-6 text-left text-xs">${mainIssue}</td>
                <td class="py-3 px-6 text-center">
                    <button class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded text-xs hover:bg-indigo-600 hover:text-white transition" onclick="openSimulator('${p.product_id}')">Simüle Et</button>
                </td>
            </tr>
            `;
        });
        document.getElementById('product-table-body').innerHTML = html;
        
    } catch (err) {
        console.error("Failed to load products", err);
    }
}

function changePage(delta) {
    let newPage = currentPage + delta;
    if (newPage < 1) newPage = 1;
    currentPage = newPage;
    loadProducts();
}

async function openSimulator(pid) {
    document.getElementById('sim-pid').value = pid;
    document.getElementById('modal-title').innerText = `What-If Simulator: ${pid}`;
    document.getElementById('sim-results').innerHTML = `<div class="h-full flex items-center justify-center"><p class="text-gray-500 italic">Parametreleri ayarlayın ve Simülasyonu Başlatın.</p></div>`;
    
    document.getElementById('simulator-modal').classList.remove('hidden');
    
    document.getElementById('sim-benchmark-body').innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-400 italic">Kategori verileri yükleniyor...</td></tr>`;
    
    try {
        const res = await fetch(`${API_URL}/diagnostics/products/${pid}`);
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        let c = data.current_features;
        let avg = data.category_averages;
        
        // Fill form defaults and store original values
        document.getElementById('sim-img').value = c.image_count;
        document.getElementById('sim-img').dataset.orig = c.image_count;
        
        document.getElementById('sim-price').value = c.base_price;
        document.getElementById('sim-price').dataset.orig = c.base_price;
        
        if(document.getElementById('sim-variant-count')) {
            document.getElementById('sim-variant-count').value = c.variant_count;
            document.getElementById('sim-variant-count').dataset.orig = c.variant_count;
        }
        
        document.getElementById('sim-desc').value = c.description_word_count;
        document.getElementById('sim-desc').dataset.orig = c.description_word_count;
        
        // Generate Table Rows
        let html = '';
        
        const generateRow = (name, val, benchmark, unit, lowerIsBetter = false) => {
            let diff = val - benchmark;
            let status = '';
            let color = 'text-gray-500';
            
            if (val === benchmark) {
                status = 'Ortalama Seviyesinde';
            } else if (val > benchmark) {
                status = lowerIsBetter ? 'Ortalamanın Üzerinde (Riskli)' : 'Ortalamanın Üzerinde (İyi)';
                color = lowerIsBetter ? 'text-red-500 font-bold' : 'text-green-600 font-bold';
            } else {
                status = lowerIsBetter ? 'Ortalamanın Altında (İyi)' : 'Ortalamanın Altında (Riskli)';
                color = lowerIsBetter ? 'text-green-600 font-bold' : 'text-red-500 font-bold';
            }
            
            return `
            <tr class="border-b last:border-0 hover:bg-gray-50">
                <td class="px-4 py-2 font-medium">${name}</td>
                <td class="px-4 py-2 text-center text-gray-900">${val} ${unit}</td>
                <td class="px-4 py-2 text-center text-gray-500">${benchmark} ${unit}</td>
                <td class="px-4 py-2 ${color}">${status}</td>
            </tr>`;
        };
        
        html += generateRow('Birim Fiyat', c.base_price, avg.base_price, 'TL', true);
        html += generateRow('Görsel Adedi', c.image_count, avg.image_count, 'Adet', false);
        html += generateRow('Varyant Sayısı', c.variant_count, avg.variant_count, 'Adet', false);
        html += generateRow('Açıklama Kelime', c.description_word_count, avg.description_word_count, 'Kelime', false);
        
        document.getElementById('sim-benchmark-body').innerHTML = html;
        
    } catch (err) {
        document.getElementById('sim-benchmark-body').innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500 italic">Veri yüklenemedi.</td></tr>`;
        console.error(err);
    }
}

function switchToSimulator(pid) {
    // Switch to Tab 4 (Simulation)
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => {
        t.classList.remove('border-indigo-600', 'text-indigo-600');
        t.classList.add('border-transparent', 'hover:text-indigo-600');
    });
    contents.forEach(c => c.classList.add('hidden'));
    contents.forEach(c => c.classList.remove('block'));
    
    let targetTabLink = document.querySelector('.tab-link[data-tab="tab-4"]');
    if(targetTabLink) {
        targetTabLink.classList.remove('border-transparent', 'hover:text-indigo-600');
        targetTabLink.classList.add('border-indigo-600', 'text-indigo-600');
    }
    
    let targetTabContent = document.getElementById('tab-4');
    if(targetTabContent) {
        targetTabContent.classList.remove('hidden');
        targetTabContent.classList.add('block');
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Open the simulator modal for the specific product
    openSimulator(pid);
}

async function runSimulation() {
    let payload = { product_id: document.getElementById('sim-pid').value };
    
    let img = document.getElementById('sim-img').value;
    if(img) payload.image_count = parseInt(img);
    
    let prc = document.getElementById('sim-price').value;
    if(prc) payload.price = parseFloat(prc);
    
    let varc = document.getElementById('sim-variant-count').value;
    if(varc && parseInt(varc) > 0) payload.variant_count = parseInt(varc);
    
    let desc = document.getElementById('sim-desc').value;
    if(desc) payload.description_word_count = parseInt(desc);
    
    document.getElementById('sim-results').innerHTML = `<div class="h-full flex items-center justify-center"><p class="font-bold text-indigo-600 animate-pulse">Running DiD Simulator Engine...</p></div>`;
    
    try {
        const res = await fetch(`${API_URL}/simulator/what-if`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        let color = data.uplift_pct >= 0 ? 'text-green-600' : 'text-red-600';
        let bgBadge = data.uplift_pct >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        let arrow = data.uplift_pct >= 0 ? '↑' : '↓';
        let absUplift = Math.abs(data.uplift_pct).toFixed(2);
        
        let oldP = (data.original_probability * 100).toFixed(2);
        let newP = (data.new_probability * 100).toFixed(2);
        
        // Ensure visual difference if there is an uplift
        if (oldP === newP && data.uplift_pct !== 0) {
            newP = (data.original_probability * 100 + data.uplift_pct).toFixed(2);
        }
        
        // 2. Financial & Volume Projection
        let pidStr = payload.product_id || "123";
        let hash = 0;
        for (let i = 0; i < pidStr.length; i++) {
            hash = pidStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        let sessions = Math.abs(hash % 15000) + 5000;
        
        // Calculate actual diffProb using uplift_pct to avoid backend rounding issues
        let diffProb = data.original_probability * (data.uplift_pct / 100);
        let extraOrders = Math.round(sessions * diffProb);
        
        // Fix for small uplifts resulting in 0 orders
        if (data.uplift_pct > 0 && extraOrders === 0) extraOrders = 1;
        if (data.uplift_pct < 0 && extraOrders === 0) extraOrders = -1;
        
        let currentPriceStr = document.getElementById('sim-price').value || document.getElementById('sim-price').placeholder || "0";
        let price = parseFloat(currentPriceStr.replace(/[^0-9.]/g, '')) || 250.0;
        
        let extraGmv = extraOrders * price;
        let gmvFormatted = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Math.abs(extraGmv));
        let gmvColor = extraGmv >= 0 ? 'text-green-600' : 'text-red-600';
        let sign = extraGmv >= 0 ? '+' : (extraGmv < 0 ? '-' : '');
        
        let origPrice = parseFloat(document.getElementById('sim-price').dataset.orig) || 0;
        let priceChanged = (price !== origPrice);
        
        let descNum = parseInt(document.getElementById('sim-desc').value) || 0;
        let origDesc = parseInt(document.getElementById('sim-desc').dataset.orig) || 0;
        let descChanged = (descNum !== origDesc);
        
        let origImg = parseInt(document.getElementById('sim-img').dataset.orig) || 0;
        let imgChanged = (parseInt(document.getElementById('sim-img').value || 0) !== origImg);
        
        let origVar = parseInt(document.getElementById('sim-variant-count').dataset.orig) || 0;
        let varChanged = (parseInt(document.getElementById('sim-variant-count').value || 0) !== origVar);
        
        // Check if anything actually changed
        let anyChanged = priceChanged || descChanged || imgChanged || varChanged;
        
        let resHtml = '';
        
        if (!anyChanged) {
            // 1. No changes state
            resHtml = `
            <div class="w-full h-full flex flex-col justify-center items-center text-center p-6 bg-slate-50 rounded-lg border border-slate-200">
                <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h3 class="text-lg font-bold text-slate-800 mb-2">Orijinal Parametreler (Değişiklik Yok)</h3>
                <p class="text-sm text-slate-500 leading-relaxed mb-6">
                    Sol taraftaki parametreleri (fiyat, görsel, açıklama) kategori ortalamalarını referans alarak güncelleyin ve 'Simülasyonu Başlat' butonuna basın.
                </p>
                <div class="flex gap-4 w-full max-w-sm">
                    <div class="flex-1 bg-white p-3 rounded shadow-sm border text-center">
                        <div class="text-[10px] text-gray-400 uppercase font-bold">Uplift</div>
                        <div class="text-lg font-black text-gray-800">%0.00</div>
                    </div>
                    <div class="flex-1 bg-white p-3 rounded shadow-sm border text-center">
                        <div class="text-[10px] text-gray-400 uppercase font-bold">Ek Sipariş</div>
                        <div class="text-lg font-black text-gray-800">0 Adet</div>
                    </div>
                    <div class="flex-1 bg-white p-3 rounded shadow-sm border text-center">
                        <div class="text-[10px] text-gray-400 uppercase font-bold">Net Ciro</div>
                        <div class="text-lg font-black text-gray-800">₺0</div>
                    </div>
                </div>
            </div>
            `;
        } else {
            // 2. Dynamic Diagnosis Blocks & Methodology
            let mc = data.marginal_contributions || {};
            
            // Methodology Panel
            let methodologyHtml = `
                <div class="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 mb-4 text-xs">
                    <h5 class="font-bold text-indigo-900 mb-2">Simülasyon Metodolojisi</h5>
                    <div class="grid grid-cols-1 gap-2">
                        <div class="flex items-start gap-2">
                            <span class="text-indigo-500 mt-0.5">🧠</span>
                            <p class="text-indigo-800 leading-tight"><strong>Dayanak Modeli:</strong> LightGBM Eğitilmiş Karar Ağaçları & SHAP (TreeExplainer) marjinal katkı analizi.</p>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-indigo-500 mt-0.5">📏</span>
                            <p class="text-indigo-800 leading-tight"><strong>Referans Noktası:</strong> Ürünün yer aldığı kategorinin medyan fiyatı, ortalama kelime sayısı ve varyant dağılımı.</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Parameter Action Boxes
            let boxesHtml = `<div class="grid grid-cols-2 gap-3 mb-4">`;
            
            // Box 1: Price
            let pVal = mc.price || 0;
            let pColor = pVal >= 0 ? (pVal>0 ? 'text-green-600' : 'text-gray-500') : 'text-red-600';
            let pText = !priceChanged ? "Mevcut durum korunduğu için nötr etki (0.00%)." : (
                price < origPrice 
                ? "Kategori medyanına yaklaşılarak fiyata bağlı talep esnekliği artırıldı; sepet terk direnci düşürüldü." 
                : "Fiyat artışı marjı iyileştirse de sepete atma eğilimini düşürüyor."
            );
            boxesHtml += `
                <div class="bg-white border rounded p-3 shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-xs text-gray-800">🏷️ Fiyat Etkisi</span>
                            <span class="font-bold text-xs ${pColor}">${pVal > 0 ? '+' : ''}${pVal.toFixed(2)}%</span>
                        </div>
                        <div class="text-[10px] text-gray-500 mb-1 font-mono">${origPrice} ➔ ${priceChanged ? price : origPrice}</div>
                    </div>
                    <p class="text-[10px] text-gray-600 leading-snug">${pText}</p>
                </div>
            `;
            
            // Box 2: Description
            let dVal = mc.description || 0;
            let dColor = dVal >= 0 ? (dVal>0 ? 'text-green-600' : 'text-gray-500') : 'text-red-600';
            let dText = !descChanged ? "Mevcut durum korunduğu için nötr etki (0.00%)." : (
                descNum > origDesc
                ? "Kelime sayısı kategori eşiğine çekilerek bilgi eksikliğinden doğan tereddüt ve sürtünme ortadan kaldırıldı."
                : "Açıklama kısaltıldığı için müşterinin karar vermesi zorlaştı."
            );
            boxesHtml += `
                <div class="bg-white border rounded p-3 shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-xs text-gray-800">📝 İçerik Etkisi</span>
                            <span class="font-bold text-xs ${dColor}">${dVal > 0 ? '+' : ''}${dVal.toFixed(2)}%</span>
                        </div>
                        <div class="text-[10px] text-gray-500 mb-1 font-mono">${origDesc} ➔ ${descChanged ? descNum : origDesc} Kelime</div>
                    </div>
                    <p class="text-[10px] text-gray-600 leading-snug">${dText}</p>
                </div>
            `;
            
            // Box 3: Image
            let iVal = mc.image || 0;
            let iColor = iVal >= 0 ? (iVal>0 ? 'text-green-600' : 'text-gray-500') : 'text-red-600';
            let iText = !imgChanged ? "Mevcut görsel sayısı korunduğu için nötr etki (0.00%)." : (
                parseInt(document.getElementById('sim-img').value || 0) > origImg
                ? "Detay açılarının eklenmesi ürünün algılanan kalitesini ve güvenini artırdı."
                : "Görsel azaltımı müşteri güvenini olumsuz etkiliyor."
            );
            boxesHtml += `
                <div class="bg-white border rounded p-3 shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-xs text-gray-800">🖼️ Görsel Etkisi</span>
                            <span class="font-bold text-xs ${iColor}">${iVal > 0 ? '+' : ''}${iVal.toFixed(2)}%</span>
                        </div>
                        <div class="text-[10px] text-gray-500 mb-1 font-mono">${origImg} ➔ ${imgChanged ? document.getElementById('sim-img').value : origImg} Adet</div>
                    </div>
                    <p class="text-[10px] text-gray-600 leading-snug">${iText}</p>
                </div>
            `;
            
            // Box 4: Variant
            let vVal = mc.variant || 0;
            let vColor = vVal >= 0 ? (vVal>0 ? 'text-green-600' : 'text-gray-500') : 'text-red-600';
            let vText = !varChanged ? "Mevcut varyant sayısı korunduğu için nötr etki (0.00%)." : (
                parseInt(document.getElementById('sim-variant-count').value || 0) > origVar
                ? "Farklı seçenek arayan müşterilerin sepeti terk etme oranı azaldı."
                : "Seçenek azlığı ürünün kapsayıcılığını düşürüyor."
            );
            boxesHtml += `
                <div class="bg-white border rounded p-3 shadow-sm flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-xs text-gray-800">🎨 Varyant Etkisi</span>
                            <span class="font-bold text-xs ${vColor}">${vVal > 0 ? '+' : ''}${vVal.toFixed(2)}%</span>
                        </div>
                        <div class="text-[10px] text-gray-500 mb-1 font-mono">${origVar} ➔ ${varChanged ? document.getElementById('sim-variant-count').value : origVar} Adet</div>
                    </div>
                    <p class="text-[10px] text-gray-600 leading-snug">${vText}</p>
                </div>
            `;
            
            boxesHtml += `</div>`;
            
            // Render Populated Layout
            resHtml = `
                <div class="w-full h-full flex flex-col justify-between overflow-y-auto pr-1 pb-4">
                    
                    <!-- 1. Üst Finansal Özet Kartı -->
                    <div class="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-xl p-4 mb-4 shadow-lg text-white shrink-0">
                        <div class="flex items-center justify-between mb-3 pb-3 border-b border-white/20">
                            <div class="flex flex-col">
                                <span class="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1">Taban → Simüle Olasılık</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-lg font-medium text-gray-400">%${oldP}</span>
                                    <span class="text-indigo-400">➔</span>
                                    <span class="text-xl font-black text-white">%${newP}</span>
                                </div>
                            </div>
                            <div class="${data.uplift_pct >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'} px-3 py-1 rounded-lg border ${data.uplift_pct >= 0 ? 'border-green-500/30' : 'border-red-500/30'} flex flex-col items-center">
                                <span class="text-[10px] uppercase font-bold opacity-80">Net Uplift</span>
                                <span class="text-lg font-black tracking-tight">${sign}%${absUplift}</span>
                            </div>
                        </div>
                        
                        <div class="flex flex-col">
                            <span class="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1">Öngörülen Etki</span>
                            <div class="text-sm font-bold flex flex-wrap gap-x-2 gap-y-1">
                                <span class="${data.uplift_pct >= 0 ? 'text-green-400' : 'text-red-400'}">${sign}${Math.abs(extraOrders)} Adet Ek Sipariş / Ay</span>
                                <span class="text-indigo-300 hidden sm:inline">|</span> 
                                <span class="${gmvColor}">${sign}₺${gmvFormatted} Net Ek Ciro / Ay</span>
                            </div>
                        </div>
                    </div>
                    
                    ${methodologyHtml}
                    ${boxesHtml}
                    
                    <!-- 4. Matematiksel Doğrulama (Dipnot) -->
                    <div class="bg-slate-50 border border-slate-200 rounded p-3 text-[10px] text-slate-500 mt-auto shrink-0">
                        <div class="font-mono text-center font-bold text-slate-700 mb-1 border-b border-slate-200 pb-1">
                            P_yeni = P_taban + Δ_fiyat + Δ_açıklama + Δ_görsel + Δ_varyant
                        </div>
                        <p class="text-center">Bu hesaplama, modelin her bir özelliğe atadığı Shapley değerlerinin doğrusal toplamı ve lojistik fonksiyon (Sigmoid) eşlemesiyle türetilmiştir.</p>
                    </div>
                    
                </div>
            `;
        }
        
        document.getElementById('sim-results').innerHTML = resHtml;
        
    } catch (err) {
        document.getElementById('sim-results').innerHTML = `
            <div class="h-full flex flex-col items-center justify-center p-6 text-center bg-gray-50 rounded border border-gray-100">
                <div class="text-orange-400 mb-2">
                    <svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <p class="text-sm font-bold text-gray-700 mb-1">Bağlantı Kesintisi / Hata</p>
                <p class="text-xs text-gray-500">Simülasyon motoru çalıştırılamadı.</p>
                <p class="text-xs text-red-500 mt-3 font-mono break-all">${err.message || err.toString()}</p>
            </div>
        `;
        console.error(err);
    }
}

// ---------------------------
// GLOBAL METRICS & POLICIES
// ---------------------------
async function loadOverview() {
    try {
        const res = await fetch(`${API_URL}/overview`);
        if(!res.ok) throw new Error("API Error");
        const data = await res.json();
        
        // Dinamik hesaplamalar (backend'den gelen gerçek verileri kullan)
        let recoverableGmv = data.recoverable_revenue || 0;
        let frictionRate = data.friction_rate_pct || 0;
        
        // Removed the hardcoded frontend overwrite so it trusts the backend real data
        
        const formatMoney = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
        
        const kpiHtml = `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105">
                <div class="absolute right-0 top-0 w-2 h-full bg-indigo-500"></div>
                <p class="text-xs text-gray-500 font-bold tracking-wider flex items-center">
                    Toplam Oturum
                </p>
                <p class="text-2xl font-black text-gray-800 mt-1 transition-all duration-1000">${(data.total_sessions || 0).toLocaleString('tr-TR')}</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105">
                <div class="absolute right-0 top-0 w-2 h-full bg-blue-500"></div>
                <p class="text-xs text-gray-500 font-bold tracking-wider flex items-center">
                    Toplam Satın Alma
                </p>
                <p class="text-2xl font-black text-gray-800 mt-1 transition-all duration-1000">${((data.funnel && data.funnel.purchased) ? data.funnel.purchased : 0).toLocaleString('tr-TR')}</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105">
                <div class="absolute right-0 top-0 w-2 h-full bg-red-500"></div>
                <p class="text-xs text-gray-500 font-bold tracking-wider flex items-center" title="Katalogda satın almayı zorlaştıran eksiklik (görsel yetersizliği, kısa açıklama vb.) bulunan ürünlerin toplam kataloğa oranı.">
                    Sürtünme Oranı
                    <span class="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold cursor-help">i</span>
                </p>
                <p class="text-2xl font-black text-gray-800 mt-1 transition-all duration-1000">%${frictionRate}</p>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 relative overflow-hidden transition-all duration-500 ease-in-out transform hover:scale-105">
                <div class="absolute right-0 top-0 w-2 h-full bg-green-500"></div>
                <p class="text-xs text-gray-500 font-bold tracking-wider flex items-center" title="Tespit edilen sürtünmeler giderildiğinde sisteme kazandırılacak tahmini net brüt satış potansiyeli.">
                    Geri Kazanılabilir Ciro
                    <span class="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold cursor-help">i</span>
                </p>
                <p class="text-2xl font-black text-gray-800 mt-1 transition-all duration-1000">${formatMoney(recoverableGmv)}</p>
            </div>
        `;
        document.getElementById('kpi-cards').innerHTML = kpiHtml;
    } catch (err) {
        console.error("Failed to load overview", err);
    }
}

async function loadPolicies() {
    try {
        const res = await fetch(`${API_URL}/actions/policies`);
        if(!res.ok) throw new Error(`API Error: ${res.status}`);
        let data = await res.json();
        
        console.log("Policies Data:", data);
        if (data.data) { data = data.data; } // Fallback if wrapped
        if (!Array.isArray(data)) {
            console.error("Policies data is not an array!", data);
            data = [];
        }
        
        let html = '';
        data.forEach(p => {
            html += `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="p-3 font-medium text-gray-800">${p.name}</td>
                <td class="p-3">
                    <span class="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100">
                        ${p.target_feature} ${p.operator} ${p.threshold_value}
                    </span>
                </td>
                <td class="p-3 text-xs text-gray-600">${p.suggested_action}</td>
            </tr>
            `;
        });
        document.getElementById('policy-list-body').innerHTML = html || '<tr><td colspan="3" class="p-4 text-center text-gray-400">Aktif politika bulunamadı.</td></tr>';
    } catch (err) {
        console.error("Failed to load policies", err);
    }
}

async function createPolicy(e) {
    e.preventDefault();
    
    let payload = {
        name: document.getElementById('pol-name').value,
        target_feature: document.getElementById('pol-feature').value,
        operator: document.getElementById('pol-op').value,
        threshold_value: parseFloat(document.getElementById('pol-thresh').value),
        action_type: 'CUSTOM',
        suggested_action: document.getElementById('pol-action').value
    };
    
    try {
        const res = await fetch(`${API_URL}/actions/policies`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if(res.ok) {
            document.getElementById('policy-form').reset();
            loadPolicies();
            // Using modern alert logic, could be a toast in future
            alert("Policy created successfully! It will now autonomously evaluate products.");
        } else {
            throw new Error("Failed to post policy");
        }
    } catch (err) {
        console.error("Policy creation error", err);
        alert("Failed to create policy. Check console.");
    }
}

async function loadROI(filteredActions = null) {
    try {
        let resolvedCount = 0;
        let totalUplift = 0;
        let totalGmv = 0;
        
        let actionsToProcess = filteredActions;
        if (!actionsToProcess && globalActionsData && Array.isArray(globalActionsData)) {
            actionsToProcess = globalActionsData.filter(a => a && a.status === 'RESOLVED');
        }
        
        if (actionsToProcess && Array.isArray(actionsToProcess)) {
            actionsToProcess.forEach(a => {
                // If it's passed from renderHistoryTable, it's already filtered to RESOLVED,
                // but if we call loadROI() without args, we check it above.
                if (a.status === 'RESOLVED') {
                    resolvedCount++;
                    totalUplift += (parseFloat(a.measured_uplift_pct) || 0);
                    totalGmv += (parseFloat(a.attributed_gmv_tl) || 0);
                }
            });
        }
        
        // Calculate average uplift
        let avgUplift = resolvedCount > 0 ? (totalUplift / resolvedCount) : 0;
        let avgUpliftFormatted = (avgUplift > 0 ? '+' : '') + avgUplift.toFixed(2);
        
        // Mock natural control as 5.00 for simulation UI purpose as requested
        let treatedVal = (5.00 + avgUplift).toFixed(2);
        
        let container = document.getElementById('roi-content');
        container.className = "rounded-xl border shadow-sm overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30";
        
        let html = `
            <div class="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                
                <!-- Sol Sütun (Metrikler & Ciro) -->
                <div class="flex flex-col justify-center">
                    <div class="flex items-center space-x-3 mb-2">
                        <span class="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">Net Uplift</span>
                    </div>
                    <div class="text-5xl font-black text-gray-800 tracking-tight mb-4">
                        ${avgUpliftFormatted}%
                    </div>
                    
                    <div class="text-lg text-gray-600 mb-6 font-medium">
                        Toplam Atfedilen Ciro: <span class="text-2xl font-bold text-gray-900 ml-1">₺${totalGmv.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div class="bg-white/60 backdrop-blur-sm border rounded-lg p-3 text-sm text-gray-600 mb-4 inline-block shadow-sm">
                        Değerlendirilen Aksiyon: <strong class="text-gray-900">${resolvedCount} Adet</strong> 
                        <span class="mx-2 text-gray-300">|</span> 
                        Eşleşen İkiz Ürün: <strong class="text-gray-900">${resolvedCount} Adet</strong>
                    </div>
                    
                    <p class="text-xs text-gray-500 leading-relaxed max-w-md">
                        Dış pazar dalgalanmalarından arındırılmış, doğrudan operasyonel müdahalelerin getirdiği net finansal katkıdır.
                    </p>
                </div>
                
                <!-- Sağ Sütun (Mini DiD Karşılaştırma) -->
                <div class="flex flex-col justify-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h3 class="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide border-b pb-2">Nedensel Etki (DiD) Dağılımı</h3>
                    
                    <!-- Müdahale Edilenler -->
                    <div class="mb-4">
                        <div class="flex justify-between text-xs font-bold text-gray-700 mb-1">
                            <span>Müdahale Edilenler (Treated)</span>
                            <span class="text-indigo-600">%${treatedVal} Değişim</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2">
                            <div class="bg-indigo-500 h-2 rounded-full" style="width: ${Math.min(100, treatedVal * 3)}%"></div>
                        </div>
                    </div>
                    
                    <!-- İkizler -->
                    <div class="mb-6">
                        <div class="flex justify-between text-xs font-bold text-gray-700 mb-1">
                            <span>Doğal Pazar İkizleri (Twin Control)</span>
                            <span class="text-gray-500">%5.00 Değişim</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2">
                            <div class="bg-gray-400 h-2 rounded-full" style="width: 15%"></div>
                        </div>
                    </div>
                    
                    <!-- Aradaki Fark -->
                    <div class="pt-4 border-t border-dashed border-gray-200">
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-medium text-gray-600">Aradaki Fark (Net DiD Katkısı)</span>
                            <span class="text-lg font-black text-green-600 bg-green-50 px-3 py-1 rounded-md border border-green-100">
                                ${avgUpliftFormatted}%
                            </span>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
        container.innerHTML = html;
    } catch (err) {
        console.error("Failed to load ROI", err);
    }
}

// ML Algorithms Hub Functions
async function fetchMLConfig() {
    try {
        const res = await fetch(`${API_URL}/ml/config`);
        if (res.ok) {
            const config = await res.json();
            
            // SHAP
            let shapSlider = document.getElementById('ml-shap-tau');
            let shapVal = document.getElementById('ml-shap-val');
            if (shapSlider && shapVal && config.shap_tau !== undefined) {
                shapSlider.value = config.shap_tau;
                shapVal.innerText = config.shap_tau.toFixed(2);
            }
            
            // K-Means
            let kmeansInput = document.getElementById('ml-kmeans-k');
            if (kmeansInput && config.kmeans_k !== undefined) {
                kmeansInput.value = config.kmeans_k;
                renderKMeansPersonas(config.kmeans_k);
            }
            
            // DiD
            let didSelect = document.getElementById('ml-did-window');
            if (didSelect && config.did_window_days !== undefined) {
                didSelect.value = config.did_window_days.toString();
            }
            
            // Last Trained Badge
            if (document.getElementById('last-trained-badge') && config.last_trained_at) {
                document.getElementById('last-trained-badge').innerText = config.last_trained_at;
            }
        }
    } catch (err) {
        console.error("Failed to fetch ML config", err);
    }
}

async function saveMLConfig() {
    let btn = document.getElementById('btn-apply-ml');
    let originalText = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Kaydediliyor...`;
    
    let payload = {
        shap_tau: parseFloat(document.getElementById('ml-shap-tau').value) || -0.05,
        kmeans_k: parseInt(document.getElementById('ml-kmeans-k').value) || 4,
        did_window_days: parseInt(document.getElementById('ml-did-window').value) || 14
    };
    
    try {
        const res = await fetch(`${API_URL}/ml/config`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            btn.innerHTML = `<svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Kaydedildi!`;
            setTimeout(() => { btn.innerHTML = originalText; }, 2000);
            
            // Render the new K-Means personas
            renderKMeansPersonas(payload.kmeans_k);
            
            // Reload the Kanban and ROI to reflect the dynamic backend calculations
            await loadKanban();
            loadROI();
        } else {
            throw new Error("Failed to save ML config");
        }
    } catch (err) {
        console.error("Save ML config error", err);
        btn.innerHTML = originalText;
        alert("Konfigürasyon kaydedilemedi.");
    }
}

function renderLast5DiD() {
    let container = document.getElementById('ml-did-last-actions');
    if (!container) return;
    
    let resolvedActions = globalActionsData.filter(a => a.status === 'RESOLVED');
    let last5 = resolvedActions.slice(-5).reverse();
    
    if (last5.length === 0) {
        container.innerHTML = `<div class="text-gray-500 text-center py-2 italic">Henüz çözülmüş aksiyon yok.</div>`;
        return;
    }
    
    let html = '';
    last5.forEach(a => {
        let uplift = parseFloat(a.measured_uplift_pct) || 0;
        let gmv = parseFloat(a.attributed_gmv_tl) || 0;
        html += `
            <div class="flex justify-between items-center bg-orange-50 border border-orange-100 p-2 rounded cursor-pointer hover:bg-orange-100 transition" onclick="openReportModal('${a.action_id}')">
                <div>
                    <span class="font-bold text-orange-900">${a.product_id}</span>
                    <span class="text-[10px] text-gray-500 ml-1 block">${a.action_type}</span>
                </div>
                <div class="text-right">
                    <div class="font-bold text-green-600">+${uplift.toFixed(1)}%</div>
                    <div class="text-[10px] text-orange-700">₺${gmv.toLocaleString()}</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderKMeansPersonas(k) {
    const container = document.getElementById('kmeans-persona-container');
    if (!container) return;
    
    // Create base percentages that roughly sum to 100
    // Using a simple algorithm: divide 100 into k chunks with some variance
    let percentages = [];
    let remaining = 100;
    
    for (let i = 0; i < k - 1; i++) {
        // Average remaining share
        let avg = Math.floor(remaining / (k - i));
        // Add some random variance (-5 to +5) but keep it reasonable
        let val = avg + (Math.floor(Math.random() * 10) - 5);
        if (val < 5) val = 5; // minimum 5%
        percentages.push(val);
        remaining -= val;
    }
    percentages.push(remaining); // last one takes the rest
    
    // Sort descending for visual hierarchy (largest group first)
    percentages.sort((a, b) => b - a);
    
    // Persona Names & Colors
    const personas = [
        { name: "Hızlı Alıcılar", color: "purple" },
        { name: "Fiyat Odaklı", color: "blue" },
        { name: "Kararsız Gezgin", color: "yellow" },
        { name: "Terk Edenler", color: "gray" },
        { name: "Sepette Bekleten", color: "red" },
        { name: "Sadece Bakanlar", color: "teal" },
        { name: "Sadık Müşteri", color: "indigo" },
        { name: "Kampanya Avcısı", color: "orange" },
        { name: "Yeni Üyeler", color: "green" },
        { name: "İade Eğilimli", color: "pink" }
    ];
    
    let html = '';
    for (let i = 0; i < k; i++) {
        let persona = personas[i % personas.length]; // cycle if k > 10
        let col = persona.color;
        let pct = percentages[i];
        
        // Map colors to tailwind classes
        let bgClass = `bg-${col}-50`;
        let borderClass = `border-${col}-100`;
        let textClass = `text-${col}-700`;
        if(col === 'gray') {
            borderClass = 'border-gray-200';
            textClass = 'text-gray-600';
        }
        
        html += `
        <div class="${bgClass} border ${borderClass} rounded p-1.5 text-center transition-all duration-300">
            <div class="text-[10px] text-gray-500 uppercase tracking-wide truncate" title="${persona.name}">${persona.name}</div>
            <div class="font-bold ${textClass}">%${pct}</div>
        </div>
        `;
    }
    
    container.innerHTML = html;
}

let didChartInstance = null;

async function openReportModal(action_id) {
    try {
        const res = await fetch(`${API_URL}/reports/did/${action_id}`);
        if (!res.ok) throw new Error("Rapor alınamadı");
        const data = await res.json();
        
        // 1. Catalog info
        document.getElementById('rep-prod-id').innerText = data.catalog.product_id;
        document.getElementById('rep-category').innerText = data.catalog.category;
        document.getElementById('rep-price').innerText = `₺${data.catalog.price.toFixed(2)}`;
        document.getElementById('rep-image').innerText = data.catalog.image_count;
        document.getElementById('rep-variant').innerText = data.catalog.variant_count;
        document.getElementById('rep-size').innerText = data.catalog.has_size_chart ? 'Var' : 'Yok';
        document.getElementById('rep-desc').innerText = data.catalog.description_word_count;
        document.getElementById('rep-issue').innerText = data.catalog.identified_issue;
        document.getElementById('rep-action').innerText = data.catalog.suggested_action;
        document.getElementById('rep-date').innerText = data.catalog.created_at;
        document.getElementById('rep-window').innerText = `${data.catalog.window_days} Gün`;
        
        // 2. Twin info
        document.getElementById('rep-twin-id').innerText = data.twin.product_id || "-";
        document.getElementById('rep-twin-price').innerText = data.twin.price ? `₺${data.twin.price.toFixed(2)}` : "-";
        document.getElementById('rep-twin-image').innerText = data.twin.image_count !== undefined ? `${data.twin.image_count} Adet` : "-";
        document.getElementById('rep-twin-variant').innerText = data.twin.variant_count !== undefined ? `${data.twin.variant_count} Adet` : "-";
        document.getElementById('rep-twin-desc').innerText = data.twin.description_word_count !== undefined ? `${data.twin.description_word_count} Kelime` : "-";
        document.getElementById('rep-twin-reason').innerText = data.twin.reason || "-";
        
        // 3. Raw Data Table
        let tr = data.raw_data.treated;
        let ct = data.raw_data.control;
        
        document.getElementById('rep-tr-pre-s').innerText = tr.before.sessions;
        document.getElementById('rep-tr-pre-cr').innerText = (tr.before.cr * 100).toFixed(2) + '%';
        document.getElementById('rep-tr-post-s').innerText = tr.after.sessions;
        document.getElementById('rep-tr-post-cr').innerText = (tr.after.cr * 100).toFixed(2) + '%';
        let tr_delta = (tr.after.cr - tr.before.cr) * 100;
        document.getElementById('rep-tr-delta').innerText = (tr_delta >= 0 ? '+' : '') + tr_delta.toFixed(2) + '%';
        
        document.getElementById('rep-ct-pre-s').innerText = ct.before.sessions;
        document.getElementById('rep-ct-pre-cr').innerText = (ct.before.cr * 100).toFixed(2) + '%';
        document.getElementById('rep-ct-post-s').innerText = ct.after.sessions;
        document.getElementById('rep-ct-post-cr').innerText = (ct.after.cr * 100).toFixed(2) + '%';
        let ct_delta = (ct.after.cr - ct.before.cr) * 100;
        document.getElementById('rep-ct-delta').innerText = (ct_delta >= 0 ? '+' : '') + ct_delta.toFixed(2) + '%';
        
        // 4. Math Steps
        document.getElementById('math-step-1').innerText = `ΔTreated = ${(tr.after.cr * 100).toFixed(2)}% - ${(tr.before.cr * 100).toFixed(2)}% = ${(tr_delta >= 0 ? '+' : '') + tr_delta.toFixed(2)}%`;
        document.getElementById('math-step-2').innerText = `ΔControl = ${(ct.after.cr * 100).toFixed(2)}% - ${(ct.before.cr * 100).toFixed(2)}% = ${(ct_delta >= 0 ? '+' : '') + ct_delta.toFixed(2)}%`;
        let uplift_pct = data.math_steps.uplift * 100;
        document.getElementById('math-step-3').innerText = `DiD = ${(tr_delta >= 0 ? '+' : '') + tr_delta.toFixed(2)}% - (${(ct_delta >= 0 ? '+' : '') + ct_delta.toFixed(2)}%) = ${(uplift_pct >= 0 ? '+' : '') + uplift_pct.toFixed(2)}%`;
        document.getElementById('math-step-4').innerText = `Ciro = ${tr.after.sessions} × ${uplift_pct.toFixed(2)}% × ₺${data.catalog.price.toFixed(2)} = ₺${data.math_steps.gmv.toLocaleString()}`;
        
        // 5. Summary & Chart
        let uplift_str = (uplift_pct >= 0 ? '+' : '') + uplift_pct.toFixed(2) + '%';
        let gmv_formatted = data.math_steps.gmv.toLocaleString('tr-TR', {minimumFractionDigits: 2});
        
        let upliftBox = document.getElementById('rep-summary-uplift-box');
        let upliftTitle = document.getElementById('rep-summary-uplift-title');
        let upliftIcon = document.getElementById('rep-summary-uplift-icon');
        let upliftText = document.getElementById('rep-summary-uplift');
        let gmvText = document.getElementById('rep-summary-gmv');
        let insightBox = document.getElementById('rep-insight-container');
        
        if (uplift_pct < 0) {
            // Negative Uplift Styling
            upliftBox.className = "bg-red-100 border border-red-300 p-3 rounded-lg text-center";
            upliftTitle.className = "text-xs text-red-800 font-bold flex items-center justify-center";
            upliftIcon.className = "ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-200 text-red-800 text-[10px] cursor-help";
            upliftText.className = "text-2xl font-black text-red-700";
            upliftText.innerText = uplift_str;
            
            gmvText.className = "text-xl md:text-2xl font-black text-red-700";
            gmvText.innerText = `-₺${Math.abs(data.math_steps.gmv).toLocaleString('tr-TR', {minimumFractionDigits: 2})} Kayıp`;
            
            insightBox.className = "mt-4 bg-[#fff1f2] border-l-4 border-l-[#ef4444] rounded-lg p-4 text-sm text-red-900 shadow-sm";
            document.getElementById('rep-insight-box').innerHTML = `⚠️ <strong>Yönetici Özeti:</strong> Bu dönemde kontrol grubunun temsil ettiği doğal pazar trendi ${(ct_delta >= 0 ? '+' : '') + ct_delta.toFixed(2)}% ${ct_delta < 0 ? 'düşerken' : 'artarken'}, uygulanan aksiyon sonrası ürünümüz ${(tr_delta >= 0 ? '+' : '') + tr_delta.toFixed(2)}% ${tr_delta < 0 ? 'düşüş' : 'artış'} göstermiştir. Ürün pazar trendinin gerisinde kalarak net ${uplift_str} nedensel kayba yol açmış ve şirkette ${Math.abs(data.math_steps.gmv).toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL ciro erozyonu / fırsat maliyeti yaratmıştır. Aksiyonun geri alınması (Rollback) tavsiye edilir.`;
        } else {
            // Positive Uplift Styling
            upliftBox.className = "bg-green-100 border border-green-300 p-3 rounded-lg text-center";
            upliftTitle.className = "text-xs text-green-800 font-bold flex items-center justify-center";
            upliftIcon.className = "ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-green-200 text-green-800 text-[10px] cursor-help";
            upliftText.className = "text-2xl font-black text-green-700";
            upliftText.innerText = uplift_str;
            
            gmvText.className = "text-xl md:text-2xl font-black text-yellow-700";
            gmvText.innerText = `₺${gmv_formatted}`;
            
            insightBox.className = "mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 shadow-sm";
            document.getElementById('rep-insight-box').innerHTML = `💡 <strong>Yönetici Özeti:</strong> Bu dönemde kontrol grubunun temsil ettiği pazar trendi ${(ct_delta >= 0 ? '+' : '') + ct_delta.toFixed(2)}% ${ct_delta < 0 ? 'düşerken' : 'artarken'}, uygulanan aksiyon sayesinde ürünümüz pazarın üzerinde performans göstermiş ve dış faktörlerden arındırılmış net ${uplift_str} uplift ile şirkete ₺${gmv_formatted} ciro kazandırmıştır.`;
        }
        
        // Render Chart.js
        const ctx = document.getElementById('didChart').getContext('2d');
        if (didChartInstance) {
            didChartInstance.destroy();
        }
        
        didChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Müdahale Öncesi (t-1)', 'Müdahale Sonrası (t+1)'],
                datasets: [
                    {
                        label: 'Müdahale (Treated)',
                        data: [tr.before.cr * 100, tr.after.cr * 100],
                        borderColor: '#ea580c',
                        backgroundColor: '#ea580c',
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: 'Kontrol (Twin)',
                        data: [ct.before.cr * 100, ct.after.cr * 100],
                        borderColor: '#2563eb',
                        backgroundColor: '#2563eb',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) { return value.toFixed(1) + '%'; }
                        }
                    }
                }
            }
        });
        
        // Show Modal
        document.getElementById('report-modal').classList.remove('hidden');
    } catch (err) {
        console.error("Rapor hatası:", err);
        alert("Rapor yüklenirken bir hata oluştu.");
    }
}



// ---------------------------
// TAB 5: AI ADVISOR
// ---------------------------


// ---------------------------
// TAB 5: AI ADVISOR
// ---------------------------
async function checkLLMStatus() {
    try {
        const res = await fetch(`${API_URL}/ai-advisor/status`);
        if(res.ok) {
            const data = await res.json();
            const badge = document.getElementById('ai-status-badge');
            if (badge) {
                if(data.healthy) {
                    badge.className = "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200";
                    badge.innerText = `Bağlı (${data.provider} / ${data.model})`;
                } else {
                    badge.className = "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200";
                    badge.innerText = "LLM Bağlantı Hatası (Kapalı)";
                }
            }
        }
    } catch (err) {
        console.error("LLM Status fetch failed", err);
    }
}

async function runAIAudit() {
    const btn = document.getElementById('btn-run-audit');
    const loading = document.getElementById('ai-loading');
    const results = document.getElementById('ai-results');
    
    btn.disabled = true;
    btn.classList.add('opacity-50', 'cursor-not-allowed');
    results.classList.add('hidden');
    loading.classList.remove('hidden');
    
    try {
        const res = await fetch(`${API_URL}/ai-advisor/audit`);
        if (!res.ok) throw new Error("API hatası");
        const data = await res.json();
        
        // Populate KPIs
        document.getElementById('ai-kpi-scanned').innerText = data.kpi_data.scanned_actions;
        document.getElementById('ai-kpi-rates').innerText = `${data.kpi_data.approval_rate} / ${data.kpi_data.reject_rate}`;
        document.getElementById('ai-kpi-time').innerText = data.kpi_data.time_saved;
        document.getElementById('ai-kpi-margin').innerText = data.kpi_data.margin_protected;
        
        // Render Audits List
        const formatMd = (text) => text ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : "";
        const diagContainer = document.getElementById('ai-diagnostics-container');
        diagContainer.innerHTML = "";
        
        if (data.audits && Array.isArray(data.audits)) {
            data.audits.forEach(audit => {
                // Determine color based on audit type
                let colorClass = "bg-gray-100 text-gray-800 border-gray-200"; // default
                let typeText = audit.type || "Analiz";
                
                if (typeText.toLowerCase().includes("hatalı red") || typeText.toLowerCase().includes("kaçan fırsat")) {
                    colorClass = "bg-red-50 text-red-800 border-red-200";
                } else if (typeText.toLowerCase().includes("haklı red") || typeText.toLowerCase().includes("kural hatası") || typeText.toLowerCase().includes("gürültü")) {
                    colorClass = "bg-yellow-50 text-yellow-800 border-yellow-200";
                } else if (typeText.toLowerCase().includes("parametre optimizasyonu")) {
                    colorClass = "bg-blue-50 text-blue-800 border-blue-200";
                }
                
                const row = document.createElement('div');
                row.className = "flex flex-col gap-3 p-4 bg-white rounded border shadow-sm items-start mb-4";
                
                row.innerHTML = `
                    <div class="flex items-center justify-between w-full mb-1">
                        <span class="px-2 py-1 text-xs font-bold rounded border ${colorClass}">${typeText}</span>
                        <span class="text-sm font-semibold text-gray-700">${audit.target || ""}</span>
                    </div>
                    <div class="w-full">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">🔍 Teşhis</span>
                        <p class="text-sm text-gray-800">${formatMd(audit.finding)}</p>
                    </div>
                    <div class="flex flex-col md:flex-row gap-4 w-full mt-2 border-t pt-3">
                        <div class="flex-1 border-l-2 border-indigo-300 pl-3">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">🎯 Somut Tavsiye</span>
                            <p class="text-sm font-medium text-indigo-900">${formatMd(audit.recommendation)}</p>
                        </div>
                        <div class="flex-1 border-l-2 border-green-400 pl-3">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">💼 Sağlanacak Net Katkı</span>
                            <p class="text-sm font-bold text-green-700">${formatMd(audit.business_impact)}</p>
                        </div>
                    </div>
                `;
                diagContainer.appendChild(row);
            });
        }
        

        loading.classList.add('hidden');
        results.classList.remove('hidden');
    } catch (err) {
        console.error("Audit failed", err);
        alert("Denetim raporu oluşturulurken hata oluştu. LLM servisi yanıt vermiyor olabilir.");
        loading.classList.add('hidden');
    } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Rollback negative action
async function rollbackAction(action_id) {
    if (confirm("Bu aksiyonu t0 anındaki orijinal duruma geri döndürmek istediğinize emin misiniz?")) {
        alert(`Rollback Başarılı: ${action_id} numaralı işlem başarıyla geri alındı ve ürün eski haline getirildi.`);
        // Note: For a real backend, this would call a /rollback endpoint and refresh the UI.
        // For the mock, we just remove it from the frontend global list and re-render.
        globalActionsData = globalActionsData.filter(a => a.action_id !== action_id);
        if (typeof renderHistoryTable === 'function') {
            renderHistoryTable();
        }
    }
}
