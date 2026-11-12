const http = require("http");
const fs = require("fs");
const path = require("path");
const {createNoriHandler} = require('./lib/nori-server.cjs');

const port = Number(process.env.PORT) || 8000;
const root = path.join(__dirname, "dist");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".task": "application/octet-stream",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2"
};

async function createServer(options={}) {
 const {LESSONS}=await import('./dist/js/lessons.js');
 const nori=createNoriHandler({lessons:LESSONS,...options});
 return http.createServer(async (request, response) => {
  let pathname;
  try {pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);}catch {response.writeHead(400).end('Bad request');return;}
  if(await nori(request,response,pathname))return;
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405).end('Method not allowed');return;}
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    response.end(request.method==='HEAD'?undefined:data);
  });
 });
}
if(require.main===module)createServer().then(server=>server.on('error',error=>{console.error(`Novi server: ${error.message}. If the port is busy, stop your earlier Novi server or set PORT.`);process.exitCode=1;}).listen(port,process.env.HOST||'127.0.0.1',()=>{
 console.log(`Novi ASL is running at http://localhost:${port}`);
})).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={createServer};
