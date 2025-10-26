class P2PChatroom {
    constructor() {
        this.isHost = false;
        this.roomCode = null;
        this.peer = null;
        this.connections = new Map(); // connectionId -> connection
        this.peerCount = 0;
        this.localPeerId = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateConnectionStatus('disconnected');
    }

    setupEventListeners() {
        // Room controls
        document.getElementById('createRoomBtn').addEventListener('click', () => this.createRoom());
        document.getElementById('joinRoomBtn').addEventListener('click', () => this.joinRoom());
        
        // Chat input
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Room code input
        document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.joinRoom();
            }
        });
    }

    generateRoomCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    async createRoom() {
        try {
            this.isHost = true;
            this.roomCode = this.generateRoomCode();
            
            this.updateUI('room-created');
            this.addSystemMessage(`Room created! Share code: ${this.roomCode}`);
            
            // Initialize PeerJS
            await this.initializePeer();
            
        } catch (error) {
            console.error('Error creating room:', error);
            this.addSystemMessage('Failed to create room. Please try again.');
        }
    }

    async joinRoom() {
        const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
        
        if (!roomCode || roomCode.length !== 6) {
            this.addSystemMessage('Please enter a valid 6-character room code.');
            return;
        }

        try {
            this.isHost = false;
            this.roomCode = roomCode;
            
            this.updateUI('room-joined');
            this.addSystemMessage(`Joining room: ${this.roomCode}`);
            
            // Initialize PeerJS and connect to host
            await this.initializePeer();
            await this.connectToHost();
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.addSystemMessage('Failed to join room. Please check the room code.');
        }
    }

    async initializePeer() {
        return new Promise((resolve, reject) => {
            // Use room code as peer ID for host, random for clients
            const peerId = this.isHost ? this.roomCode : this.generatePeerId();
            
            this.peer = new Peer(peerId, {
                host: 'peerjs-server.herokuapp.com',
                port: 443,
                path: '/',
                secure: true,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            this.peer.on('open', (id) => {
                this.localPeerId = id;
                console.log('Peer initialized with ID:', id);
                this.updateConnectionStatus('connected');
                
                if (this.isHost) {
                    this.addSystemMessage('Room is ready! Share code: ' + this.roomCode);
                    this.addSystemMessage('Waiting for players to join...');
                } else {
                    this.addSystemMessage('Connected to PeerJS server');
                }
                
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                console.log('Incoming connection from:', conn.peer);
                this.handleIncomingConnection(conn);
            });

            this.peer.on('error', (error) => {
                console.error('Peer error:', error);
                this.addSystemMessage('Connection error: ' + error.message);
                reject(error);
            });

            this.peer.on('disconnected', () => {
                console.log('Peer disconnected');
                this.updateConnectionStatus('disconnected');
            });
        });
    }

    generatePeerId() {
        return Math.random().toString(36).substr(2, 9);
    }

    async connectToHost() {
        // Use room code as host peer ID
        const hostId = this.roomCode;
        
        try {
            this.addSystemMessage('Connecting to host...');
            const conn = this.peer.connect(hostId);
            this.setupConnection(conn);
        } catch (error) {
            console.error('Failed to connect to host:', error);
            this.addSystemMessage('Could not find host. Make sure the room code is correct.');
        }
    }

    handleIncomingConnection(conn) {
        console.log('Incoming connection from:', conn.peer);
        this.setupConnection(conn);
        this.addSystemMessage(`Player ${conn.peer.substring(0, 8)} joined`);
    }

    setupConnection(conn) {
        conn.on('open', () => {
            console.log('Connection established with:', conn.peer);
            this.connections.set(conn.peer, conn);
            this.peerCount = this.connections.size;
            this.updatePeerCount();
            
            if (!this.isHost) {
                this.addSystemMessage('Connected to room!');
            }
        });

        conn.on('data', (data) => {
            this.handleIncomingData(data, conn.peer);
        });

        conn.on('close', () => {
            console.log('Connection closed with:', conn.peer);
            this.connections.delete(conn.peer);
            this.peerCount = this.connections.size;
            this.updatePeerCount();
            this.addSystemMessage(`Player ${conn.peer.substring(0, 8)} left`);
        });

        conn.on('error', (error) => {
            console.error('Connection error:', error);
        });
    }

    handleIncomingData(data, peerId) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'chat-message':
                    this.displayMessage(message.data, peerId);
                    break;
                case 'peer-info':
                    this.addSystemMessage(`Player ${peerId.substring(0, 8)} joined`);
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;

        const messageData = {
            type: 'chat-message',
            data: {
                text: message,
                timestamp: Date.now(),
                sender: this.localPeerId
            }
        };

        // Display own message immediately
        this.displayMessage(messageData.data, this.localPeerId, true);

        // Send to all connected peers
        this.broadcastMessage(messageData);

        messageInput.value = '';
    }

    broadcastMessage(message) {
        this.connections.forEach((conn, peerId) => {
            if (conn.open) {
                conn.send(JSON.stringify(message));
            }
        });
    }

    displayMessage(messageData, peerId, isOwn = false) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${isOwn ? 'own' : 'user'}`;
        
        const timestamp = new Date(messageData.timestamp).toLocaleTimeString();
        const senderName = isOwn ? 'You' : `Player ${peerId.substring(0, 8)}`;
        
        messageElement.innerHTML = `
            <div class="message-header">${senderName} • ${timestamp}</div>
            <div class="message-content">${this.escapeHtml(messageData.text)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addSystemMessage(text) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        
        messageElement.className = 'message system';
        messageElement.innerHTML = `
            <div class="message-content">${this.escapeHtml(text)}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateUI(state) {
        const roomInfo = document.getElementById('roomInfo');
        const chatMessages = document.getElementById('chatMessages');
        const chatInputContainer = document.getElementById('chatInputContainer');
        const roomCodeDisplay = document.getElementById('roomCodeDisplay');
        const roomCodeInput = document.getElementById('roomCodeInput');
        const createBtn = document.getElementById('createRoomBtn');
        const joinBtn = document.getElementById('joinRoomBtn');

        switch (state) {
            case 'room-created':
                roomCodeDisplay.textContent = this.roomCode;
                roomInfo.classList.remove('hidden');
                chatMessages.classList.remove('hidden');
                chatInputContainer.classList.remove('hidden');
                roomCodeInput.disabled = true;
                createBtn.disabled = true;
                joinBtn.disabled = true;
                break;
                
            case 'room-joined':
                roomCodeDisplay.textContent = this.roomCode;
                roomInfo.classList.remove('hidden');
                chatMessages.classList.remove('hidden');
                chatInputContainer.classList.remove('hidden');
                roomCodeInput.disabled = true;
                createBtn.disabled = true;
                joinBtn.disabled = true;
                break;
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.className = `connection-status status-${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'Connected';
                break;
            case 'connecting':
                statusElement.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusElement.textContent = 'Disconnected';
                break;
        }
    }

    updatePeerCount() {
        document.getElementById('peerCount').textContent = this.peerCount;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Cleanup method
    destroy() {
        if (this.peer) {
            this.peer.destroy();
        }
        this.connections.clear();
    }
}

// Initialize chatroom when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatroom = new P2PChatroom();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.chatroom) {
        window.chatroom.destroy();
    }
});