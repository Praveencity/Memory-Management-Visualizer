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

function switchTab(mode) {
    document.querySelectorAll('.mode-container').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(mode).classList.add('active');
    event.target.classList.add('active');
}
function handleEnter(e, func) { if(e.key === 'Enter') func(); }

async function initPaging() {
    const frames = document.getElementById('pgFrames').value;
    const size = document.getElementById('pgSize').value;
    const algo = document.getElementById('pgAlgo').value;
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Resetting...";
    
    await fetch('/paging/init', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({frames, pageSize: size, algo})
    });
    
    setTimeout(() => { btn.innerText = originalText; }, 500);

    document.getElementById('pagingLogs').innerHTML = '<div class="log-entry">> Memory cleared. System ready.</div>';
    drawFrames([], -1, "");
    document.getElementById('pagingMath').innerText = "System reset complete.";
}

async function stepPaging() {
    const addr = document.getElementById('pgAddr').value;
    if(!addr) return;
    const res = await fetch('/paging/step', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({address: addr})
    });
    const data = await res.json();
    
    document.getElementById('pagingMath').innerHTML = 
        `Logical: ${data.logical_address} = (Page ${data.page_id} × ${document.getElementById('pgSize').value}) + Offset ${data.offset} <br> <strong>Physical Address: ${data.physical_address}</strong>`;

    
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});
    
    const msg = `
        <span class="log-time">[${time}]</span>
        Req: ${data.logical_address} (P${data.page_id}) 
        <strong style="color: ${data.status === 'HIT' ? '#10b981' : '#ef4444'}">${data.status}</strong> 
        → Frame ${data.frame_index}
        ${data.victim !== null ? `<span style="color:#f87171"> [Evicted: P${data.victim}]</span>` : ''}
    `;
    
    const logBox = document.getElementById('pagingLogs');
    logBox.innerHTML = `<div class="log-entry">${msg}</div>` + logBox.innerHTML;

    drawFrames(data.memory_state, data.frame_index, data.status);
    document.getElementById('pgAddr').value = '';
    document.getElementById('pgAddr').focus();
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

async function initSegmentation() {
    const bases = document.querySelectorAll('.base-in');
    const limits = document.querySelectorAll('.limit-in');
    let segData = [];
    bases.forEach((b, i) => { segData.push({base: b.value, limit: limits[i].value}); });

    const btn = event.target;
    btn.innerText = "Saved!";
    
    await fetch('/segmentation/init', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({segments: segData})
    });
    
    setTimeout(() => { btn.innerText = "Update Table"; }, 800);
    document.getElementById('segLogs').innerHTML = `<div class="log-entry">> Segment table updated.</div>` + document.getElementById('segLogs').innerHTML;
}

async function stepSegmentation() {
    const s = document.getElementById('segIndex').value;
    const o = document.getElementById('segOffset').value;
    const res = await fetch('/segmentation/step', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({seg: s, off: o})
    });
    const data = await res.json();

    let msg = '';
    const time = new Date().toLocaleTimeString('en-US', {hour12:false});

    if (data.status === 'ERROR' || data.status === 'TRAP') {
        msg = `<strong style="color:#ef4444">${data.status}</strong>: ${data.error}`;
    } else {
        msg = `<strong style="color:#10b981">VALID</strong>: Phys Addr ${data.physical_address}`;
    }
    
    document.getElementById('segMath').innerHTML = data.status === 'VALID' ? 
        `Base ${data.physical_address - data.offset} + Offset ${data.offset} = <strong>${data.physical_address}</strong>` : data.error;
        
    const logBox = document.getElementById('segLogs');
    logBox.innerHTML = `<div class="log-entry"><span class="log-time">[${time}]</span> Seg ${s}: ${msg}</div>` + logBox.innerHTML;
}

window.onload = () => { 
    loadTheme();
    initPaging(); 
    initSegmentation(); 
};
