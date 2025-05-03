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

    // Update percentage circle
    const circumference = 2 * Math.PI * 15.9155; // Circumference of the SVG circle path
    const percentageOffset = (percentage / 100) * circumference;
    const strokeDashoffset = circumference - percentageOffset;

    // Explicitly set stroke-dasharray for correct rendering
    percentageCircle.style.strokeDasharray = circumference;

    // Apply the stroke-dashoffset and trigger the animation
    percentageCircle.style.transition = 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease'; // Ensure transition is active
    percentageCircle.style.strokeDashoffset = strokeDashoffset;

    // Update circle color based on percentage relative to target
    percentageCircle.classList.remove('below-75', 'near-75', 'above-75'); // Remove old classes
    if (percentage < targetPercentage) {
        percentageCircle.classList.add('below-75');
    } else if (percentage >= targetPercentage && percentage < targetPercentage + 5) {
         percentageCircle.classList.add('near-75'); // Use 'near-75' for close to target (optional)
    }
    else {
        percentageCircle.classList.add('above-75');
    }

    // Update guidance message
    let guidanceMessage = '';
    if (held === 0) {
        guidanceMessage = `Log your first class to see insights based on a ${targetPercentage}% target.`;
    } else if (percentage >= targetPercentage) {
        // Calculate classes they can bunk while staying >= targetPercentage
        // (Attended / (Held + b)) >= targetPercentageDecimal
        // Attended >= targetPercentageDecimal * Held + targetPercentageDecimal * b
        // Attended - targetPercentageDecimal * Held >= targetPercentageDecimal * b
        // (Attended - targetPercentageDecimal * Held) / targetPercentageDecimal >= b
        // (Attended / targetPercentageDecimal) - Held >= b
        const maxBunk = Math.floor((attended / targetPercentageDecimal) - held);

        if (maxBunk >= 1) {
            guidanceMessage = `You can bunk up to <strong>${maxBunk}</strong> more class${maxBunk > 1 ? 'es' : ''} and stay above ${targetPercentage}%. Keep it up!`;
        } else if (percentage === targetPercentage) {
             guidanceMessage = `You are exactly at ${targetPercentage}%. Be careful, any absence will drop you below!`;
        }
        else { // Percentage is > target but maxBunk is 0 (meaning one absence drops below)
             guidanceMessage = `You are currently above ${targetPercentage}%. Good! But be cautious, you might drop below with just one more absence.`;
        }

    } else { // Percentage is below target
        // Calculate classes needed to attend to reach >= targetPercentage
        // (Attended + a) / (Held + a) >= targetPercentageDecimal
        // Attended + a >= targetPercentageDecimal * Held + targetPercentageDecimal * a
        // a - targetPercentageDecimal * a >= targetPercentageDecimal * Held - Attended
        // a * (1 - targetPercentageDecimal) >= targetPercentageDecimal * Held - Attended
        // a >= (targetPercentageDecimal * Held - Attended) / (1 - targetPercentageDecimal)
        const neededToAttend = Math.ceil((targetPercentageDecimal * held - attended) / (1 - targetPercentageDecimal));

        if (neededToAttend > 0) {
             guidanceMessage = `You need to attend at least <strong>${neededToAttend}</strong> more class${neededToAttend > 1 ? 'es' : ''} (without further absences) to reach ${targetPercentage}%. Focus!`;
        } else {
             // This case implies you are already above or at the target, but the first IF failed.
             // Should not happen if percentage < target is true, but as a fallback:
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
    loadState(); // Load data when the page loads
    updateDisplay(); // Update UI with loaded data
});
