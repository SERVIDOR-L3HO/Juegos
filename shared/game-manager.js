import { db, auth, onAuthStateChanged } from './firebase-config.js';
import { ref, set, get, update, push, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

export class GameManager {
    constructor(gameName) {
        this.gameName = gameName;
        this.userId = null;
        this.playerData = null;
        this.initialized = false;
        
        this.init();
    }
    
    async init() {
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    this.userId = user.uid;
                    await this.loadPlayerData();
                    this.initialized = true;
                    resolve(true);
                } else {
                    this.initialized = true;
                    resolve(false);
                }
            });
        });
    }
    
    async loadPlayerData() {
        if (!this.userId) return null;
        
        const playerRef = ref(db, `players/${this.userId}/games/${this.gameName}`);
        const snapshot = await get(playerRef);
        
        if (snapshot.exists()) {
            this.playerData = snapshot.val();
        } else {
            this.playerData = {
                highScore: 0,
                level: 1,
                gamesPlayed: 0,
                totalTime: 0,
                achievements: []
            };
            await this.savePlayerData();
        }
        
        return this.playerData;
    }
    
    async savePlayerData() {
        if (!this.userId) return;
        
        const playerRef = ref(db, `players/${this.userId}/games/${this.gameName}`);
        await set(playerRef, {
            ...this.playerData,
            lastPlayed: Date.now()
        });
    }
    
    async updateScore(newScore) {
        if (!this.userId || !this.playerData) return;
        
        if (newScore > this.playerData.highScore) {
            this.playerData.highScore = newScore;
            await this.savePlayerData();
            await this.submitToLeaderboard(newScore);
            return true;
        }
        return false;
    }
    
    async updateLevel(level) {
        if (!this.userId || !this.playerData) return;
        
        this.playerData.level = Math.max(this.playerData.level, level);
        await this.savePlayerData();
    }
    
    async incrementGamesPlayed() {
        if (!this.userId || !this.playerData) return;
        
        this.playerData.gamesPlayed = (this.playerData.gamesPlayed || 0) + 1;
        await this.savePlayerData();
    }
    
    async addPlayTime(seconds) {
        if (!this.userId || !this.playerData) return;
        
        this.playerData.totalTime = (this.playerData.totalTime || 0) + seconds;
        await this.savePlayerData();
    }
    
    async submitToLeaderboard(score) {
        if (!this.userId) return;
        
        const userName = auth.currentUser.displayName || auth.currentUser.email || 'Jugador Anónimo';
        const leaderboardRef = ref(db, `leaderboards/${this.gameName}`);
        
        await push(leaderboardRef, {
            userId: this.userId,
            userName: userName,
            score: score,
            timestamp: Date.now()
        });
    }
    
    async getLeaderboard(limit = 10) {
        const leaderboardRef = ref(db, `leaderboards/${this.gameName}`);
        const topScoresQuery = query(leaderboardRef, orderByChild('score'), limitToLast(limit));
        const snapshot = await get(topScoresQuery);
        
        if (snapshot.exists()) {
            const scores = [];
            snapshot.forEach((child) => {
                scores.unshift(child.val());
            });
            return scores;
        }
        return [];
    }
    
    async saveGameState(gameState) {
        if (!this.userId) return;
        
        const stateRef = ref(db, `players/${this.userId}/games/${this.gameName}/savedState`);
        await set(stateRef, {
            ...gameState,
            savedAt: Date.now()
        });
    }
    
    async loadGameState() {
        if (!this.userId) return null;
        
        const stateRef = ref(db, `players/${this.userId}/games/${this.gameName}/savedState`);
        const snapshot = await get(stateRef);
        
        return snapshot.exists() ? snapshot.val() : null;
    }
}

export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
