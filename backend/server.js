const express = require('express');
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const passport = require("passport");
const GitHubStrategy = require("passport-github").Strategy;
const mongoose = require("mongoose");
const fetch = require("node-fetch");
const localStrategy = require("passport-local");
const session = require("express-session");
const ObjectID = require("mongodb").ObjectID;
let gitData = {};

mongoose.connect(process.env.DB, { useNewUrlParser: true });



const GitHubSchema = new mongoose.Schema({
    id: String,
    name: String,
    photo: String,
    created_on: Date,
    provider: String,
    last_login: Date,
    login_count: Number
});


const lookingSchema = new mongoose.Schema({
    author: String,
    search: Array,
    date: Date
})

const GitHub = mongoose.model("GitHub", GitHubSchema, "GitHub");
const Looking = mongoose.model("Looking", lookingSchema, "Looking");

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(express.static('public'));
const port = process.env.PORT || 3000;

passport.use(new localStrategy(
      function(username, done){ // input data form, and checks this data
        GitHub
          .findOne({username: username}, (err, user)=>{
            if(err) return done(err);
            if(!user) return done(null, false);
            return done(null, user); // return exists, for example: user ensureAuthenticated
        })
      }))
  
passport.serializeUser((user, done) =>{ // convert its contents into a small key
      done(null, user._id);// from github undefined
    });

passport.deserializeUser((id, done)=>{
      GitHub.findOne(
        {_id: new ObjectID(id)}, 
        (err, data) =>{
          done(null, data);
        });
    })


app.use(session({ // set up and use session
      secret: process.env.SESSION_SECRET, // SESS... have random value, but will use for compute the hash for cookie
      resave: true,
      saveUninitialized: true
})); 

app.use(passport.initialize());// to use passport in express or connect-base-application
app.use(passport.session()); // to use persisstent passport login session


passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, cb) => {
        GitHub.findOneAndUpdate({id: profile.id},
                         {$setOnInsert:{
                            id: profile.id,
                            name: profile.displayName || 'Anonymous',
                            photo: profile.photos[0].value || '',
                            created_on: new Date(),
                            provider: profile.provider || ''
                           },
                          $set:{
                             last_login: new Date()
                           },
                          $inc:{
                             login_count: 1 // count every registered
                           }
                         },
                         {upsert: true, new: true}, // new document
                         (err, user) => {
              gitData = user; // in deserialize only second time. Here for the first data get
              return cb(null, user);
            })
    }
  ));

app.route('/auth/github')
       .get(passport.authenticate('github'));
     
app.route('/auth/github/callback')
       .get(passport.authenticate('github', {failureRedirect: '/'}),
            (req, res)=>{
          res.redirect('https://k33p41qjo3.codesandbox.io/');     
    });



io.on('connection', (client) => {
    io.emit("photoProfile", gitData);
  
    const getData = (value) =>{
      fetch(value)
            .then(response => response.json())
            .then(result=> {
                if(result.hits){
                
                    client.emit("imageFromServer", result.hits);
                }
              })
              .catch(()=> console.error());
        
          }
  
    client.on("inputFromClient", data =>{
      if(data !== false){
        const API = `https://pixabay.com/api/?key=${process.env.API_PIXABAY}&q=${data.input}&image_type=photo&page=${data.pageClick}&per_page=20`;
        getData(API);
      }

    })
    
    client.on("submitFromClient", data=>{

      Looking
        .findOneAndUpdate({author: data.submitName}, 
                          {$setOnInsert:{
                            name: data.submitName
                            },
                           $push: {
                             search: data.submitData
                            }
                          },
                         {upsert: true, new: true},
                        (err, look)=>{
                   if(err) console.log( err);
                   client
                      .emit("dataSearchFromServer", 
                            {
                              name: look.author,
                              search: data.submitData,
                              allPreviousSearch: look.search
                             });
                });
        });

    client.on("disconnect", ()=>{
      console.log("socket disconnect");
    });

})


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');

});

app.get('/images/:search', (req,res)=>{
  let data = req.params.search;
  let offset = req.query;
  
  let items = [];
  let search = [];
  let lookData = [];
  
  fetch(`https://pixabay.com/api/?key=${process.env.API_PIXABAY}&q=${data}&image_type=photo&page=${offset.offset}`)
       .then(response => response.json())
            .then(result=> {
                result.hits.forEach(item=>{
                  items.push({address: item.pageURL,
                              image: item.largeImageURL});
                });

             Looking
                .findOneAndUpdate({author: 'Anonymous'}, 
                                  {$setOnInsert:{
                                    name: 'Anonymous'
                                    },
                                   $push: {
                                     search: data
                                    }
                                  },
                                 {upsert: true, new: true},
                                (err, look)=>{
                           if(err) console.log( err);
                           items.push({
                                      name: look.author,
                                      search: data,
                                      allPreviousSearch: look.search
                                     });
                           res.send(items);
                        });  
              })
              .catch(()=> console.error());

})


server.listen(port, ()=> console.log("Server is listening on port: " + port));
