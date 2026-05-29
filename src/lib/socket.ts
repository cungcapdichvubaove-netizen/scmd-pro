type SocketModule = typeof import('socket.io-client');
type SocketInstance = ReturnType<SocketModule['default']>;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getSocketUrl = () => trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || window.location.origin);
const getSocketPath = () => import.meta.env.VITE_SOCKET_PATH || '/socket.io';

let socketInstance: SocketInstance | null = null;
let socketModulePromise: Promise<SocketModule> | null = null;

const loadSocketModule = async (): Promise<SocketModule> => {
  if (!socketModulePromise) {
    socketModulePromise = import('socket.io-client');
  }

  return socketModulePromise;
};

export const resetSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const getSocket = async (_token?: string | null): Promise<SocketInstance> => {
  if (socketInstance) {
    return socketInstance;
  }

  const { default: io } = await loadSocketModule();

  socketInstance = io(getSocketUrl(), {
    path: getSocketPath(),
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling']
  });

  return socketInstance;
};
