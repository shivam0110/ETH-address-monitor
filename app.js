/* Importing required pakages */
var createError = require('http-errors');
var express = require('express');
var path = require('path');
const config = require('config');
const mysql = require("mysql2/promise");
const Web3 = require('web3');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

/* Importing various endpoint routes */
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var subscription;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

/* Using the imported pakages. */
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* Using the imported routes */
app.use('/', indexRouter);
app.use('/users', usersRouter);



app.get('/unsub',(req,res,next) => {
  subscription.unsubscribe(function(error, success){
    if(success){
      console.log('Successfully unsubscribed!');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.json({"status": "Stopped"});
    }
  });
});

app.post('/sub', (req,res,next) => {
  try{         
    var web3 = new Web3('wss://ropsten.infura.io/ws/v3/');    
    subscription = web3.eth.subscribe('pendingTransactions', function(error, result){
      if(error)
        console.log(error);
    })
    .on("data", function(txHash){
      return web3.eth.getTransaction(txHash, (err, returnedValue) => {
          if (err) {
            console.log(err);
          }
          if (returnedValue && (returnedValue.from === req.body.address || returnedValue.to ===  req.body.address)) {
            console.log(returnedValue);
            db.query(`Insert into ethmonitor (tfrom, tto, txHash) values ("${returnedValue.from}", "${returnedValue.to}","${returnedValue.hash}");`);
          }
      })
    });

  }catch(err){
      res.status(err.status || 500);
      res.render('error');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.json({"status": "running"});
});



app.use(function(req, res, next) {
/** catch 404 and forward to error handler */
  next(createError(404));
});

app.use(function(err, req, res, next) {
  /** Error handler, set locals, only providing error in development and render the error page */
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

async function main(){
/** Sets up connection to database */
  db = await mysql.createConnection({
    host: config.get('db.host'),
    user: config.get('db.user'),
    password: config.get('db.password'),
    database: config.get('db.database'),
    timezone: config.get('db.timezone'),
    charset: config.get('db.charset')
  });
  console.log("Connected!\n");
}
main();

module.exports = app;
