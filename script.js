// Get DOM elements
const percentageEl = document.getElementById('percentage');
const attendedCountEl = document.getElementById('attended-count');
const absentCountEl = document.getElementById('absent-count');
const heldCountEl = document.getElementById('held-count');
const guidanceMessageEl = document.getElementById('guidance-message');
const presentBtn = document.getElementById('present-btn');
const absentBtn = document.getElementById('absent-btn');
const resetBtn = document.getElementById('reset-btn');
const percentageCircle = document.querySelector('.percentage-circle .circle');
const clickFeedbackEl = document.getElementById('click-feedback');
const targetPercentageInput = document.getElementById('target-percentage'); // New element

// Configuration & State variables
let attended = 0;
let absent = 0;
let targetPercentage = 75; // Default value

// --- Local Storage ---
const STORAGE_KEY = 'attendEaseData'; // Updated storage key

function saveState() {
    const data = {
        attended: attended,
        absent: absent,
        targetPercentage: targetPercentage // Save target percentage
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
    const dataString = localStorage.getItem(STORAGE_KEY);
    if (dataString) {
        try {
            const data = JSON.parse(dataString);
            attended = data.attended || 0;
            absent = data.absent || 0;
            // Load target percentage, use default if invalid or missing
            targetPercentage = data.targetPercentage >= 0 && data.targetPercentage <= 100
                                ? data.targetPercentage
                                : 75; // Fallback to default
        } catch (e) {
            console.error("Error loading state from localStorage:", e);
            resetState(); // Reset if data is corrupted
        }
    } else {
        // If no data exists, save the initial state (defaults)
        saveState();
    }
}

function resetState() {
    attended = 0;
    absent = 0;
    targetPercentage = 75; // Reset target percentage to default
    saveState();
    updateDisplay(); // Update UI immediately after reset
}


// --- Calculations & Display Update ---
function updateDisplay() {
    const held = attended + absent;
    const percentage = held === 0 ? 0 : (attended / held) * 100;
    const targetPercentageDecimal = targetPercentage / 100;

    // Animate number changes for counts
    animateNumberChange(attendedCountEl, attended);
    animateNumberChange(absentCountEl, absent);
    animateNumberChange(heldCountEl, held);

    // Update target percentage input value
    targetPercentageInput.value = targetPercentage;

    // Update percentage text
    percentageEl.textContent = `${percentage.toFixed(1)}%`; // Show one decimal place

    // --- Progress Bar ---
    const progressBar = document.getElementById('progress-bar-inner');
    const progressTarget = document.getElementById('progress-bar-target');
    const barOuter = document.querySelector('.progress-bar-outer');
    if (progressBar && barOuter) {
        progressBar.style.width = `${percentage}%`;
        // Set color based on percentage
        let color = '#48bb78'; // green
        if (percentage < 60) color = '#f56565'; // red
        else if (percentage < 75) color = '#f6e05e'; // yellow
        progressBar.style.setProperty('--progress-bar-color', color);
    }
    if (progressTarget && barOuter) {
        // Move target marker
        const barWidth = barOuter.offsetWidth;
        let targetLeft = (targetPercentage / 100) * barWidth;
        // Clamp to bar edges
        targetLeft = Math.max(7, Math.min(barWidth - 7, targetLeft));
        progressTarget.style.left = `${targetLeft}px`;
        progressTarget.setAttribute('data-tooltip', `Target: ${targetPercentage}%`);
    }

    // --- Streak logic only ---
    // Calculate streak
    let streak = 0;
    const steps = [];
    for (let i = 0; i < attended; i++) steps.push(true);
    for (let i = 0; i < absent; i++) steps.push(false);
    for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i]) streak++;
        else break;
    }
    const streakEl = document.getElementById('streak');
    if (streakEl) {
        streakEl.textContent = streak > 0 ? `🔥 Streak: ${streak}` : '';
    }

    // Update guidance message
    let guidanceMessage = '';
    if (held === 0) {
        guidanceMessage = `Log your first class to see insights based on a ${targetPercentage}% target.`;
    } else if (percentage >= targetPercentage) {
        const maxBunk = Math.floor((attended / targetPercentageDecimal) - held);
        if (maxBunk >= 1) {
            guidanceMessage = `You can bunk up to <strong>${maxBunk}</strong> more class${maxBunk > 1 ? 'es' : ''} and stay above ${targetPercentage}%. Keep it up!`;
        } else if (percentage === targetPercentage) {
             guidanceMessage = `You are exactly at ${targetPercentage}%. Be careful, any absence will drop you below!`;
        }
        else {
             guidanceMessage = `You are currently above ${targetPercentage}%. Good! But be cautious, you might drop below with just one more absence.`;
        }
    } else {
        const neededToAttend = Math.ceil((targetPercentageDecimal * held - attended) / (1 - targetPercentageDecimal));
        if (neededToAttend > 0) {
             guidanceMessage = `You need to attend at least <strong>${neededToAttend}</strong> more class${neededToAttend > 1 ? 'es' : ''} (without further absences) to reach ${targetPercentage}%. Focus!`;
        } else {
             guidanceMessage = `Current percentage is below ${targetPercentage}%. Attend more classes!`;
        }
    }
    guidanceMessageEl.innerHTML = guidanceMessage; // Use innerHTML for strong tag
    saveState(); // Save state after every update
}

// --- Animations & Feedback ---

// Function to animate number change
function animateNumberChange(element, newValue) {
    // Convert newValue to string for comparison, handle potential null/undefined initial state
    const currentText = element.textContent;
    const currentValue = parseInt(currentText, 10); // Use parseInt for comparison

    if (currentValue === newValue && currentText !== '--') return; // No change (and not initial state), no animation

    element.classList.add('animate-change');
    element.textContent = newValue; // Update immediately for visual feedback

    // Remove class after animation ends
    element.addEventListener('animationend', () => {
        element.classList.remove('animate-change');
    }, { once: true });
}

// Function to show click feedback message
function showClickFeedback(message) {
    // Clear existing timeout if any
    if (clickFeedbackEl.timeoutId) {
        clearTimeout(clickFeedbackEl.timeoutId);
        clickFeedbackEl.classList.remove('show'); // Hide immediately before showing new one
        // A small delay might be needed here if hiding is animated
         void clickFeedbackEl.offsetWidth; // Trigger reflow to restart animation if needed
    }


    clickFeedbackEl.textContent = message;
    clickFeedbackEl.classList.add('show');

    // Hide after a few seconds
    clickFeedbackEl.timeoutId = setTimeout(() => {
        clickFeedbackEl.classList.remove('show');
    }, 2500); // Show for 2.5 seconds
}

// Function to add button click animation class
function addButtonAnimation(button) {
    button.classList.add('clicked');
    button.addEventListener('animationend', () => {
        button.classList.remove('clicked');
    }, { once: true });
}


// --- Event Listeners ---
presentBtn.addEventListener('click', () => {
    attended++;
    updateDisplay();
    addButtonAnimation(presentBtn);
    showClickFeedback('✅ Marked Present!');
});

absentBtn.addEventListener('click', () => {
    absent++;
    updateDisplay();
    addButtonAnimation(absentBtn);
    showClickFeedback('❌ Marked Absent!');
});

resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all your attendance data? This cannot be undone.')) {
        resetState(); // Use the new resetState function
        showClickFeedback('🔄 Attendance data reset.');
        addButtonAnimation(resetBtn);
    }
});

// Listen for changes on the target percentage input
targetPercentageInput.addEventListener('change', (event) => {
    let value = parseInt(event.target.value, 10);
    // Validate input: ensure it's a number between 0 and 100
    if (isNaN(value) || value < 0) {
        value = 0;
    } else if (value > 100) {
        value = 100;
    }
    targetPercentage = value;
    targetPercentageInput.value = targetPercentage; // Update input value to the validated number
    updateDisplay(); // Recalculate and update UI based on new target
    showClickFeedback(`🎯 Target set to ${targetPercentage}%.`);
});

targetPercentageInput.addEventListener('input', (event) => {
    // Optional: provide immediate feedback if value is out of bounds while typing
    const value = parseInt(event.target.value, 10);
     if (!isNaN(value) && (value < 0 || value > 100)) {
         // Could display a temporary warning next to the input
     }
     // Note: 'change' event is used for the main logic as it fires after the user finishes input.
});


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    updateDisplay();

    function getMobileElements() {
        return {
            mobilePresentBtn: document.getElementById('mobile-present-btn'),
            mobileAbsentBtn: document.getElementById('mobile-absent-btn'),
            miniProgressText: document.getElementById('mini-progress-text'),
            miniProgressBar: document.querySelector('.mini-progress-bar'),
        };
    }

    let lastAction = null;
    let actionLock = false;

    function vibrate(ms = 30) {
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(ms);
        }
    }

    function highlightMiniProgress(miniProgressBar) {
        if (!miniProgressBar) return;
        miniProgressBar.classList.add('highlight-mini');
        setTimeout(() => miniProgressBar.classList.remove('highlight-mini'), 350);
    }

    function showUndoToast(type) {
        const undoMsg = type === 'present' ? '✅ Marked Present!' : '❌ Marked Absent!';
        showToast(
            `${undoMsg} <button class="undo-btn" id="undo-btn" aria-label="Undo last action">Undo</button>`,
            3500
        );
        setTimeout(() => {
            const undoBtn = document.getElementById('undo-btn');
            if (undoBtn) {
                undoBtn.onclick = () => {
                    if (lastAction === 'present' && attended > 0) attended--;
                    if (lastAction === 'absent' && absent > 0) absent--;
                    updateDisplay();
                    syncMiniProgress();
                    showToast('⏪ Action undone!', 1500);
                    vibrate(15);
                    lastAction = null;
                };
            }
        }, 100);
    }

    function updateMiniProgress(percentage) {
        const { miniProgressText, miniProgressBar } = getMobileElements();
        if (!miniProgressText || !miniProgressBar) return;
        const pct = isNaN(percentage) ? 0 : Math.max(0, Math.min(100, percentage));
        miniProgressText.textContent = `${pct.toFixed(1)}%`;
        const dash = 100;
        const offset = dash - (dash * pct) / 100;
        miniProgressBar.setAttribute('stroke-dasharray', dash);
        miniProgressBar.setAttribute('stroke-dashoffset', offset);
        let color = '#48bb78';
        if (pct < 60) color = '#f56565';
        else if (pct < 75) color = '#f6e05e';
        miniProgressBar.style.stroke = color;
        highlightMiniProgress(miniProgressBar);
    }

    function syncMiniProgress() {
        const held = attended + absent;
        const percentage = held === 0 ? 0 : (attended / held) * 100;
        updateMiniProgress(percentage);
    }

    function handleMobileAction(type) {
        const { mobilePresentBtn, mobileAbsentBtn } = getMobileElements();
        if (actionLock) return;
        actionLock = true;
        setTimeout(() => { actionLock = false; }, 500);
        if (type === 'present') {
            attended++;
            lastAction = 'present';
        } else if (type === 'absent') {
            absent++;
            lastAction = 'absent';
        }
        updateDisplay();
        syncMiniProgress();
        addButtonAnimation(type === 'present' ? mobilePresentBtn : mobileAbsentBtn);
        vibrate(30);
        showUndoToast(type);
    }

    function attachMobileListeners() {
        const { mobilePresentBtn, mobileAbsentBtn } = getMobileElements();
        if (!mobilePresentBtn || !mobileAbsentBtn) {
            console.warn('Mobile action bar elements not found.');
            return;
        }
        // Remove previous listeners by cloning
        const newPresent = mobilePresentBtn.cloneNode(true);
        const newAbsent = mobileAbsentBtn.cloneNode(true);
        mobilePresentBtn.parentNode.replaceChild(newPresent, mobilePresentBtn);
        mobileAbsentBtn.parentNode.replaceChild(newAbsent, mobileAbsentBtn);
        newPresent.addEventListener('click', () => handleMobileAction('present'));
        newAbsent.addEventListener('click', () => handleMobileAction('absent'));
    }

    // Attach listeners on load
    attachMobileListeners();

    // Sync mini progress on every display update
    const origUpdateDisplay = updateDisplay;
    updateDisplay = function() {
        origUpdateDisplay.apply(this, arguments);
        syncMiniProgress();
        attachMobileListeners();
    };
    // Initial sync
    syncMiniProgress();

    // Add highlight style for mini progress
    const style = document.createElement('style');
    style.innerHTML = `
      .highlight-mini { filter: drop-shadow(0 0 6px #f6e05e99) brightness(1.15); }
      .undo-btn { background: none; border: none; color: #5a67d8; font-weight: 700; font-size: 1em; margin-left: 0.7em; cursor: pointer; text-decoration: underline; border-radius: 4px; padding: 0 0.3em; }
      .undo-btn:active { color: #f56565; }
    `;
    document.head.appendChild(style);
});

// --- UI/UX ENHANCEMENTS ---
// Theme Toggle (devqa.io style)
const themeToggle = document.getElementById('theme-toggle');
const userThemePreference = localStorage.getItem('theme');
if (userThemePreference === 'dark') {
  document.body.classList.add('dark-theme');
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
  });
}

// Onboarding Modal
const onboardingModal = document.getElementById('onboarding-modal');
const helpBtn = document.getElementById('help-btn');
const closeOnboarding = document.getElementById('close-onboarding');
function showOnboarding() {
    if (onboardingModal) onboardingModal.style.display = 'flex';
}
function hideOnboarding() {
    if (onboardingModal) onboardingModal.style.display = 'none';
}
if (helpBtn) helpBtn.addEventListener('click', showOnboarding);
if (closeOnboarding) closeOnboarding.addEventListener('click', hideOnboarding);
// Show onboarding on first visit
if (!localStorage.getItem('attendEaseOnboarded')) {
    showOnboarding();
    localStorage.setItem('attendEaseOnboarded', '1');
}
// Toast Notification System
const toastContainer = document.getElementById('toast-container');
function showToast(message, duration = 2500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
// Override showClickFeedback to use toast
function showClickFeedback(message) {
    showToast(message);
}

// --- PWA Install Prompt ---
let deferredPrompt = null;
const installBtn = document.getElementById('install-pwa-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'block';
});

if (installBtn) {
  // Hide by default if not available
  installBtn.style.display = 'none';
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('App will be installed!');
      } else {
        showToast('Install dismissed.');
      }
      deferredPrompt = null;
      installBtn.style.display = 'none';
    } else {
      showToast('App is already installed or not available for install.');
    }
  });
}

// --- Settings Modal Logic ---
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');

function openSettings() {
  if (settingsModal) {
    settingsModal.style.display = 'flex';
    // Focus the first input for accessibility
    const firstInput = settingsModal.querySelector('input, button');
    if (firstInput) firstInput.focus();
    document.body.style.overflow = 'hidden';
  }
}
function closeSettings() {
  if (settingsModal) {
    settingsModal.style.display = 'none';
    document.body.style.overflow = '';
    if (settingsBtn) settingsBtn.focus();
  }
}
if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettings);
if (settingsModal) {
  settingsModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
    // Trap focus inside modal
    if (e.key === 'Tab') {
      const focusable = settingsModal.querySelectorAll('input, button');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
