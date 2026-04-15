import io from "socket.io-client";

const socket = io(window.location.origin, {
  autoConnect: true,
});

export default socket;
