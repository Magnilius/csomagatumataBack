require('dotenv').config()
const express = require('express');
const app = express();
const cors = require("cors");
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { json } = require('express');

app.use(express.json());

const corsOptions = {
    origin: function (origin, callback) {
      if (!origin || "http://localhost:3000".indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error("CORS hiba"))
      }
    },
    credentials: true,
  }
  app.use(cors(corsOptions))



app.get('/GetPackage', (req, res) =>{
  let packages = require('./data/packagesInBox.json');
    let reqPack = {
        Code: req.query.code.toString(),
        Pass: req.query.pass.toString()
    }
    let today =  new Date().toISOString().split('T')[0];
    const returnValArr = packages.filter(pack => {
        if (reqPack.Code == pack.Code && reqPack.Pass == pack.Password && pack.Delivered == 0 && pack.LastDate > today) {
            pack.Delivered = 1;
            return pack
        }
    })
    try {
        const returnVal = returnValArr[0].Container;
        res.json(returnVal);
    } catch (err) {
        res.json(null)
    }
    

    fs.writeFile('./data/packagesInBox.json', JSON.stringify(packages), 'utf-8', function(err) {
        if (err) throw err;
        
        });

})

app.get('/validateUser', (req, res) => {
  const token = req.query.token;
  if (token == null) return res.sendStatus(401)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.send(false)
    res.send(true);
} )
})

app.get('/storeCheck', (req, res) => {

  let emptyStore = checkFreeStorage();
  res.json(emptyStore)

})

app.post('/Login', (req, res) => {
  let Users = require('./data/deliver.json');

  let token = "";
  const authUser = {
    Username: req.body.Username,
    Password: req.body.Password
  }

  
  let foundUser = Users.filter(user => {
    if (user.Username == authUser.Username && user.Password == authUser.Password) {
      return (user)
    }
  })
  if (foundUser.length == 1) {
    token = jwt.sign(foundUser[0], process.env.ACCESS_TOKEN_SECRET)
  }

  res.json(token)

})

app.post('/AddPackage', (req, res) => {
  try {
    let packages = require('./data/packagesInBox.json');
    const RandomGen = (length) => {
      const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      const charactersLength = characters.length;
      for ( let i = 0; i < length; i++ ) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
      }
  
      return result;
    }
  
    let code = RandomGen(9);
    let password = RandomGen(6);
    let id = packages.length +1;
    let Size = req.body.Size;
  
    const assignContainer = () => {
      let freeSpace = checkFreeStorage();
      let first;
      switch (Size) {
          case 'A':
             first = freeSpace.find(store => store.Size === 'A');
          break;
          case 'B': 
              first = freeSpace.find(store => store.Size === 'B');
              if (first === undefined) {
                  first = freeSpace.find(store => store.Size === 'A');
              }
          break;
          case 'C': 
              first = freeSpace.find(store => store.Size === 'C');
              if (first === undefined) {
                  first = freeSpace.find(store => store.Size === 'B');
              }
              if (first === undefined) {
                  first = freeSpace.find(store => store.Size === 'A');
              }
              break;
          default:
              break;
      }
  
      return first.ID
  }
  
  let container = assignContainer();
  
    let newPack = {
      id: id,
      size: Size,
      Code: code,
      Password: password,
      LastDate: req.body.LastDate,
      Container: container,
      Delivered: 0
    }
  
    //console.log(newPack);
    packages.push(newPack);
    fs.writeFile('./data/packagesInBox.json', JSON.stringify(packages), 'utf-8', function(err) {
      if (err) throw err;
      
      });
      res.json('Success')
  } catch(err) {
    res.send("")
  }
 
})


function checkFreeStorage() {
  
  let store = require('./data/store.json');
  let packages = require('./data/packagesInBox.json');
  let today =  new Date().toISOString().split('T')[0];
  let activePacks = packages.filter(pack => {
    if (pack.Delivered === 0 && pack.LastDate > today) {
      return pack
    }
  })

  //console.log(activePacks)

  store.map(s => {
    activePacks.forEach(element => {
      if (s.ID == element.Container) {
        s.Full = true
      }
    })
  })

  let emptyStore = store.filter(s => s.Full === false)
 
  return emptyStore
}


app.listen(8080)