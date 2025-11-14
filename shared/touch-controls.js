export class TouchControls {
    constructor(config = {}) {
        this.joystick = null;
        this.buttons = {};
        this.activeTouch = null;
        this.joystickActive = false;
        this.joystickDirection = { x: 0, y: 0 };
        this.buttonStates = {};
        
        this.config = {
            joystickSize: config.joystickSize || 120,
            buttonSize: config.buttonSize || 70,
            showJoystick: config.showJoystick !== false,
            buttons: config.buttons || []
        };
        
        this.createControls();
        this.setupEventListeners();
    }
    
    createControls() {
        const container = document.createElement('div');
        container.id = 'touchControls';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
        `;
        
        if (this.config.showJoystick) {
            this.createJoystick(container);
        }
        
        this.config.buttons.forEach(btn => this.createButton(container, btn));
        
        document.body.appendChild(container);
    }
    
    createJoystick(container) {
        const joystickBase = document.createElement('div');
        joystickBase.className = 'joystick-base';
        joystickBase.style.cssText = `
            position: absolute;
            bottom: 30px;
            left: 30px;
            width: ${this.config.joystickSize}px;
            height: ${this.config.joystickSize}px;
            background: rgba(255, 255, 255, 0.1);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: auto;
            touch-action: none;
        `;
        
        const joystickStick = document.createElement('div');
        joystickStick.className = 'joystick-stick';
        joystickStick.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${this.config.joystickSize * 0.5}px;
            height: ${this.config.joystickSize * 0.5}px;
            background: rgba(99, 102, 241, 0.7);
            border: 2px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: all 0.1s;
        `;
        
        joystickBase.appendChild(joystickStick);
        container.appendChild(joystickBase);
        
        this.joystick = {
            base: joystickBase,
            stick: joystickStick
        };
    }
    
    createButton(container, config) {
        const button = document.createElement('div');
        button.className = `touch-button touch-button-${config.id}`;
        button.innerHTML = config.label || '';
        
        const positions = {
            bottomRight: `bottom: ${config.bottom || 30}px; right: ${config.right || 30}px;`,
            topRight: `top: ${config.top || 30}px; right: ${config.right || 30}px;`,
            bottomCenter: `bottom: ${config.bottom || 30}px; left: 50%; transform: translateX(-50%);`
        };
        
        button.style.cssText = `
            position: absolute;
            ${positions[config.position] || positions.bottomRight}
            width: ${this.config.buttonSize}px;
            height: ${this.config.buttonSize}px;
            background: rgba(99, 102, 241, 0.6);
            border: 3px solid rgba(255, 255, 255, 0.8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            pointer-events: auto;
            touch-action: none;
            user-select: none;
        `;
        
        container.appendChild(button);
        this.buttons[config.id] = button;
        this.buttonStates[config.id] = false;
    }
    
    setupEventListeners() {
        if (this.joystick) {
            this.joystick.base.addEventListener('touchstart', (e) => this.handleJoystickStart(e));
            this.joystick.base.addEventListener('touchmove', (e) => this.handleJoystickMove(e));
            this.joystick.base.addEventListener('touchend', (e) => this.handleJoystickEnd(e));
        }
        
        Object.keys(this.buttons).forEach(id => {
            const button = this.buttons[id];
            button.addEventListener('touchstart', (e) => this.handleButtonDown(e, id));
            button.addEventListener('touchend', (e) => this.handleButtonUp(e, id));
        });
    }
    
    handleJoystickStart(e) {
        e.preventDefault();
        this.joystickActive = true;
        this.activeTouch = e.touches[0].identifier;
    }
    
    handleJoystickMove(e) {
        e.preventDefault();
        if (!this.joystickActive) return;
        
        const touch = Array.from(e.touches).find(t => t.identifier === this.activeTouch);
        if (!touch) return;
        
        const rect = this.joystick.base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let deltaX = touch.clientX - centerX;
        let deltaY = touch.clientY - centerY;
        
        const maxDistance = this.config.joystickSize / 2 - 10;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }
        
        this.joystick.stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        
        this.joystickDirection.x = deltaX / maxDistance;
        this.joystickDirection.y = deltaY / maxDistance;
    }
    
    handleJoystickEnd(e) {
        e.preventDefault();
        this.joystickActive = false;
        this.activeTouch = null;
        this.joystick.stick.style.transform = 'translate(-50%, -50%)';
        this.joystickDirection = { x: 0, y: 0 };
    }
    
    handleButtonDown(e, id) {
        e.preventDefault();
        this.buttonStates[id] = true;
        this.buttons[id].style.background = 'rgba(99, 102, 241, 0.9)';
        this.buttons[id].style.transform = 'scale(0.95)';
    }
    
    handleButtonUp(e, id) {
        e.preventDefault();
        this.buttonStates[id] = false;
        this.buttons[id].style.background = 'rgba(99, 102, 241, 0.6)';
        this.buttons[id].style.transform = 'scale(1)';
    }
    
    getJoystickDirection() {
        return this.joystickDirection;
    }
    
    isButtonPressed(id) {
        return this.buttonStates[id] || false;
    }
    
    destroy() {
        const container = document.getElementById('touchControls');
        if (container) {
            container.remove();
        }
    }
}

export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || (window.innerWidth < 768);
}
