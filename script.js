let currentStep = 1;
const totalSteps = 4;
const formAnswers = {};
let scenario1Chart, scenario2Chart, scenario3Chart;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('start-scherm').style.display = 'none';
        document.getElementById('calculator-scherm').style.display = 'block';
        showStep(1);
    });
});

function showStep(step) {
    document.querySelectorAll('.step-container').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`step-${step}`) || document.getElementById('resultaat-stap');
    if (el) el.classList.add('active');
    updateButtons();
}

function updateButtons() {
    const t = document.getElementById('terugBtn'), v = document.getElementById('volgendeBtn');
    t.style.display = (currentStep > 1 && currentStep <= totalSteps + 1) ? 'block' : 'none';
    v.style.display = (currentStep <= totalSteps) ? 'block' : 'none';
    v.textContent = (currentStep >= totalSteps) ? 'Bereken advies' : 'Volgende →';
}

function isStepSkipped(step) {
    if (step === 3 && formAnswers['step-2'] === 'ja') return true;
    if (step === 4 && formAnswers['step-2'] === 'nee') return true;
    return false;
}

function nextStep() {
    const cs = document.getElementById(`step-${currentStep}`);
    const so = cs.querySelector('.selected');
    if (currentStep === 4) {
        const pi = document.getElementById('panelenInput');
        if (!pi.value || parseInt(pi.value) <= 0) {
            alert("Vul een geldig aantal zonnepanelen in.");
            return;
        }
        formAnswers[`step-${currentStep}`] = parseInt(pi.value);
        cs.querySelector('.answer-option').classList.add('selected');
    } else {
        if (!so && currentStep !== 4) {
            alert("Selecteer een optie.");
            return;
        }
        formAnswers[`step-${currentStep}`] = so ? so.dataset.value : (currentStep === 4 ? formAnswers[`step-${currentStep}`] : '');
    }
    if (currentStep >= totalSteps) {
        berekenAdvies();
        return;
    }
    do {
        currentStep++;
    } while (isStepSkipped(currentStep));
    showStep(currentStep);
}

function prevStep() {
    delete formAnswers[`step-${currentStep}`];
    do {
        currentStep--;
    } while (isStepSkipped(currentStep));
    if (currentStep >= 1) showStep(currentStep);
}

function selectAnswer(step, element) {
    const c = document.getElementById(`step-${step}`);
    c.querySelectorAll('.answer-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

function berekenAdvies() {
    currentStep = totalSteps + 1;
    setupInteractiveControls();
    showStep('resultaat-stap');
}

function setupInteractiveControls() {
    const controls = ['verbruikSlider', 'panelenSlider'];
    controls.forEach(id => {
        document.getElementById(id).addEventListener('input', recalculateAndRedraw);
    });
    document.getElementById('verbruikSlider').value = formAnswers['step-1'] || 3000;
    document.getElementById('panelenSlider').value = (formAnswers['step-2'] === 'ja' && formAnswers['step-4']) ? formAnswers['step-4'] : (formAnswers['step-3'] === 'ja' ? 12 : 0);
    recalculateAndRedraw();
}

function recalculateAndRedraw() {
    const state = {
        jaarlijksVerbruikKwh: parseInt(document.getElementById('verbruikSlider').value),
        aantalPanelen: parseInt(document.getElementById('panelenSlider').value),
        heeftZonnepanelenInitieel: formAnswers['step-2'] === 'ja'
    };
    const calculations = calculateAdvice(state);
    updateDashboardUI(state, calculations);
}

// --- AANGEPAST: Rekenlogica op basis van nachtverbruik ---
function calculateAdvice(state) {
    const totaalDagelijksVerbruik = state.jaarlijksVerbruikKwh / 365;
    let totaalWp = 0;
    if (state.aantalPanelen > 0) {
        const paneelType = 430;
        totaalWp = state.aantalPanelen * paneelType;
    }
    const dagelijkseOpbrengst = totaalWp * 0.9 / 365;
    const verbruikProfielRaw = [0.03,0.02,0.02,0.02,0.03,0.05,0.07,0.06,0.05,0.04,0.04,0.04,0.05,0.04,0.04,0.05,0.06,0.08,0.09,0.08,0.07,0.06,0.05,0.04];
    const sumProfiel = verbruikProfielRaw.reduce((a, b) => a + b, 0);
    const verbruikProfiel = verbruikProfielRaw.map(p => p / sumProfiel);
    const zonneProfiel = [0,0,0,0,0,0.01,0.03,0.06,0.09,0.11,0.13,0.14,0.13,0.12,0.09,0.05,0.03,0.01,0,0,0,0,0,0];
    const geschaaldVerbruik = verbruikProfiel.map(p => p * totaalDagelijksVerbruik);
    const geschaaldeOpbrengst = zonneProfiel.map(p => p * dagelijkseOpbrengst);
    
    // Bereken het verbruik buiten zonuren (nachtverbruik)
    let nachtelijkVerbruik = 0;
    for(let i=0; i<24; i++) {
        // Uren zonder noemenswaardige zonproductie (voor 7u en na 18u)
        if(i < 7 || i > 18) {
            nachtelijkVerbruik += geschaaldVerbruik[i];
        }
    }
    
    const afgerondeCapaciteit = Math.ceil(nachtelijkVerbruik / 5) * 5;
    const batterijCapaciteit = Math.max(5, afgerondeCapaciteit);
    
    return { batterijCapaciteit, geschaaldVerbruik, geschaaldeOpbrengst };
}

function updateDashboardUI(state, calcs) {
    document.getElementById('verbruikValue').textContent = `${state.jaarlijksVerbruikKwh} kWh`;
    document.getElementById('panelenValue').textContent = `${state.aantalPanelen}`;
    document.getElementById('capaciteitResultaat').textContent = `${calcs.batterijCapaciteit.toFixed(1)} kWh`;
    const displayPanels = state.aantalPanelen > 0;
    document.getElementById('scenario2Div').style.display = displayPanels ? 'block' : 'none';
    document.getElementById('scenario3Div').style.display = displayPanels ? 'block' : 'none';
    if(!displayPanels) {
        document.getElementById('scenario2Div').innerHTML = `<div class="placeholder-message">Voeg zonnepanelen toe om te zien hoe u uw eigen stroom opwekt.</div>`;
        document.getElementById('scenario3Div').innerHTML = `<div class="placeholder-message">Voeg zonnepanelen toe om de impact van een thuisbatterij op uw zelfverbruik te zien.</div>`;
    } else {
        if (!document.getElementById('scenario2ChartCanvas')) {
            document.getElementById('scenario2Div').innerHTML = `<h3>Scenario 2: Met Zonnepanelen</h3> <p class="chart-explanation">De gele lijn toont uw totale zonne-opbrengst. Een deel dekt direct uw verbruik (groen). Het overschot wordt teruggeleverd (export, paars).</p> <div class="chart-canvas-container" id="scenario2CanvasContainer"><canvas id="scenario2ChartCanvas"></canvas></div> <div class="chart-summary" id="summary2"></div>`;
            document.getElementById('scenario3Div').innerHTML = `<h3>Scenario 3: Met Zonnepanelen & Thuisbatterij</h3> <p class="chart-explanation">De batterij wordt opgeladen met uw zonne-overschot (donkerblauwe balken, onder de nullijn). 's Avonds verbruikt u deze opgeslagen energie (lichtblauwe balken).</p> <div class="chart-canvas-container" id="scenario3CanvasContainer"><canvas id="scenario3ChartCanvas"></canvas></div> <div class="chart-summary" id="summary3"></div>`;
        }
    }
    renderScenario1Chart(calcs.geschaaldVerbruik);
    if(displayPanels) {
        renderScenario2Chart(calcs.geschaaldVerbruik, calcs.geschaaldeOpbrengst);
        renderScenario3Chart(calcs.geschaaldVerbruik, calcs.geschaaldeOpbrengst, calcs.batterijCapaciteit);
    }
}

function renderScenario1Chart(verbruikData) {
    const ctx = document.getElementById('scenario1ChartCanvas').getContext('2d');
    const totalImport = verbruikData.reduce((a, b) => a + b, 0);
    document.getElementById('summary1').innerHTML = `<div class="summary-item" style="color:#e74c3c;"><strong>${(totalImport * 365).toFixed(0)} kWh/j</strong>Import van Net</div>`;
    if (scenario1Chart) scenario1Chart.destroy();
    scenario1Chart = new Chart(ctx, { type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [{ label: 'Import van Net', data: verbruikData, backgroundColor: 'rgba(231, 76, 60, 0.7)' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { stacked: true, beginAtZero: true, title: {display: true, text: 'Energie (kWh)'} } }, plugins: { legend: { display: false } } } });
}

function renderScenario2Chart(verbruikData, opbrengstData) {
    const ctx = document.getElementById('scenario2ChartCanvas').getContext('2d');
    let totalImport = 0, totalExport = 0, totalDirectVerbruik = 0;
    for(let i=0; i<24; i++) {
        const direct = Math.min(verbruikData[i], opbrengstData[i]);
        totalImport += Math.max(0, verbruikData[i] - opbrengstData[i]);
        totalExport += Math.max(0, opbrengstData[i] - opbrengstData[i]);
        totalDirectVerbruik += direct;
    }
    document.getElementById('summary2').innerHTML = `<div class="summary-item" style="color:#e74c3c;"><strong>${(totalImport*365).toFixed(0)} kWh/j</strong>Import</div> <div class="summary-item" style="color:#2ecc71;"><strong>${(totalDirectVerbruik*365).toFixed(0)} kWh/j</strong>Eigen Verbruik</div> <div class="summary-item" style="color:#9b59b6;"><strong>${(totalExport*365).toFixed(0)} kWh/j</strong>Export</div>`;
    if (scenario2Chart) scenario2Chart.destroy();
    scenario2Chart = new Chart(ctx, { type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [ { label: 'Eigen Verbruik Zon', data: verbruikData.map((v,i) => Math.min(v, opbrengstData[i])), backgroundColor: 'rgba(46, 204, 113, 0.7)', order: 2 }, { label: 'Import van Net', data: verbruikData.map((v,i) => Math.max(0, v-opbrengstData[i])), backgroundColor: 'rgba(231, 76, 60, 0.7)', order: 2 }, { label: 'Export naar Net', data: opbrengstData.map((o, i) => -Math.max(0, o - verbruikData[i])), backgroundColor: 'rgba(155, 89, 182, 0.7)', order: 2 }, { type: 'line', label: 'Zon-opbrengst', data: opbrengstData, borderColor: 'rgba(241, 196, 15, 1)', fill: false, tension: 0.4, pointRadius: 0, order: 1 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: false, title: {display: true, text: 'Energie (kWh)'} } }, plugins: { legend: { display: false } } } });
}

function renderScenario3Chart(verbruikData, opbrengstData, batterijCapaciteit) {
    const ctx = document.getElementById('scenario3ChartCanvas').getContext('2d');
    let totalImport = 0, totalExportNaBatt = 0, batterijLading = 0, totalDirectVerbruik = 0, totalBattVerbruik = 0;
    const importData = [], directVerbruikData = [], battVerbruikData = [], battLaadData = [];
    for (let i = 0; i < 24; i++) {
        const verbruik = verbruikData[i], opbrengst = opbrengstData[i];
        const direct = Math.min(verbruik, opbrengst);
        const netto = opbrengst - verbruik;
        let ontlading = 0, imp = 0, lading = 0;
        if (netto > 0) { const kanLaden = batterijCapaciteit - batterijLading; lading = Math.min(netto, kanLaden); batterijLading += lading; totalExportNaBatt += (netto - lading); } 
        else if (netto < 0) { const tekort = -netto; const kanOntladen = batterijLading; ontlading = Math.min(tekort, kanOntladen); batterijLading -= ontlading; imp = tekort - ontlading; }
        directVerbruikData.push(direct); battVerbruikData.push(ontlading); importData.push(imp); battLaadData.push(-lading);
        totalDirectVerbruik += direct; totalBattVerbruik += ontlading; totalImport += imp;
    }
    
    document.getElementById('summary3').innerHTML = `<div class="summary-item" style="color:#e74c3c;"><strong>${(totalImport*365).toFixed(0)} kWh/j</strong>Import</div> <div class="summary-item" style="color:#2ecc71;"><strong>${((totalDirectVerbruik + totalBattVerbruik)*365).toFixed(0)} kWh/j</strong>Eigen Verbruik</div> <div class="summary-item" style="color:#9b59b6;"><strong>${(totalExportNaBatt*365).toFixed(0)} kWh/j</strong>Export</div>`;
    if (scenario3Chart) scenario3Chart.destroy();
    scenario3Chart = new Chart(ctx, { type: 'bar', data: { labels: Array.from({length: 24}, (_, i) => `${i}:00`), datasets: [ { label: 'Eigen Verbruik Zon', data: directVerbruikData, backgroundColor: 'rgba(46, 204, 113, 0.7)', order: 2 }, { label: 'Verbruik uit Batterij', data: battVerbruikData, backgroundColor: 'rgba(52, 152, 219, 0.7)', order: 2 }, { label: 'Import van Net', data: importData, backgroundColor: 'rgba(231, 76, 60, 0.7)', order: 2 }, { label: 'Laden Batterij', data: battLaadData, backgroundColor: 'rgba(41, 128, 185, 0.7)', order: 2 }, { type: 'line', label: 'Zon-opbrengst', data: opbrengstData, borderColor: 'rgba(241, 196, 15, 1)', fill: false, tension: 0.4, pointRadius: 0, order: 1 } ] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: false, title: {display: true, text: 'Energie (kWh)'} } }, plugins: { legend: { display: false } } } });
}
