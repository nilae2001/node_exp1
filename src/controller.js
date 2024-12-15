const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const { formidable } = require("formidable");
// const url = require("node:url");
const querystring = require("querystring");
const { parse, url } = require("url");


const controller = {
    getProfiles: (request, response) => {
          const stream = fs.createReadStream(
          path.join(__dirname, "../database/data.json"),
          "utf8"
        );
    
        let data = "";
    
        stream.on("data", (chunk) => {
          data += chunk;
        });
    
        stream.on("end", async () => {
          try {
            const profiles = JSON.parse(data);
    
            for (let user of profiles) {
                const profilePath = path.join("/photos/", user.username, user.profile)
                console.log(profilePath)
                user.profile = profilePath;
            }
    
            ejs.renderFile(
                path.join(__dirname, "./views/home.ejs"),
                { profiles },
                (err, html) => {
                  if (err) {
                    console.error("Error rendering EJS:", err);
                    response.end("Failed to load profiles.");
                  } else {
                    response.end(html);
                  }
                }
              );
            } catch (err) {
              console.error("Error processing profiles:", err);
              response.end("Failed to load profiles.");
            }
          });
      
          stream.on("error", (err) => {
            console.error("Error reading data.json:", err);
            response.end("Server error.");
          });
        },

  sendFormData: async (request, response) => {

      const obj = querystring.parse(request.url.split("?")[1])
      
      const username = obj.username;

      const targetDir = path.join(__dirname, 'photos', username); 

      const form = formidable({ uploadDir: targetDir, keepExtensions: true, filename: (name, ext) => `${name.replace(/\s+/g, '_')}${ext}` });
      
      let fields, files;
  
      try {
        [fields, files] = await form.parse(request);
      } catch (err) {
          console.error(err);
          response.writeHead(400, { 'Content-Type': 'text/plain' });
          return response.end('Failed to parse the form.');
      }
  
      const uploadedFile = files.multipleFiles[0]; 
      
      const originalFileName = uploadedFile.originalFilename;
      
      const sanitizedFileName = originalFileName.replace(/\s+/g, '_');

      try {
  
          const dataPath = path.join(__dirname, "../database/data.json");
          const data = await fs.promises.readFile(dataPath, 'utf-8');
          const users = JSON.parse(data);
  
          const user = users.find(user => user.username === username);
  
          if (user) {
              
              user.photos.push(sanitizedFileName);

              user.stats.posts = user.photos.length;
  
              await fs.promises.writeFile(dataPath, JSON.stringify(users, null, 2));
  
              response.setHeader('Content-Type', 'text/html');
              response.end(`<h1>File uploaded and added to ${username}'s profile photos. </h1>`);
          } else {
              response.setHeader('Content-Type', 'text/plain');
              response.end(`User ${username} not found.`);
          }
      } catch (err) {
          console.error(err);
          response.writeHead(err.httpCode || 400, { 'Content-Type': 'text/plain' });
          response.end(String(err));
      }
  },

  getFeed: (request, response) => {
    const { url } = request;

    const username = url.split("/feed?username=")[1];

    const stream = fs.createReadStream(
      path.join(__dirname, "../database/data.json"),
      "utf8"
    );

    let data = "";

    stream.on("data", (chunk) => {
      data += chunk;
    });

    stream.on("end", async () => {
      const profiles = JSON.parse(data);

      const user = profiles.find(profile => profile.username === username);
      
      const profilePath = path.join("/photos/", user.username, user.profile)
      console.log(profilePath)
      user.profile = profilePath;
    

      user.photos = await Promise.all(
        user.photos.map(async picture => {
          const postsPath = path.join("/photos/", user.username, picture)
          return postsPath;
        })
      );

    ejs.renderFile(
        path.join(__dirname, "./views/feed.ejs"),
        { user },
        (err, html) => {
          if (err) {
            console.error("Error rendering EJS:", err);
            response.end("Failed to load feed.");
          } else {
            response.end(html);
          }
        }
      );
    });
  },

};

module.exports = controller;
