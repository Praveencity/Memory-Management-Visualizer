// --- THEME LOGIC ---
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    icon.className = isDark ? 'ph ph-sun' : 'ph ph-moon';
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    } else {
        updateThemeIcon(false);
    }
}

function switchTab(mode) {
    document.querySelectorAll('.mode-container').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(mode).classList.add('active');
    event.currentTarget.classList.add('active');
}

function handleEnter(e, func) { if(e.key === 'Enter') func(); }

// --- PAGING STATE & LOGIC ---
let pagingState = {
    frames: [], // Array of objects: { pageId, loadedAt, lastAccess }
    frameCount: 4,
    pageSize: 1024,
    algo: 'FIFO',
    clock: 0
};

function initPaging() {
    pagingState.frameCount = parseInt(document.getElementById('pgFrames').value);
    pagingState.pageSize = parseInt(document.getElementById('pgSize').value);
    pagingState.algo = document.getElementById('pgAlgo').value;
    pagingState.frames = new Array(pagingState.frameCount).fill(null);
    pagingState.clock = 0;

    const btn = event ? event.target.closest('button') : null;
    if(btn) animateBtn(btn);

    logPaging("INFO", "Reset", `Cleared memory. Frames: ${pagingState.frameCount}, Algo: ${pagingState.algo}`);
    drawPagingFrames(null, null);
    document.getElementById('pagingMath').innerHTML = '<i class="ph ph-check"></i> System reset complete.';
}

function stepPaging() {
    const addrInput = document.getElementById('pgAddr');
    const addr = parseInt(addrInput.value);
    
    if (isNaN(addr) || addr < 0) {
        alert("Please enter a valid positive integer address.");
        return;
    }

    pagingState.clock++;
    const pageId = Math.floor(addr / pagingState.pageSize);
    const offset = addr % pagingState.pageSize;

    let frameIndex = pagingState.frames.findIndex(f => f && f.pageId === pageId);
    let status = 'MISS';
    let victimId = null;

    if (frameIndex !== -1) {
        status = 'HIT';
        pagingState.frames[frameIndex].lastAccess = pagingState.clock;
    } else {
        const emptyIndex = pagingState.frames.findIndex(f => f === null);
        
        if (emptyIndex !== -1) {
            frameIndex = emptyIndex;
            pagingState.frames[frameIndex] = { pageId, loadedAt: pagingState.clock, lastAccess: pagingState.clock };
        } else {
            let victimIdx = -1;
            let minTime = Infinity;
            
            pagingState.frames.forEach((f, i) => {
                const t = pagingState.algo === 'FIFO' ? f.loadedAt : f.lastAccess;
                if (t < minTime) { minTime = t; victimIdx = i; }
            });
            
            victimId = pagingState.frames[victimIdx].pageId;
            frameIndex = victimIdx;
            pagingState.frames[frameIndex] = { pageId, loadedAt: pagingState.clock, lastAccess: pagingState.clock };
        }
    }

    const physicalAddr = (frameIndex * pagingState.pageSize) + offset;
    
    document.getElementById('pagingMath').innerHTML = `
        <div><strong>Logical Addr:</strong> ${addr} (Page ${pageId}, Offset ${offset})</div>
        <div style="margin-top:4px; color: var(--primary)"><strong>Physical Addr:</strong> Frame ${frameIndex} × ${pagingState.pageSize} + ${offset} = <strong>${physicalAddr}</strong></div>
    `;

    let logMsg = `Req: ${addr} (P${pageId}) → Frame ${frameIndex}`;
    if (victimId !== null) logMsg += ` [Evicted P${victimId}]`;
    logPaging(status, status === 'HIT' ? 'Hit' : 'Miss', logMsg);

    drawPagingFrames(frameIndex, status);

    addrInput.value = '';
    addrInput.focus();
}

function drawPagingFrames(activeIdx, status) {
    const container = document.getElementById('pagingFrames');
    container.innerHTML = '';

    for (let i = 0; i < pagingState.frameCount; i++) {
        const frameData = pagingState.frames[i];
        let cls = 'memory-frame';
        let content = '--';
        let badge = 'Empty';

        if (frameData) {
            content = 'P' + frameData.pageId;
            badge = 'Occupied';
        }

        if (i === activeIdx && status) {
            cls += status === 'HIT' ? ' hit' : ' miss';
            badge = status;
        }

        container.innerHTML += `
            <div class="${cls}">
                <div class="frame-id">Frame ${i}</div>
                <div class="frame-content">${content}</div>
                <div class="frame-badge">${badge}</div>
            </div>
        `;
    }
}

function logPaging(type, tag, msg) {
    logGeneric('pagingLogs', type, tag, msg);
}

// --- SEGMENTATION LOGIC ---
let segmentationState = {
    segments: [
        {base: 1000, limit: 500}, 
        {base: 500, limit: 100}, 
        {base: 3000, limit: 200}, 
        {base: 0, limit: 0}
    ]
};

function renderSegInputs() {
    const tbody = document.getElementById('segTableBody');
    tbody.innerHTML = '';
    segmentationState.segments.forEach((s, i) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${i}</strong></td>
                <td><input type="number" class="base-in" value="${s.base}"></td>
                <td><input type="number" class="limit-in" value="${s.limit}"></td>
            </tr>`;
    });
}

function initSegmentation() {
    const bases = document.querySelectorAll('.base-in');
    const limits = document.querySelectorAll('.limit-in');
    let newSegs = [];
    
    bases.forEach((b, i) => {
        newSegs.push({
            base: parseInt(b.value) || 0,
            limit: parseInt(limits[i].value) || 0
        });
    });
    segmentationState.segments = newSegs;

    const btn = event ? event.target.closest('button') : null;
    if(btn) animateBtn(btn, "Saved!");

    logGeneric('segLogs', "INFO", "Updated", "Segment table configurations saved.");
}

function stepSegmentation() {
    const segIdx = parseInt(document.getElementById('segIndex').value);
    const offset = parseInt(document.getElementById('segOffset').value);

    if (isNaN(segIdx) || isNaN(offset)) {
        alert("Please enter valid numbers.");
        return;
    }

    const segment = segmentationState.segments[segIdx];
    let status = 'VALID';
    let error = '';
    let physAddr = 0;

    if (!segment) {
        status = 'ERROR';
        error = 'Segment ID out of bounds';
    } else if (offset >= segment.limit) {
        status = 'TRAP';
        error = `Offset ${offset} > Limit ${segment.limit} (Seg Fault)`;
    } else {
        physAddr = segment.base + offset;
    }

    const mathBox = document.getElementById('segMath');
    if (status === 'VALID') {
        mathBox.innerHTML = `
            <div style="color: var(--success); font-weight:bold; margin-bottom:4px;">
                <i class="ph ph-check-circle"></i> VALID ADDRESS
            </div>
            Base ${segment.base} + Offset ${offset} = <strong>${physAddr}</strong>
        `;
        mathBox.style.borderLeftColor = 'var(--success)';
    } else {
        mathBox.innerHTML = `
            <div style="color: var(--error); font-weight:bold; margin-bottom:4px;">
                <i class="ph ph-warning-circle"></i> ${status}
            </div>
            ${error}
        `;
        mathBox.style.borderLeftColor = 'var(--error)';
    }

    const msg = status === 'VALID' ? `Seg ${segIdx} + ${offset} → Phys ${physAddr}` : error;
    logGeneric('segLogs', status, status, msg);
}

// --- VIRTUAL MEMORY LOGIC ---
// VM state
let vmPageToFrame = []; 
let vmFrameToPage = []; 
let vmLastUsed = [];    
let vmInSwap = [];      
let vmNextFrame = 0;
let vmGlobalTime = 0;
let vmStats = { hits: 0, misses: 0, faults: 0 };

function initVirtualMemory() {
    const frames = parseInt(document.getElementById('vmFrames').value, 10) || 4;
    const pages = parseInt(document.getElementById('vmPages').value, 10) || 8;

    const btn = event ? event.target.closest('button') : null;
    if(btn) animateBtn(btn);

    vmFrameToPage = Array(frames).fill(null);
    vmPageToFrame = Array(pages).fill(null);
    vmLastUsed = Array(frames).fill(-1);
    vmInSwap = Array(pages).fill(false);
    vmNextFrame = 0;
    vmGlobalTime = 0;
    vmStats = { hits: 0, misses: 0, faults: 0 };

    document.getElementById('vmMath').innerHTML =
        '<i class="ph ph-info"></i> Virtual memory reset. Ready for requests.';
    logGeneric('vmLogs', "INFO", "Reset", `VM Initialized. Virt Pages: ${pages}, Phys Frames: ${frames}`);

    drawVMFrames(-1, "");
    renderVMSwapList();
}

function stepVirtualMemory() {
    const addrInput = document.getElementById('vmAddr');
    const addr = parseInt(addrInput.value, 10);
    const frames = parseInt(document.getElementById('vmFrames').value, 10);
    const pages = parseInt(document.getElementById('vmPages').value, 10);
    const pageSize = parseInt(document.getElementById('vmPageSize').value, 10);
    const algo = document.getElementById('vmAlgo').value;

    if (isNaN(addr) || addr < 0) {
        alert("Please enter a valid positive address.");
        return;
    }

    // Sync state if config changed dynamically
    if (vmFrameToPage.length !== frames || vmPageToFrame.length !== pages) {
        initVirtualMemory();
    }

    const maxAddr = pages * pageSize - 1;
    if (addr > maxAddr) {
        alert(`Address out of bounds! Max is ${maxAddr}`);
        return;
    }

    vmGlobalTime++;
    const pageNum = Math.floor(addr / pageSize);
    const offset = addr % pageSize;

    let status = '';
    let frameIndex = vmPageToFrame[pageNum];
    let evictedPage = null;

    if (frameIndex !== null && frameIndex !== undefined) {
        // HIT
        status = 'HIT';
        vmStats.hits++;
        vmLastUsed[frameIndex] = vmGlobalTime;
    } else {
        // MISS
        status = 'MISS';
        vmStats.misses++;
        vmStats.faults++;

        let targetFrame = -1;
        const freeIdx = vmFrameToPage.indexOf(null);

        if (freeIdx !== -1) {
            targetFrame = freeIdx;
        } else {
            if (algo === 'FIFO') {
                targetFrame = vmNextFrame % frames;
                vmNextFrame++;
            } else { // LRU
                let minTime = Infinity;
                let lruIdx = 0;
                for (let i = 0; i < frames; i++) {
                    if (vmLastUsed[i] < minTime) {
                        minTime = vmLastUsed[i];
                        lruIdx = i;
                    }
                }
                targetFrame = lruIdx;
            }
        }

        evictedPage = vmFrameToPage[targetFrame];

        // Evict to swap
        if (evictedPage !== null && evictedPage !== undefined) {
            vmPageToFrame[evictedPage] = null;
            vmInSwap[evictedPage] = true;
        }

        // Bring in new page
        vmFrameToPage[targetFrame] = pageNum;
        vmPageToFrame[pageNum] = targetFrame;
        vmInSwap[pageNum] = false;
        vmLastUsed[targetFrame] = vmGlobalTime;

        frameIndex = targetFrame;
    }

    // UI Updates
    drawVMFrames(frameIndex, status);
    renderVMSwapList();

    const totalAccesses = vmStats.hits + vmStats.misses;
    const hitRate = totalAccesses > 0 ? (vmStats.hits / totalAccesses * 100).toFixed(1) : '0.0';

    document.getElementById('vmMath').innerHTML = `
        <div>Logical: <strong>${addr}</strong> (Page ${pageNum}, Offset ${offset})</div>
        <div style="font-size:0.85rem; margin-top:6px; color:var(--text-muted)">
           Hits: ${vmStats.hits} | Misses: ${vmStats.misses} | Rate: ${hitRate}%
        </div>
    `;

    let logDetails = `Page ${pageNum} → Frame ${frameIndex}`;
    if (status === 'MISS' && evictedPage !== null) logDetails += ` (Evicted P${evictedPage} to Swap)`;
    
    logGeneric('vmLogs', status, status, logDetails);

    addrInput.value = '';
    addrInput.focus();
}

function drawVMFrames(activeIdx, status) {
    const div = document.getElementById('vmFramesView');
    div.innerHTML = '';

    vmFrameToPage.forEach((page, i) => {
        let cls = 'memory-frame';
        let badge = 'Idle';
        let content = '--';

        if (page !== null) {
            content = 'P' + page;
            badge = 'Active';
        }

        if (i === activeIdx && status) {
            cls += (status === 'HIT' ? ' hit' : ' miss');
            badge = status;
        }

        div.innerHTML += `
            <div class="${cls}">
                <div class="frame-id">Frame ${i}</div>
                <div class="frame-content">${content}</div>
                <div class="frame-badge">${badge}</div>
            </div>`;
    });
    
    if (vmFrameToPage.length === 0) {
         div.innerHTML = '<div style="color:var(--text-muted); width:100%; text-align:center;">Configure VM to see frames.</div>';
    }
}

function renderVMSwapList() {
    const ul = document.getElementById('vmSwapList');
    ul.innerHTML = '';

    let any = false;
    vmInSwap.forEach((isInSwap, pageIdx) => {
        if (isInSwap) {
            any = true;
            ul.innerHTML += `
                <li class="swap-item">
                    <span><i class="ph ph-file"></i> Page ${pageIdx}</span>
                    <span class="swap-tag"><i class="ph ph-hard-drives"></i> SWAPPED</span>
                </li>
            `;
        }
    });

    if (!any) {
        ul.innerHTML = '<li class="swap-item empty">Disk is empty. No pages swapped out.</li>';
    }
}

// --- COMMON UTILS ---
function animateBtn(btn, text) {
    if(!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Processing`;
    setTimeout(() => { 
        btn.innerHTML = text ? `<i class="ph ph-check"></i> ${text}` : original; 
        if(text) setTimeout(() => btn.innerHTML = original, 1000);
    }, 400);
}

function logGeneric(elementId, type, tag, msg) {
    const panel = document.getElementById(elementId);
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    
    let tagClass = 'tag-info';
    if (type === 'HIT' || type === 'VALID') tagClass = 'tag-hit';
    if (type === 'MISS' || type === 'ERROR' || type === 'TRAP') tagClass = 'tag-miss';
    if (type === 'SWAP') tagClass = 'tag-swap';

    const html = `
        <div class="log-entry">
            <span class="log-time">${time}</span>
            <span class="log-tag ${tagClass}">${tag}</span>
            <span>${msg}</span>
        </div>
    `;
    panel.insertAdjacentHTML('afterbegin', html);
}

// --- INIT ---
window.onload = () => { 
    loadTheme();
    renderSegInputs();
    initPaging();
    initVirtualMemory();
};