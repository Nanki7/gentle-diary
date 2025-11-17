// Configuration
const USE_MOCK_AI = true; // Set to false to use real API (requires API endpoint configuration)
const STORAGE_KEY = 'gentle_diary_entries_v1';
const MAX_REFLECTION_LENGTH = 800;

// State
let currentStep = 1;
let selectedMood = null;
let reflectionText = '';

// DOM Elements
const step1Section = document.getElementById('step-1');
const step2Section = document.getElementById('step-2');
const encouragementSection = document.getElementById('encouragement-section');
const currentStepIndicator = document.getElementById('current-step');
const moodButtons = document.querySelectorAll('.mood-button');
const nextButton = document.getElementById('next-button');
const backButton = document.getElementById('back-button');
const saveButton = document.getElementById('save-button');
const reflectionTextarea = document.getElementById('reflection-textarea');
const charCount = document.getElementById('char-count');
const encouragementText = document.getElementById('encouragement-text');
const newEntryButton = document.getElementById('new-entry-button');
const diaryEntries = document.getElementById('diary-entries');
const emptyState = document.getElementById('empty-state');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadDiaryEntries();
});

// Event Listeners
function initializeEventListeners() {
    // Mood selection
    moodButtons.forEach(button => {
        button.addEventListener('click', () => selectMood(button.dataset.mood));
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectMood(button.dataset.mood);
            }
        });
    });

    // Navigation buttons
    nextButton.addEventListener('click', goToStep2);
    backButton.addEventListener('click', goToStep1);
    saveButton.addEventListener('click', saveEntry);
    newEntryButton.addEventListener('click', resetForm);

    // Reflection textarea
    reflectionTextarea.addEventListener('input', handleReflectionInput);
}

// Mood Selection
function selectMood(mood) {
    selectedMood = mood;
    
    // Update button states
    moodButtons.forEach(button => {
        const isSelected = button.dataset.mood === mood;
        button.classList.toggle('selected', isSelected);
        button.setAttribute('aria-pressed', isSelected);
    });

    // Enable next button
    nextButton.disabled = false;
}

// Step Navigation
function goToStep2() {
    if (!selectedMood) return;
    
    currentStep = 2;
    updateStepper();
    step1Section.hidden = true;
    step2Section.hidden = false;
    reflectionTextarea.focus();
    updateSaveButton();
}

function goToStep1() {
    currentStep = 1;
    updateStepper();
    step1Section.hidden = false;
    step2Section.hidden = true;
    encouragementSection.hidden = true;
}

function updateStepper() {
    currentStepIndicator.textContent = currentStep;
}

// Reflection Input
function handleReflectionInput(e) {
    reflectionText = e.target.value;
    const length = reflectionText.length;
    charCount.textContent = length;
    updateSaveButton();
}

function updateSaveButton() {
    saveButton.disabled = !reflectionText.trim() || reflectionText.length === 0;
}

// Save Entry
async function saveEntry() {
    if (!selectedMood || !reflectionText.trim()) return;

    // Show loading state
    saveButton.disabled = true;
    saveButton.textContent = 'Generating...';

    try {
        // Generate encouragement
        const encouragement = await generateEncouragement(selectedMood, reflectionText);

        // Create entry
        const entry = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            mood: selectedMood,
            reflection: reflectionText.trim(),
            encouragement: encouragement
        };

        // Save to localStorage
        const entries = loadEntriesFromStorage();
        entries.unshift(entry); // Add to beginning (newest first)
        saveEntriesToStorage(entries);

        // Display encouragement
        displayEncouragement(encouragement);

        // Reload diary
        loadDiaryEntries();

        // Scroll to encouragement
        setTimeout(() => {
            encouragementSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);

    } catch (error) {
        console.error('Error saving entry:', error);
        showToast('Something went wrong. Please try again.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save & Generate Encouragement';
    }
}

// Generate Encouragement
async function generateEncouragement(mood, reflection) {
    if (USE_MOCK_AI) {
        return generateMockEncouragement(mood, reflection);
    } else {
        try {
            return await callTextAI({ mood, reflection });
        } catch (error) {
            console.error('API call failed, falling back to mock:', error);
            showToast('Using offline mode');
            return generateMockEncouragement(mood, reflection);
        }
    }
}

// Mock AI - Rule-based encouragement
function generateMockEncouragement(mood, reflection) {
    const lowerReflection = reflection.toLowerCase();
    
    // Base templates per mood
    const templates = {
        happy: "It's wonderful that you felt a spark of happiness today. Savor it—small moments count.",
        down: "It's okay to feel heavy today. Thank you for noticing and writing it down—you're not alone in this.",
        angry: "Your frustration is valid. Let's channel it gently—one small, doable step can restore a bit of control.",
        neutral: "A quiet day is still progress. Your steady attention to recovery makes a difference over time.",
        overwhelmed: "This is a lot. Try one compassionate pause—slow breath, a sip of water, and ask for a small help."
    };

    let message = templates[mood] || templates.neutral;

    // Add keyword-based variations
    const additions = [];

    if (lowerReflection.includes('pain') || lowerReflection.includes('discomfort') || lowerReflection.includes('ache')) {
        additions.push("Consider a gentle stretch or rest, and note any patterns.");
    }

    if (lowerReflection.includes('support') || lowerReflection.includes('family') || lowerReflection.includes('friend')) {
        additions.push("Leaning on support is strength, not weakness.");
    }

    if (lowerReflection.includes('progress') || lowerReflection.includes('proud') || lowerReflection.includes('better')) {
        additions.push("Notice the progress you've already made—it counts.");
    }

    if (lowerReflection.includes('fear') || lowerReflection.includes('anxiety') || lowerReflection.includes('worried') || lowerReflection.includes('scared')) {
        additions.push("If worries linger, a brief check-in with a professional can help.");
    }

    // Combine message and additions (limit to 2-4 sentences total)
    if (additions.length > 0) {
        message += " " + additions[0];
        if (additions.length > 1 && Math.random() > 0.5) {
            message += " " + additions[1];
        }
    }

    return message;
}

// Real API Call (stub - requires configuration)
/**
 * Calls an external AI API to generate encouragement.
 * 
 * @param {Object} params - Parameters object
 * @param {string} params.mood - Selected mood (happy, down, angry, neutral, overwhelmed)
 * @param {string} params.reflection - User's reflection text
 * @returns {Promise<string>} Generated encouragement message
 * 
 * @example
 * // Configure your API endpoint and key (store securely, not in code)
 * const API_ENDPOINT = 'https://your-api-endpoint.com/v1/chat/completions';
 * const API_KEY = 'your-api-key'; // Store in environment variable or secure config
 * 
 * // Example implementation for OpenAI-compatible API:
 * async function callTextAI({ mood, reflection }) {
 *     const prompt = `You are a gentle companion for post-mastectomy recovery. Based on the mood = ${mood} and this reflection: ${reflection}, write a short, kind encouragement (2–4 sentences). Avoid medical advice; focus on validation, small steps, and self-compassion.`;
 *     
 *     const response = await fetch(API_ENDPOINT, {
 *         method: 'POST',
 *         headers: {
 *             'Content-Type': 'application/json',
 *             'Authorization': `Bearer ${API_KEY}`
 *         },
 *         body: JSON.stringify({
 *             model: 'gpt-3.5-turbo',
 *             messages: [
 *                 { role: 'system', content: 'You are a gentle, supportive companion.' },
 *                 { role: 'user', content: prompt }
 *             ],
 *             max_tokens: 150,
 *             temperature: 0.7
 *         })
 *     });
 *     
 *     if (!response.ok) {
 *         throw new Error(`API error: ${response.status}`);
 *     }
 *     
 *     const data = await response.json();
 *     return data.choices[0].message.content.trim();
 * }
 */
async function callTextAI({ mood, reflection }) {
    // TODO: Implement your API call here
    // For now, this will throw and fall back to mock mode
    throw new Error('API not configured');
}

// Display Encouragement
function displayEncouragement(text) {
    encouragementText.textContent = text;
    step2Section.hidden = true;
    encouragementSection.hidden = false;
}

// Reset Form
function resetForm() {
    selectedMood = null;
    reflectionText = '';
    reflectionTextarea.value = '';
    charCount.textContent = '0';
    
    // Reset mood buttons
    moodButtons.forEach(button => {
        button.classList.remove('selected');
        button.setAttribute('aria-pressed', 'false');
    });
    
    nextButton.disabled = true;
    saveButton.disabled = true;
    
    goToStep1();
}

// Diary Management
function loadDiaryEntries() {
    const entries = loadEntriesFromStorage();
    
    if (entries.length === 0) {
        emptyState.hidden = false;
        diaryEntries.innerHTML = '';
        return;
    }

    emptyState.hidden = true;
    diaryEntries.innerHTML = entries.map(entry => createEntryHTML(entry)).join('');
    
    // Attach event listeners to new entry buttons
    attachEntryEventListeners();
}

function createEntryHTML(entry) {
    const moodLabels = {
        happy: { emoji: '😊', text: 'Happy' },
        down: { emoji: '😞', text: 'Down' },
        angry: { emoji: '😡', text: 'Angry' },
        neutral: { emoji: '😐', text: 'Neutral' },
        overwhelmed: { emoji: '😣', text: 'Overwhelmed' }
    };

    const mood = moodLabels[entry.mood] || moodLabels.neutral;
    const date = formatDate(entry.date);
    const excerpt = entry.reflection.length > 120 
        ? entry.reflection.substring(0, 120) + '...' 
        : entry.reflection;
    const isExpanded = false; // Track in data attribute

    return `
        <div class="diary-entry" data-entry-id="${entry.id}">
            <div class="entry-header">
                <div>
                    <div class="entry-date">${date}</div>
                    <div class="entry-mood">
                        <span class="entry-mood-emoji">${mood.emoji}</span>
                        <span>${mood.text}</span>
                    </div>
                </div>
                <div class="entry-actions">
                    <button class="entry-button expand-toggle" data-expanded="false">Expand</button>
                    <button class="entry-button delete" aria-label="Delete entry">Delete</button>
                </div>
            </div>
            <div class="entry-reflection excerpt" data-full-text="${escapeHtml(entry.reflection)}">${escapeHtml(excerpt)}</div>
            <div class="entry-encouragement">${escapeHtml(entry.encouragement)}</div>
        </div>
    `;
}

function attachEntryEventListeners() {
    // Delete buttons
    document.querySelectorAll('.entry-button.delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const entryCard = e.target.closest('.diary-entry');
            const entryId = entryCard.dataset.entryId;
            deleteEntry(entryId);
        });
    });

    // Expand/Collapse buttons
    document.querySelectorAll('.entry-button.expand-toggle').forEach(button => {
        button.addEventListener('click', (e) => {
            const entryCard = e.target.closest('.diary-entry');
            const reflectionEl = entryCard.querySelector('.entry-reflection');
            const isExpanded = button.dataset.expanded === 'true';
            
            if (isExpanded) {
                // Collapse
                const fullText = reflectionEl.dataset.fullText;
                const excerpt = fullText.length > 120 ? fullText.substring(0, 120) + '...' : fullText;
                reflectionEl.textContent = excerpt;
                reflectionEl.classList.add('excerpt');
                button.textContent = 'Expand';
                button.dataset.expanded = 'false';
            } else {
                // Expand
                reflectionEl.textContent = reflectionEl.dataset.fullText;
                reflectionEl.classList.remove('excerpt');
                button.textContent = 'Collapse';
                button.dataset.expanded = 'true';
            }
        });
    });
}

function deleteEntry(entryId) {
    if (!confirm('Are you sure you want to delete this entry?')) {
        return;
    }

    const entries = loadEntriesFromStorage();
    const filtered = entries.filter(entry => entry.id !== entryId);
    saveEntriesToStorage(filtered);
    loadDiaryEntries();
}

// LocalStorage Helpers
function loadEntriesFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error loading entries:', error);
        return [];
    }
}

function saveEntriesToStorage(entries) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
        console.error('Error saving entries:', error);
        showToast('Error saving entry. Storage may be full.');
    }
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    
    setTimeout(() => {
        toast.hidden = true;
    }, 3000);
}

