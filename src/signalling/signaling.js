import { io } from "socket.io-client";

// Enhanced signaling channel with reliable message delivery
class SignalingChannel {
    constructor(peerId, signalingServerUrl, token) {
        this.peerId = peerId;
        this.connected = false;
        this.messageQueue = [];
        this.socket = io(signalingServerUrl, {
            auth: { token },
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });
        this.onMessage = () => { };
    }

    connect() {
        this.socket.on("connect", () => {
            console.log(`✅ Signaling connected: ${this.peerId}`);
            this.connected = true;
            this.socket.emit("ready", this.peerId);

            // Send any queued messages
            this.flushQueue();
        });

        this.socket.on("disconnect", () => {
            console.log(`❌ Signaling disconnected: ${this.peerId}`);
            this.connected = false;
        });

        this.socket.on("connect_error", (error) => {
            console.error("Connection error:", error.message);
        });

        this.socket.on("message", (data) => {
            console.log(`📨 Received message:`, data);
            this.onMessage(data);
        });

        this.socket.on("uniquenessError", (message) => {
            console.error("Signaling error:", message.error);
        });

        this.socket.connect();
    }

    send(message) {
        if (this.connected) {
            this.socket.emit("message", { from: this.peerId, target: "all", message });
        } else {
            console.warn("Not connected, queueing message");
            this.messageQueue.push({ type: "broadcast", message });
        }
    }

    sendTo(targetPeerId, message) {
        if (this.connected) {
            console.log(`📤 Sending to ${targetPeerId}:`, message);
            this.socket.emit("messageOne", { from: this.peerId, target: targetPeerId, message });
        } else {
            console.warn("Not connected, queueing message for", targetPeerId);
            this.messageQueue.push({ type: "direct", target: targetPeerId, message });
        }
    }

    flushQueue() {
        console.log(`Flushing ${this.messageQueue.length} queued messages`);
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            if (msg.type === "broadcast") {
                this.send(msg.message);
            } else {
                this.sendTo(msg.target, msg.message);
            }
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export default SignalingChannel;
