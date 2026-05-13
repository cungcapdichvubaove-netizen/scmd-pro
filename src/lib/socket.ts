import io from "socket.io-client";

// Singleton instance
let socketInstance: any = null;

/**
 * getSocket: Phục vụ mô hình Real-time với Auth Handshake và Tenant Isolation.
 * Đảm bảo socket luôn được cập nhật token mới nhất để vượt qua middleware bảo mật của Backend.
 */
export const resetSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const getSocket = (token?: string | null): any => {
  if (socketInstance) {
    if (token) {
      socketInstance.auth = { token };
    }
    return socketInstance;
  }

  const savedToken = typeof window !== 'undefined' ? localStorage.getItem('scmd_jwt') : null;
  const currentToken = token || savedToken;

  socketInstance = io(window.location.origin, {
    // FIX: Không thay đổi target — vẫn dùng window.location.origin.
    // Trong dev: Vite proxy '/socket.io' → http://localhost:5000 (với ws: true).
    // Trong production: Nginx proxy '/socket.io' → app:3000.
    // socket.io-client sẽ kết nối đúng trong cả hai môi trường.
    autoConnect: !!currentToken, // Chỉ tự động kết nối nếu có token (Realtime Auth)
    auth: {
      token: currentToken
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  return socketInstance;
};

// Default export
const socket = getSocket();
export default socket;