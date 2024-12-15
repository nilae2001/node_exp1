const { parse } = require("url");
const { DEFAULT_HEADER } = require("./util/util.js");
const controller = require("./controller");
const path = require("path");
const fs = require("fs");



const allRoutes = {
  // Homepage
  "/:get": (request, response) => {
    controller.getProfiles(request, response);
  },

  // POST: localhost:3000/form
  "/form:post": (request, response) => {
    controller.sendFormData(request, response);
  },
  
  // GET: localhost:3000/feed
  "/feed:get": (request, response) => {
    controller.getFeed(request, response);
  },

  
  default: (request, response) => {
    response.writeHead(404, DEFAULT_HEADER);
    fs.createReadStream(path.join(__dirname, "views", "404.html"), "utf8").pipe(
      response
    );
  },
};


function handler (request, response) {

  const { url, method } = request;

  const { pathname } = parse(url, true);

  if (pathname.includes(".jpeg") || pathname.includes(".jpg")) {
    const imagePath = path.join(__dirname, pathname);
    
    response.setHeader('Content-Type', 'image/jpeg'); 
    const stream = fs.createReadStream(imagePath);
    
    stream.pipe(response); 

    return;
  } else if (pathname.includes(".png")) {
    const imagePath = path.join(__dirname, pathname);
    
    response.setHeader('Content-Type', 'image/png'); 
    const stream = fs.createReadStream(imagePath);
    
    stream.pipe(response);

    return;
  }

  const key = `${pathname}:${method.toLowerCase()}`;


  const chosen = allRoutes[key] || allRoutes.default;

  return Promise.resolve(chosen(request, response)).catch(
    handlerError(response)
  );
}


function handlerError(response) {
  return (error) => {
    console.log("Something bad has  happened**", error.stack);
    response.writeHead(500, DEFAULT_HEADER);
    response.write(
      JSON.stringify({
        error: "internet server error!!",
      })
    );

    return response.end();
  };
}

module.exports = handler;
