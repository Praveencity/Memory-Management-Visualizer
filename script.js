function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    
    const isDark = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    icon.textContent = isDark ? '☀️' : '🌙';
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

function switchTab(mode, btn) {
    document.querySelectorAll('.mode-container').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(mode).classList.add('active');
    btn.classList.add('active'); 
}


function handleEnter(e, func) { if(e.key === 'Enter') func(); }

async function initPaging(btn) {
    const frames = parseInt(document.getElementById('pgFrames').value, 10);

    pageTable = {};
    frameToPage = Array(frames).fill(null);
    lastUsed = Array(frames).fill(-1);
    nextFrame = 0;
    globalTime = 0;

    if (btn) {
        const originalText = btn.innerText;
        btn.innerText = "Resetting...";
        setTimeout(() => { btn.innerText = originalText; }, 500);
    }

    document.getElementById('pagingLogs').innerHTML =
        '<div class="log-entry">> Memory cleared. System ready.</div>';

    drawFrames(frameToPage, -1, "");
    document.getElementById('pagingMath').innerText = "System reset complete.";
}


let pageTable = {};
let frameToPage = [];
let lastUsed = [];       
let nextFrame = 0;
let globalTime = 0;

async function stepPaging() {
    const addrInput = document.getElementById('pgAddr').value;
    const addr = parseInt(addrInput, 10);
    const pageSize = parseInt(document.getElementById('pgSize').value, 10);
    const frames = parseInt(document.getElementById('pgFrames').value, 10);
    const algo = document.getElementById('pgAlgo').value; // 🚀 IMPORTANT!!
    
    if (isNaN(addr)) return;

    // Initialize structures if needed
    if (frameToPage.length !== frames) {
        frameToPage = Array(frames).fill(null);
        lastUsed = Array(frames).fill(-1);
        pageTable = {};
        nextFrame = 0;
        globalTime = 0;
    }

    globalTime++;

    const pageNum = Math.floor(addr / pageSize);
    const offset = addr % pageSize;

    let status = "";
    let activeFrame = -1;

    // HIT
    if (pageTable[pageNum] !== undefined) {
        status = "HIT";
        activeFrame = pageTable[pageNum];
        lastUsed[activeFrame] = globalTime; // update LRU time
    }

    // MISS
    else {
        status = "MISS";

        // FIFO
        if (algo === "FIFO") {
            activeFrame = nextFrame % frames;
            nextFrame++;
        }

        // LRU
        else if (algo === "LRU") {
            let minTime = Infinity;
            let lruFrame = 0;

            for (let i = 0; i < frames; i++) {
                if (lastUsed[i] < minTime) {
                    minTime = lastUsed[i];
                    lruFrame = i;
                }
            }
            activeFrame = lruFrame;
        }

        // Remove existing page
        const oldPage = frameToPage[activeFrame];
        if (oldPage !== null) delete pageTable[oldPage];

        // Insert new page
        frameToPage[activeFrame] = pageNum;
        pageTable[pageNum] = activeFrame;
        lastUsed[activeFrame] = globalTime;
    }

    drawFrames(frameToPage.map(p => p === null ? "Empty" : p), activeFrame, status);

    document.getElementById("pagingMath").innerText =
        `Page=${pageNum} Offset=${offset} Frame=${activeFrame} (${status}, ${algo})`;

    document.getElementById("pagingLogs").innerHTML =
        `<div class="log-entry">> ${status}: Page ${pageNum} → Frame ${activeFrame} (Algo=${algo})</div>`
        + document.getElementById("pagingLogs").innerHTML;

    document.getElementById("pgAddr").value = "";
    document.getElementById("pgAddr").focus();
}


function drawFrames(frames, activeIdx, status) {
    const div = document.getElementById('pagingFrames');
    div.innerHTML = '';
    
    if(frames.length === 0) {
         const count = document.getElementById('pgFrames').value;
         for(let i=0; i<count; i++) frames.push("Empty");
    }

    frames.forEach((pg, i) => {
        let cls = 'memory-frame'; 
        let badge = 'Idle';
        
        if(i === activeIdx) {
            cls += (status === 'HIT' ? ' hit' : ' miss');
            badge = status;
        }
        
        const content = pg === "Empty" ? "--" : "P" + pg;
        
        div.innerHTML += `
            <div class="${cls}">
                <div class="frame-id">Frame ${i}</div>
                <div class="frame-content">${content}</div>
                <div class="frame-status">${badge}</div>
            </div>`;
    });
}

const defaultSegs = [
    {base: 1000, limit: 500}, {base: 500, limit: 100}, 
    {base: 3000, limit: 200}, {base: 0, limit: 0}
];

function renderSegInputs() {
    const tbody = document.getElementById('segTableBody');
    tbody.innerHTML = '';
    defaultSegs.forEach((s, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i}</td>
                <td><input type="number" class="base-in" value="${s.base}" style="width:80px"></td>
                <td><input type="number" class="limit-in" value="${s.limit}" style="width:80px"></td>
            </tr>`;
    });
}
renderSegInputs();

async function initSegmentation(btn) {
    const bases = document.querySelectorAll('.base-in');
    const limits = document.querySelectorAll('.limit-in');
    let segData = [];

    bases.forEach((b, i) => {
        segData.push({ base: b.value, limit: limits[i].value });
    });

    if (btn) {
        btn.innerText = "Saved!";
        setTimeout(() => { btn.innerText = "Update Table"; }, 800);
    }

    document.getElementById('segLogs').innerHTML =
        `<div class="log-entry">> Segment table updated (Backend Disabled).</div>` +
        document.getElementById('segLogs').innerHTML;
}

async function stepSegmentation() {
    const segId = parseInt(document.getElementById("segIndex").value);
    const offset = parseInt(document.getElementById("segOffset").value);

    const bases = document.querySelectorAll(".base-in");
    const limits = document.querySelectorAll(".limit-in");

    if (segId < 0 || segId >= bases.length) {
        document.getElementById("segMath").innerText = "Invalid segment ID!";
        return;
    }

    const base = parseInt(bases[segId].value);
    const limit = parseInt(limits[segId].value);

    if (offset >= limit) {
        document.getElementById("segMath").innerText =
            `Segmentation Fault! Offset (${offset}) ≥ Limit (${limit})`;
        return;
    }

    const physical = base + offset;

    document.getElementById("segMath").innerText =
        `Physical Address = Base(${base}) + Offset(${offset}) = ${physical}`;

    document.getElementById("segLogs").innerHTML =
        `<div class="log-entry">> Translated: ${physical}</div>` +
        document.getElementById("segLogs").innerHTML;
}


window.onload = () => { 
    loadTheme();
    initPaging(); 
    initSegmentation(); 
};
