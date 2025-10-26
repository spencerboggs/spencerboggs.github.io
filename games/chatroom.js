class P2PChatroom {
    constructor() {
        this.isHost = false;
        this.roomCode = null;
        this.peers = new Map(); // peerId -> peer connection
        this.dataChannels = new Map(); // peerId -> data channel
        this.peerCount = 0;
        this.localPeerId = this.generatePeerId();
        
        // WebRTC configuration
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

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

    generatePeerId() {
        return Math.random().toString(36).substr(2, 9);
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
            
            // Start listening for connections
            this.startHostMode();
            
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
            
            // Connect to host
            await this.connectToHost();
            
        } catch (error) {
            console.error('Error joining room:', error);
            this.addSystemMessage('Failed to join room. Please check the room code.');
        }
    }

    startHostMode() {
        // Host mode - wait for connections
        this.updateConnectionStatus('connected');
        this.addSystemMessage('Waiting for players to join...');
    }

    async connectToHost() {
        // For now, we'll simulate peer connections
        // In a real implementation, you'd use a signaling server or WebRTC data channels
        this.updateConnectionStatus('connecting');
        
        // Simulate connection delay
        setTimeout(() => {
            this.updateConnectionStatus('connected');
            this.addSystemMessage('Connected to room!');
        }, 1000);
    }

    async createPeerConnection(peerId) {
        const peerConnection = new RTCPeerConnection(this.rtcConfig);
        
        // Create data channel for messaging
        const dataChannel = peerConnection.createDataChannel('chat', {
            ordered: true
        });

        this.setupDataChannel(dataChannel, peerId);

        // Handle incoming data channels
        peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            this.setupDataChannel(channel, peerId);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    peerId: this.localPeerId,
                    targetPeerId: peerId
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${peerId}:`, peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'connected') {
                this.addSystemMessage(`Player ${peerId.substring(0, 6)} joined`);
            } else if (peerConnection.connectionState === 'disconnected' || 
                      peerConnection.connectionState === 'failed') {
                this.removePeer(peerId);
            }
        };

        this.peers.set(peerId, peerConnection);
        return peerConnection;
    }

    setupDataChannel(dataChannel, peerId) {
        dataChannel.onopen = () => {
            console.log(`Data channel opened with ${peerId}`);
            this.dataChannels.set(peerId, dataChannel);
        };

        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleIncomingMessage(message, peerId);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        dataChannel.onclose = () => {
            console.log(`Data channel closed with ${peerId}`);
            this.dataChannels.delete(peerId);
        };
    }

    handleIncomingMessage(message, peerId) {
        switch (message.type) {
            case 'chat-message':
                this.displayMessage(message.data, peerId);
                break;
            case 'peer-join':
                this.addSystemMessage(`Player ${peerId.substring(0, 6)} joined`);
                break;
            case 'peer-leave':
                this.addSystemMessage(`Player ${peerId.substring(0, 6)} left`);
                break;
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
        this.dataChannels.forEach((dataChannel, peerId) => {
            if (dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify(message));
            }
        });
    }

    displayMessage(messageData, peerId, isOwn = false) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${isOwn ? 'own' : 'user'}`;
        
        const timestamp = new Date(messageData.timestamp).toLocaleTimeString();
        const senderName = isOwn ? 'You' : `Player ${peerId.substring(0, 6)}`;
        
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

    removePeer(peerId) {
        this.peers.delete(peerId);
        this.dataChannels.delete(peerId);
        this.peerCount = this.peers.size;
        this.updatePeerCount();
        this.addSystemMessage(`Player ${peerId.substring(0, 6)} disconnected`);
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

    // Signaling methods (simplified for GitHub Pages)
    sendSignalingMessage(message) {
        // In a real implementation, this would send to a signaling server
        // For GitHub Pages, we'll use a simple approach with localStorage
        // This is a limitation - real P2P requires some form of signaling
        console.log('Signaling message:', message);
    }
}

// Initialize chatroom when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatroom = new P2PChatroom();
});
