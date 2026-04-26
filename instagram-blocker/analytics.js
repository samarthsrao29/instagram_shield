const canvas = document.getElementById('usageChart');
const ctx = canvas.getContext('2d');
let currentMode = 'week'; // 'week' or 'month'
let historyData = {};

function formatMsToMinutes(ms) {
    return Math.floor(ms / 60000);
}

function formatMsToHoursAndMins(ms) {
    const totalMins = Math.floor(ms / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
}

function getPastDates(daysCount) {
    const dates = [];
    for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

function seedMockDataIfNeeded(history) {
    const keys = Object.keys(history);
    
    // Auto-seed mock data if empty or only has today, so the graph isn't entirely empty on first launch
    if (keys.length <= 1) {
        for (let i = 1; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            history[dateStr] = {
                instaTimeMs: Math.random() * 4 * 60 * 1000, // random up to 4 mins
                readTimeMs: Math.random() * 15 * 60 * 1000, 
                blocksCount: Math.floor(Math.random() * 3)
            };
        }
    }
    return history;
}

let lastDates = [];
let lastValues = [];
let hoverIndex = -1;

function drawChart(dates, dataValues, activeIndex = -1) {
    lastDates = dates;
    lastValues = dataValues;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const maxVal = Math.max(...dataValues, 5); // Ensure at least some height
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    const barWidth = (chartWidth / dates.length) * 0.7;
    const spacing = (chartWidth / dates.length);
    
    // Draw axes
    ctx.strokeStyle = '#e5e5ea';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();

    // Draw grid lines (horizontal)
    ctx.strokeStyle = '#f2f2f7';
    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
    }
    
    // Draw bars
    for (let i = 0; i < dates.length; i++) {
        const val = dataValues[i];
        const barHeight = (val / maxVal) * chartHeight;
        const x = padding + (i * spacing) + (spacing - barWidth) / 2;
        const y = padding + chartHeight - barHeight;
        
        const isHovered = i === activeIndex;
        
        // Bar color
        ctx.fillStyle = isHovered ? '#005bb7' : '#0071e3';
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0]);
        ctx.fill();
        
        // Draw value on top
        if (val > 0 || isHovered) {
            // Only show all values if week view, otherwise only show on hover
            if (dates.length <= 7 || isHovered) {
                ctx.fillStyle = isHovered ? '#000000' : '#86868b';
                ctx.font = isHovered ? 'bold 13px sans-serif' : '11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${val}m`, x + barWidth/2, y - 10);
            }
        }
        
        // Draw labels
        if (dates.length <= 7 || i % 5 === 0 || isHovered) {
            ctx.fillStyle = isHovered ? '#1d1d1f' : '#86868b';
            ctx.font = isHovered ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.textAlign = 'center';
            const dateObj = new Date(dates[i]);
            const label = `${dateObj.getMonth()+1}/${dateObj.getDate()}`;
            ctx.fillText(label, x + barWidth/2, padding + chartHeight + 22);
        }
    }
}

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const spacing = (chartWidth / lastDates.length);
    
    const index = Math.floor((x - padding) / spacing);
    
    if (index >= 0 && index < lastDates.length) {
        if (index !== hoverIndex) {
            hoverIndex = index;
            drawChart(lastDates, lastValues, hoverIndex);
        }
    } else {
        if (hoverIndex !== -1) {
            hoverIndex = -1;
            drawChart(lastDates, lastValues, -1);
        }
    }
});

canvas.addEventListener('mouseleave', () => {
    hoverIndex = -1;
    drawChart(lastDates, lastValues, -1);
});

function updateAnalytics() {
    const days = currentMode === 'week' ? 7 : 30;
    const dates = getPastDates(days);
    
    let chartValues = [];
    let grandTotalMs = 0;
    let totalReadMs = 0;
    let totalBlocks = 0;
    
    for (const date of dates) {
        const dayData = historyData[date];
        let valMs = 0;
        if (dayData) {
            valMs = dayData.instaTimeMs || 0;
            totalReadMs += dayData.readTimeMs || 0;
            totalBlocks += dayData.blocksCount || 0;
        }
        chartValues.push(formatMsToMinutes(valMs));
        grandTotalMs += valMs;
    }
    
    drawChart(dates, chartValues);
    
    document.getElementById('total-time-label').textContent = `Total: ${formatMsToHoursAndMins(grandTotalMs)}`;
    document.getElementById('avg-daily').textContent = formatMsToHoursAndMins(grandTotalMs / days);
    document.getElementById('total-reading').textContent = formatMsToHoursAndMins(totalReadMs);
    document.getElementById('total-blocks').textContent = totalBlocks;
}

document.getElementById('btn-week').addEventListener('click', (e) => {
    currentMode = 'week';
    document.getElementById('btn-week').classList.add('active');
    document.getElementById('btn-month').classList.remove('active');
    updateAnalytics();
});

document.getElementById('btn-month').addEventListener('click', (e) => {
    currentMode = 'month';
    document.getElementById('btn-month').classList.add('active');
    document.getElementById('btn-week').classList.remove('active');
    updateAnalytics();
});

async function init() {
    const result = await chrome.storage.local.get(['history', 'stats']);
    historyData = result.history || {};
    
    if (result.stats && result.stats.date) {
        historyData[result.stats.date] = historyData[result.stats.date] || {};
        historyData[result.stats.date].instaTimeMs = result.stats.instaTimeMs;
        historyData[result.stats.date].readTimeMs = result.stats.readTimeMs;
        historyData[result.stats.date].blocksCount = result.stats.blocksCount;
    }
    
    historyData = seedMockDataIfNeeded(historyData);
    
    updateAnalytics();
}

init();
