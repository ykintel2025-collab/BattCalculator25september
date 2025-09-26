let currentStep = 1;
const totalSteps = 6;
const formAnswers = {};
let priceChart;

const MOCK_DAY_AHEAD_PRICES = [0.05,0.04,0.03,0.03,0.04,0.07,0.12,0.14,0.13,0.11,0.08,0.06,0.02,0.01,0.02,0.05,0.10,0.15,0.16,0.13,0.11,0.09,0.08,0.06];
const ENERGY_API_URL = '/.netlify/functions/get-prices';

async function fetchEnergyPrices() {
    try {
        const response = await fetch(ENERGY_API_URL);
        if (!response.ok) {
            console.warn("API niet bereikbaar, fallback naar gesimuleerde data.");
            return MOCK_DAY_AHEAD_PRICES;
        }
        const data = await response.json();
        const today = new Date().toISOString().split('T')[0];
        const todayPrices = data.prices
            .filter(p => p.from.startsWith(today))
            .map(p => p.price);
        return todayPrices.length >= 24 ? todayPrices.slice(0, 24) : MOCK_DAY_AHEAD_PRICES;
    } catch (error) {
        console.error("Fout bij het ophalen van energieprijzen:", error);
        return MOCK_DAY_AHEAD_PRICES;
    }
}

document.addEventListener('DOMContentLoaded', () => { document.getElementById('startBtn').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('start-scherm').style.display = 'none'; document.getElementById('calculator-scherm').style.display = 'block'; showStep(1); }); });
function showStep(step) { document.querySelectorAll('.step-container').forEach(el => el.classList.remove('active')); const el = document.getElementById(`step-${step}`) || document.getElementById('resultaat-stap'); if (el) el.classList.add('active'); updateButtons(); }
function updateButtons() { const t = document.getElementById('terugBtn'), v = document.getElementById('volgendeBtn'); t.style.display = (currentStep > 1 && currentStep <= totalSteps + 1) ? 'block' : 'none'; v.style.display = (currentStep <= totalSteps) ? 'block' : 'none'; let isLast = isLastStep(); v.textContent = isLast ? 'Bereken advies' : 'Volgende →'; }
function isLastStep() { let tempStep = currentStep; while (tempStep < totalSteps) { tempStep++; if (!isStepSkipped(tempStep)) return false; } return true; }
function isStepSkipped(step) { if (step === 3 && formAnswers['step-2'] === 'ja') return true; if (step === 4 && formAnswers['step-2'] === 'nee') return true; return false; }
function nextStep() { const cs = document.getElementById(`step-${currentStep}`); const so = cs.querySelector('.selected'); if (currentStep === 4) { const pi = document.getElementById('panelenInput'); if (!pi.value || parseInt(pi.value) <= 0) { alert("Vul een geldig aantal zonnepanelen in."); return; } formAnswers[`step-${currentStep}`] = parseInt(pi.value); cs.querySelector('.answer-option').classList.add('selected'); } else { if (!so) { alert("Selecteer een optie."); return; } formAnswers[`step-${currentStep}`] = so.dataset.value; } if (isLastStep()) { berekenAdvies(); return; } do { currentStep++; } while (isStepSkipped(currentStep)); showStep(currentStep); }
function prevStep() { delete formAnswers[`step-${currentStep}`]; do { currentStep--; } while (isStepSkipped(currentStep)); if (currentStep >= 1) showStep(currentStep); }
function selectAnswer(step, element) { const c = document.getElementById(`step-${step}`); c.querySelectorAll('.answer-option').forEach(el => el.classList.remove('selected')); element.classList.add('selected'); }

async function berekenAdvies() {
    currentStep = totalSteps + 1;
    const livePrices = await fetchEnergyPrices();
    setupInteractiveControls(livePrices);
    showStep('resultaat-stap');
}

function setupInteractiveControls(livePrices) {
    const controls = ['verbruikSlider', 'panelenSlider', 'evSelect', 'wpSelect'];
    controls.forEach(id => { const el = document.getElementById(id); const eventType = (el.type === 'range' || el.tagName === 'SELECT') ? 'input' : 'change'; el.addEventListener(eventType, () => recalculateAndRedraw(livePrices)); });
    document.getElementById('verbruikSlider').value = formAnswers['step-1'] || 3000;
    document.getElementById('panelenSlider').value = (formAnswers['step-2'] === 'ja' && formAnswers['step-4']) ? formAnswers['step-4'] : (formAnswers['step-3'] === 'ja' ? 12 : 0);
    document.getElementById('evSelect').value = formAnswers['step-5'] === 'ja' ? "3600" : "0";
    document.getElementById('wpSelect').value = formAnswers['step-6'] === 'ja' ? "2500" : "0";
    recalculateAndRedraw(livePrices);
}

function recalculateAndRedraw(livePrices) {
    const state = { 
        basisVerbruikKwh: parseInt(document.getElementById('verbruikSlider').value),
        aantalPanelen: parseInt(document.getElementById('panelenSlider').value),
        evVerbruikKwh: parseInt(document.getElementById('evSelect').value),
        wpVerbruikKwh: parseInt(document.getElementById('wpSelect').value),
        heeftZonnepanelenInitieel: formAnswers['step-2'] === 'ja'
    };
    const calculations = calculateAdvice(state);
    updateDashboardUI(state, calculations, livePrices);
}

function calculateAdvice(state) {
    const jaarlijksVerbruikKwh = state.basisVerbruikKwh + state.evVerbruikKwh + state.wpVerbruikKwh;
    const totaalDagelijksVerbruik = jaarlijksVerbruikKwh / 365;
    let totaalWp = 0;
    if (state.aantalPanelen > 0) { const paneelType = state.heeftZonnepanelenInitieel ? 400 : 430; totaalWp = state.aantalPanelen * paneelType; }
    const dagelijkseOpbrengst = totaalWp * 0.9 / 365;
    const verbruikProfielRaw = [0.03,0.02,0.02,0.02,0.03,0.05,0.07,0.06,0.05,0.04,0.04,0.04,0.05,0.04,0.04,0.05,0.06,0.08,0.09,0.08,0.07,0.06,0.05,0.04];
    const sumProfiel = verbruikProfielRaw.reduce((a, b) => a + b, 0);
    const verbruikProfiel = verbruikProfielRaw.map(p => p / sumProfiel);
    const zonneProfiel = [0,0,0,0,0,0.01,0.03,0.06,0.09,0.11,0.13,0.14,0.13,0.12,0.09,0.05,0.03,0.01,0,0,0,0,0,0];
    const geschaaldVerbruik = verbruikProfiel.map(p => p * totaalDagelijksVerbruik);
    const geschaaldeOpbrengst = zonneProfiel.map(p => p * dagelijkseOpbrengst);
    const totaalOverschot = geschaaldeOpbrengst.reduce((sum, opbrengst, i) => { const overschot = opbrengst - geschaaldVerbruik[i]; return sum + (overschot > 0 ? overschot : 0); }, 0);
    const batterijCapaciteit = Math.max(5, Math.ceil(totaalOverschot / 5) * 5);
    return { batterijCapaciteit, geschaaldVerbruik, geschaaldeOpbrengst };
}

function updateDashboardUI(state, calcs, prices) {
    document.getElementById('verbruikValue').textContent = `${state.basisVerbruikKwh} kWh`;
    document.getElementById('panelenValue').textContent = `${state.aantalPanelen}`;
    document.getElementById('capaciteitResultaat').textContent = `${calcs.batterijCapaciteit.toFixed(1)} kWh`;
    renderPriceChart(prices);
}

function renderPriceChart(prices) {
    const ctx = document.getElementById('priceChartCanvas').getContext('2d');
    if (!ctx) return;
    if (priceChart) priceChart.destroy();
    priceChart = new Chart(ctx, { type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [{ label: 'Kale Stroomprijs (€/kWh)', data: prices, backgroundColor: prices.map(p => p < 0.05 ? 'rgba(46, 204, 113, 0.7)' : (p > 0.15 ? 'rgba(231, 76, 60, 0.7)' : 'rgba(243, 156, 18, 0.7)')) }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `€ ${c.raw.toFixed(3)}` } } }, scales: { y: { beginAtZero: true, title: {display: true, text: 'Kale Prijs (€/kWh)'} } } } });
}
