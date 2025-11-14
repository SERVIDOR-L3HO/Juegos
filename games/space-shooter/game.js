import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GameManager } from '../../shared/game-manager.js';
import { auth, signInWithGoogle, onAuthStateChanged } from '../../shared/firebase-config.js';

class SpaceShooterGame {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.enemies = [];
        this.asteroids = [];
        this.bullets = [];
        this.stars = [];
        this.particles = [];
        
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameState = 'start';
        this.isPaused = false;
        
        this.keys = {};
        this.lastShootTime = 0;
        this.shootCooldown = 250;
        
        this.gameManager = new GameManager('space-shooter');
        this.startTime = 0;
        
        this.init();
    }
    
    async init() {
        await this.gameManager.init();
        this.setupScene();
        this.setupPlayer();
        this.setupLights();
        this.createStarfield();
        this.setupEventListeners();
        this.updateUI();
        
        if (auth.currentUser) {
            document.getElementById('loginPrompt').style.display = 'none';
            if (this.gameManager.playerData) {
                document.getElementById('highScore').textContent = this.gameManager.playerData.highScore || 0;
            }
        } else {
            document.getElementById('loginPrompt').style.display = 'block';
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 50, 200);
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, 0);
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    setupPlayer() {
        const geometry = new THREE.ConeGeometry(0.5, 2, 4);
        const material = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.3,
            shininess: 100
        });
        this.player = new THREE.Mesh(geometry, material);
        this.player.rotation.x = Math.PI / 2;
        this.scene.add(this.player);
        
        const engineGlow = new THREE.PointLight(0x00ffff, 2, 5);
        engineGlow.position.set(0, 0, -1);
        this.player.add(engineGlow);
    }
    
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);
    }
    
    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        
        for (let i = 0; i < 2000; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = -Math.random() * 200;
            vertices.push(x, y, z);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.3,
            transparent: true,
            opacity: 0.8
        });
        
        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
        this.stars.push(stars);
    }
    
    spawnAsteroid() {
        const size = 0.5 + Math.random() * 1.5;
        const geometry = new THREE.DodecahedronGeometry(size);
        const material = new THREE.MeshPhongMaterial({
            color: 0x888888,
            flatShading: true
        });
        const asteroid = new THREE.Mesh(geometry, material);
        
        asteroid.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15,
            -50
        );
        
        asteroid.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            0.2 + Math.random() * 0.3
        );
        
        asteroid.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        asteroid.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        );
        
        asteroid.health = size;
        asteroid.userData.type = 'asteroid';
        
        this.scene.add(asteroid);
        this.asteroids.push(asteroid);
    }
    
    spawnEnemy() {
        const geometry = new THREE.OctahedronGeometry(0.8);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        const enemy = new THREE.Mesh(geometry, material);
        
        enemy.position.set(
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 10,
            -40
        );
        
        enemy.velocity = new THREE.Vector3(0, 0, 0.15);
        enemy.health = 2;
        enemy.userData.type = 'enemy';
        enemy.lastShootTime = 0;
        
        this.scene.add(enemy);
        this.enemies.push(enemy);
    }
    
    shoot(fromPlayer = true) {
        const geometry = new THREE.SphereGeometry(0.2);
        const material = new THREE.MeshBasicMaterial({
            color: fromPlayer ? 0x00ff00 : 0xff0000
        });
        const bullet = new THREE.Mesh(geometry, material);
        
        if (fromPlayer) {
            bullet.position.copy(this.player.position);
            bullet.position.z -= 1;
            bullet.velocity = new THREE.Vector3(0, 0, -1);
            bullet.userData.isPlayerBullet = true;
        } else {
            const enemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            if (enemy) {
                bullet.position.copy(enemy.position);
                bullet.velocity = new THREE.Vector3(0, 0, 0.5);
                bullet.userData.isPlayerBullet = false;
            }
        }
        
        const light = new THREE.PointLight(fromPlayer ? 0x00ff00 : 0xff0000, 2, 3);
        bullet.add(light);
        
        this.scene.add(bullet);
        this.bullets.push(bullet);
    }
    
    createExplosion(position, color = 0xff6600) {
        for (let i = 0; i < 20; i++) {
            const geometry = new THREE.SphereGeometry(0.1);
            const material = new THREE.MeshBasicMaterial({ color });
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            particle.life = 1;
            
            this.scene.add(particle);
            this.particles.push(particle);
        }
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            if (e.key === ' ' && this.gameState === 'playing' && !this.isPaused) {
                e.preventDefault();
                const now = Date.now();
                if (now - this.lastShootTime > this.shootCooldown) {
                    this.shoot(true);
                    this.lastShootTime = now;
                }
            }
            
            if (e.key === 'p' || e.key === 'P') {
                if (this.gameState === 'playing') {
                    this.togglePause();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('loginGameBtn')?.addEventListener('click', async () => {
            await signInWithGoogle();
        });
        
        onAuthStateChanged(auth, (user) => {
            if (user && this.gameManager.playerData) {
                document.getElementById('highScore').textContent = this.gameManager.playerData.highScore || 0;
            }
        });
    }
    
    startGame() {
        this.gameState = 'playing';
        this.startTime = Date.now();
        document.getElementById('startPanel').classList.add('hidden');
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    restartGame() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameState = 'playing';
        this.isPaused = false;
        this.startTime = Date.now();
        
        this.enemies.forEach(e => this.scene.remove(e));
        this.asteroids.forEach(a => this.scene.remove(a));
        this.bullets.forEach(b => this.scene.remove(b));
        this.particles.forEach(p => this.scene.remove(p));
        
        this.enemies = [];
        this.asteroids = [];
        this.bullets = [];
        this.particles = [];
        
        this.player.position.set(0, 0, 0);
        
        document.getElementById('gameOverPanel').classList.add('hidden');
        document.getElementById('pausePanel').classList.add('hidden');
        
        this.updateUI();
        this.gameManager.incrementGamesPlayed();
        this.animate();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            document.getElementById('pausePanel').classList.remove('hidden');
        } else {
            document.getElementById('pausePanel').classList.add('hidden');
            this.animate();
        }
    }
    
    async gameOver() {
        this.gameState = 'gameover';
        const playTime = Math.floor((Date.now() - this.startTime) / 1000);
        await this.gameManager.addPlayTime(playTime);
        
        document.getElementById('finalScore').textContent = this.score;
        
        const isNewHighScore = await this.gameManager.updateScore(this.score);
        if (isNewHighScore) {
            document.getElementById('newHighScore').style.display = 'block';
            document.getElementById('highScore').textContent = this.score;
        }
        
        const leaderboard = await this.gameManager.getLeaderboard(10);
        this.displayLeaderboard(leaderboard);
        
        document.getElementById('gameOverPanel').classList.remove('hidden');
    }
    
    displayLeaderboard(scores) {
        const list = document.getElementById('leaderboardList');
        list.innerHTML = '';
        
        scores.forEach((entry, index) => {
            const li = document.createElement('li');
            li.className = 'leaderboard-item';
            li.innerHTML = `
                <span class="leaderboard-rank">#${index + 1}</span>
                <span class="leaderboard-name">${entry.userName}</span>
                <span class="leaderboard-score">${entry.score}</span>
            `;
            list.appendChild(li);
        });
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = '❤️'.repeat(this.lives);
    }
    
    update() {
        if (this.gameState !== 'playing' || this.isPaused) return;
        
        const speed = 0.3;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.player.position.x = Math.max(this.player.position.x - speed, -10);
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.player.position.x = Math.min(this.player.position.x + speed, 10);
        }
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) {
            this.player.position.y = Math.min(this.player.position.y + speed, 8);
        }
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) {
            this.player.position.y = Math.max(this.player.position.y - speed, -8);
        }
        
        this.stars.forEach(starfield => {
            starfield.position.z += 0.5;
            if (starfield.position.z > 50) {
                starfield.position.z = -200;
            }
        });
        
        if (Math.random() < 0.02) this.spawnAsteroid();
        if (Math.random() < 0.005 + this.level * 0.002) this.spawnEnemy();
        
        this.asteroids.forEach((asteroid, i) => {
            asteroid.position.add(asteroid.velocity);
            asteroid.rotation.x += asteroid.rotationSpeed.x;
            asteroid.rotation.y += asteroid.rotationSpeed.y;
            asteroid.rotation.z += asteroid.rotationSpeed.z;
            
            if (asteroid.position.z > 20) {
                this.scene.remove(asteroid);
                this.asteroids.splice(i, 1);
            }
            
            if (asteroid.position.distanceTo(this.player.position) < 1.5) {
                this.lives--;
                this.createExplosion(asteroid.position);
                this.scene.remove(asteroid);
                this.asteroids.splice(i, 1);
                this.updateUI();
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });
        
        this.enemies.forEach((enemy, i) => {
            enemy.position.add(enemy.velocity);
            enemy.rotation.y += 0.05;
            
            if (Date.now() - enemy.lastShootTime > 2000 && Math.random() < 0.02) {
                this.shoot(false);
                enemy.lastShootTime = Date.now();
            }
            
            if (enemy.position.z > 20) {
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
            }
            
            if (enemy.position.distanceTo(this.player.position) < 1.5) {
                this.lives--;
                this.createExplosion(enemy.position, 0xff0000);
                this.scene.remove(enemy);
                this.enemies.splice(i, 1);
                this.updateUI();
                
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        });
        
        this.bullets.forEach((bullet, i) => {
            bullet.position.add(bullet.velocity);
            
            if (Math.abs(bullet.position.z) > 60) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                return;
            }
            
            if (bullet.userData.isPlayerBullet) {
                this.asteroids.forEach((asteroid, ai) => {
                    if (bullet.position.distanceTo(asteroid.position) < 1) {
                        asteroid.health--;
                        this.score += 10;
                        this.scene.remove(bullet);
                        this.bullets.splice(i, 1);
                        
                        if (asteroid.health <= 0) {
                            this.createExplosion(asteroid.position);
                            this.scene.remove(asteroid);
                            this.asteroids.splice(ai, 1);
                            this.score += 50;
                            
                            if (this.score > 0 && this.score % 500 === 0) {
                                this.level++;
                                this.gameManager.updateLevel(this.level);
                            }
                        }
                        
                        this.updateUI();
                    }
                });
                
                this.enemies.forEach((enemy, ei) => {
                    if (bullet.position.distanceTo(enemy.position) < 1) {
                        enemy.health--;
                        this.scene.remove(bullet);
                        this.bullets.splice(i, 1);
                        
                        if (enemy.health <= 0) {
                            this.createExplosion(enemy.position, 0xff0000);
                            this.scene.remove(enemy);
                            this.enemies.splice(ei, 1);
                            this.score += 100;
                        }
                        
                        this.updateUI();
                    }
                });
            } else {
                if (bullet.position.distanceTo(this.player.position) < 1) {
                    this.lives--;
                    this.createExplosion(this.player.position, 0x00ffff);
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    this.updateUI();
                    
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
            }
        });
        
        this.particles.forEach((particle, i) => {
            particle.position.add(particle.velocity);
            particle.life -= 0.02;
            particle.material.opacity = particle.life;
            
            if (particle.life <= 0) {
                this.scene.remove(particle);
                this.particles.splice(i, 1);
            }
        });
    }
    
    animate() {
        if (this.gameState !== 'playing' || this.isPaused) return;
        
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const game = new SpaceShooterGame();
