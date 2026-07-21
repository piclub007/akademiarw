// src/js/game-engine.js
import { db, auth } from './firebase-config.js';
import { 
    doc, getDoc, setDoc, updateDoc, increment, 
    arrayUnion, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

class GameEngine {
    constructor() {
        this.playerData = null;
        this.currentQuest = null;
        this.quests = [
            {
                id: 'quest-1',
                title: 'The Print Spell',
                description: 'Learn to cast your first Python spell!',
                type: 'code',
                language: 'python',
                difficulty: 1,
                xpReward: 50,
                manaCost: 10,
                story: 'You enter a dark cave. To light the way, you must cast the ancient "Print Spell".',
                objective: 'Make the cave light up by printing "Lux!" to the console.',
                startingCode: '# Type your spell below:\n',
                expectedOutput: 'Lux!',
                hints: [
                    'Use the print() function',
                    'Put your message in quotes: print("Lux!")'
                ],
                solution: 'print("Lux!")',
                successMessage: '✨ The cave fills with warm light! You can see the path ahead.'
            },
            {
                id: 'quest-2',
                title: 'The Variable Vault',
                description: 'Store magical treasures in variables',
                type: 'code',
                language: 'python',
                difficulty: 2,
                xpReward: 75,
                manaCost: 15,
                story: 'You find an ancient vault. It requires a personalized greeting to open.',
                objective: 'Create a variable with your name and print a greeting.',
                startingCode: '# Create your greeting spell:\n',
                expectedOutput: null, // Accept any personalized greeting
                validator: function(code) {
                    return code.includes('=') && code.includes('print');
                },
                hints: [
                    'Store your name in a variable: hero = "YourName"',
                    'Then print a greeting: print("Hello " + hero)'
                ],
                successMessage: '🔓 The vault swings open! Treasure awaits!'
            }
        ];

        // Game state defaults
        this.defaults = {
            xp: 0,
            level: 1,
            streak: 0,
            hearts: 5,
            mana: 100,
            completedQuests: [],
            badges: [],
            totalQuestsCompleted: 0,
            perfectQuests: 0
        };
    }

    async init() {
        if (!auth.currentUser) {
            throw new Error('User must be logged in');
        }

        await this.loadPlayerData();
        return this.playerData;
    }

    async loadPlayerData() {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            this.playerData = { ...this.defaults, ...userDoc.data() };
        } else {
            this.playerData = { ...this.defaults };
            await setDoc(userRef, this.playerData);
        }

        return this.playerData;
    }

    getPlayerStats() {
        if (!this.playerData) return null;

        return {
            level: this.playerData.level,
            xp: this.playerData.xp,
            xpToNextLevel: this.calculateXPForLevel(this.playerData.level + 1),
            streak: this.playerData.streak,
            hearts: this.playerData.hearts,
            mana: this.playerData.mana,
            badges: this.playerData.badges,
            questsCompleted: this.playerData.totalQuestsCompleted
        };
    }

    getAvailableQuests() {
        return this.quests.filter(quest => {
            return quest.difficulty <= this.playerData.level + 1;
        });
    }

    startQuest(questId) {
        const quest = this.quests.find(q => q.id === questId);
        
        if (!quest) {
            throw new Error('Quest not found');
        }

        if (this.playerData.mana < quest.manaCost) {
            throw new Error(`Not enough mana! Need ${quest.manaCost}, have ${this.playerData.mana}`);
        }

        this.currentQuest = quest;
        return quest;
    }

    async submitSolution(userCode) {
        if (!this.currentQuest) {
            throw new Error('No active quest');
        }

        let isCorrect = false;
        const quest = this.currentQuest;

        // Different validation based on quest type
        if (quest.validator) {
            isCorrect = quest.validator(userCode);
        } else if (quest.expectedOutput) {
            // Simulate Python execution (in production, use Pyodide)
            const output = this.simulateExecution(userCode);
            isCorrect = output.trim() === quest.expectedOutput.trim();
        }

        if (isCorrect) {
            await this.completeQuest(true);
            return {
                success: true,
                message: quest.successMessage,
                stats: this.getPlayerStats()
            };
        } else {
            return {
                success: false,
                message: 'Not quite right. Check your spell and try again!',
                hint: quest.hints[Math.floor(Math.random() * quest.hints.length)]
            };
        }
    }

    async completeQuest(wasPerfect = false) {
        const quest = this.currentQuest;
        const userRef = doc(db, 'users', auth.currentUser.uid);

        // Calculate rewards
        let xpGained = quest.xpReward;
        if (wasPerfect) {
            xpGained += 25; // Bonus for perfect score
            this.playerData.perfectQuests++;
        }

        // Streak bonus
        if (this.playerData.streak > 0) {
            xpGained += Math.floor(quest.xpReward * (this.playerData.streak * 0.1));
        }

        const updates = {
            xp: increment(xpGained),
            mana: increment(-quest.manaCost),
            completedQuests: arrayUnion(quest.id),
            totalQuestsCompleted: increment(1),
            perfectQuests: increment(wasPerfect ? 1 : 0),
            lastActive: serverTimestamp()
        };

        // Level up check
        const newTotalXP = this.playerData.xp + xpGained;
        const newLevel = this.calculateLevel(newTotalXP);

        if (newLevel > this.playerData.level) {
            updates.level = newLevel;
            updates.hearts = increment(1); // Bonus heart for leveling
        }

        // Update Firestore
        await updateDoc(userRef, updates);

        // Update local state
        this.playerData.xp = newTotalXP;
        this.playerData.level = newLevel;
        this.playerData.mana -= quest.manaCost;
        this.playerData.totalQuestsCompleted++;
        this.playerData.completedQuests.push(quest.id);

        this.currentQuest = null;

        return {
            xpGained,
            leveledUp: newLevel > this.playerData.level,
            newLevel: newLevel
        };
    }

    // Simple Python execution simulation (for demo purposes)
    simulateExecution(code) {
        // This is a very basic simulation - in production, use Pyodide
        try {
            if (code.includes('print(')) {
                const match = code.match(/print\(["'](.+?)["']\)/);
                return match ? match[1] : '';
            }
            return '';
        } catch (e) {
            return '';
        }
    }

    calculateLevel(xp) {
        return Math.floor(Math.pow(xp / 100, 2/3)) + 1;
    }

    calculateXPForLevel(level) {
        return 100 * Math.pow(level - 1, 1.5);
    }

    // Debug mode: Find bugs to restore mana
    async debugMode(debuggedCorrectly) {
        const manaRestored = debuggedCorrectly ? 15 : 5;
        const userRef = doc(db, 'users', auth.currentUser.uid);

        await updateDoc(userRef, {
            mana: increment(manaRestored)
        });

        this.playerData.mana = Math.min(100, this.playerData.mana + manaRestored);

        return {
            manaRestored,
            currentMana: this.playerData.mana
        };
    }
}

const gameEngine = new GameEngine();
export default gameEngine;
