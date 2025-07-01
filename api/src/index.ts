import express , { Request, Response } from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
const app = express();
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"]
    }
})
const port = process.env.PORT || 3001

app.use(express.json());

app.get("/", (req: Request, res:Response)=>{
    res.send("Hello Express")
});

io.on('connection',(socket)=>{
    console.log(`A host conected ${socket.id}`);
});

server.listen(port,()=>{
    console.log(`Server is running at http://localhost:${port}`)
});