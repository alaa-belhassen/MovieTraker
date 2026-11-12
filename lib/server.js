// Serveur custom : Next.js + Socket.IO sur le même port (3000)
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// État des salles en mémoire (MongoDB viendra à l'étape suivante)
// code -> { playing, position, serverTime }
const rooms = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    // Un client rejoint une salle et reçoit l'état courant
    socket.on("room:join", (code) => {
      socket.join(code);
      if (!rooms.has(code)) {
        rooms.set(code, { playing: false, position: 0, serverTime: Date.now() });
      }
      socket.emit("room:state", rooms.get(code));
    });

    // Commande de lecture : "play" | "pause" | "seek"
    socket.on("player:cmd", ({ code, type, position }) => {
      const prev = rooms.get(code);
      if (!prev || typeof position !== "number") return;

      const state = {
        playing: type === "play" ? true : type === "pause" ? false : prev.playing,
        position,
        serverTime: Date.now(),
      };
      rooms.set(code, state);
      io.to(code).emit("room:state", state); // diffusé à tous, y compris l'émetteur
    });
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => console.log(`> Prêt sur http://localhost:${port}`));
});
