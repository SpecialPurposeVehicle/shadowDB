var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3');

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();
var qry = '';
var host = '';

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

app.post('/api/taxyear', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    var qry;
    //console.log(p)
    p.taxyear = [];
    p.workprog = {};
    p.trades = {};
    p.mykeys = {};
    p.dates = [];
    var qrys = [];
    var msg = '';
    var datemsg = '';
    var invoicemsg = '';
    var workprogmsg = '';
    var trademsg = '';

    function send(){
        res.send(p);
        db.close();
        msg += '\n[--Return totals for a tax year--]\n';
        msg += 'Generated '+qrys.length+' queries for years:\n';
        msg += datemsg;
        msg += '\n'+invoicemsg+'\n ';
        msg += '\n'+workprogmsg+'\n' ;
        msg += '\n'+trademsg+'\n' ;
        console.log(msg);
    }
    db.serialize(function() {
        // INITIALISE VARS
        var start = 2015;
        var end = 2017;
        if(p.estate_id==='' || p.estate_id===undefined || p.estate_id==='ALL'){
            eqry = "";
        }else{
            eqry = " AND EstateCode='"+p.estate_id+"' ";
        }
        if(p.estate_id=='EA037'){
            start = 2011;
            p.showtrades = true
        }
        // GENERATE LIST OF QUERIES FOR EACH YEAR
        for (var i = start; i < end; i++) {
            // FROM "01-04-2016 12:00PM TO 31-03-2017 12:00PM
            // Generate tax date ranges // Y M    D    H    M    S
            var fromD = new Date(Date.UTC(i,'03','01','12'));
            var fromTS = fromD.getTime()/1000;
            var toD   = new Date(Date.UTC(i+1,'02','31','12'));
            var toTS = toD.getTime()/1000;
            var thisend = i+1;
            var tab = i-2000+1;
            var yearstr = i+"-"+tab;
            p.dates.push(yearstr);
            datemsg += yearstr+' | From: '+toTS+' To:'+toTS+'\n';
            // INVOICED
            var qry = "SELECT sum(FinalCostInPence) as '"+yearstr+"'";
            qry += " FROM workorders";
            qry += " WHERE UnixDateInvoice >= "+fromTS;
            qry += " AND UnixDateInvoice <= "+toTS;
            qry += eqry;
            qrys.push({type:'invoiced',qry:qry})
            invoicemsg = qry;
            // WORKS PROGRAMME
            var qry = "SELECT WorkProg,";
            qry += "'"+yearstr+"' as taxyear, ";
            qry += "sum(FinalCostInPence) as cost,";
            qry += "count(WORef) as jobs,";
            qry += "name ";
            qry += "FROM 'workorders' ";
            qry += "LEFT JOIN keys ON WorkProg=key_id ";
            qry += "WHERE UnixDateInvoice >= "+fromTS+' ';
            qry += "AND UnixDateInvoice <= "+toTS+' ';
            qry += eqry;
            qry += "GROUP BY WorkProg";
            qrys.push({type:'workprog',qry:qry})
            workprogmsg = qry;
            // TRADES
            var qry = "SELECT "
            qry += "'"+yearstr+"' as taxyear, ";
            qry += "MainTrade, "
            qry += "name, "
            qry += "sum(FinalCostInPence) as cost, "
            qry += "count(MainTrade) as jobs "
            qry += "FROM 'workorders' "
            qry += "LEFT JOIN keys ON MainTrade=key_id "
            qry += "WHERE UnixDateInvoice >= "+fromTS+' ';
            qry += "AND UnixDateInvoice <= "+toTS+' ';
            qry += eqry;
            qry += "GROUP BY MainTrade "
            qry += "ORDER BY name ASC"
            qrys.push({type:'trades',qry:qry})
            trademsg = qry;
        }
        var counter = 0;
        qrys.map( function(item) {
            db.each(item.qry, function(err, row) {
                    for (var j in row) {
                        if(item.type==='invoiced'){
                            var val = 0;
                            if(row[j] != null){
                                val = row[j];
                            }
                            p.taxyear.push({key:j,value:val});
                        }else if(item.type==='workprog'){
                            var pr = row.WorkProg;
                            var t = row.taxyear;
                            // Generate the default grid
                            if(p.workprog[pr]===undefined){
                                p.workprog[pr] = {};
                                for(i=start;i<end;i++){
                                    var r = i+1-2000;
                                    var tab = i+'-'+r;
                                    p.workprog[pr][tab] = {};
                                }
                            }
                            // Save the data to the grid
                            p.workprog[pr][t].name = row.taxyear;
                            p.workprog[pr][t].jobs = row.jobs;
                            p.workprog[pr][t].cost = row.cost;
                            p.mykeys[pr] = row.name;
                        }else if(item.type==='trades'){
                            var pr = row.MainTrade;
                            var t = row.taxyear;
                            // Generate the default grid
                            if(p.trades[pr]===undefined){
                                p.trades[pr] = {};
                                for(i=start;i<end;i++){
                                    var r = i+1-2000;
                                    var tab = i+'-'+r;
                                    p.trades[pr][tab] = {};
                                }
                            }
                            // Save the data to the grid
                            p.trades[pr][t].name = row.taxyear;
                            p.trades[pr][t].jobs = row.jobs;
                            p.trades[pr][t].cost = row.cost;
                            p.mykeys[pr] = row.name;
                        }
                    }
                }, function() {
                    // Wait until all the queries have finished
                    counter = counter+1;
                    if(counter===qrys.length){
                        send();
                    }
            });
        });
    });
});

app.post('/api/estates', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    //host = request.headers.host;
    console.log('#######HOST: '+host)
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    var qry;
    p.estates = [
        { estate_id: 'ALL', estate_name: 'ALL AREAS' },
        { estate_id: '#', estate_name: '--------------' }
    ];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        console.log('\n[--Return list of estates--]');
        console.log(qry);
    }
    db.serialize(function() {
        qry = "SELECT estate_id, estate_name \n";
        qry += "FROM estates\n";
        qry += "ORDER BY estate_name ASC;\n";
        db.each(qry, function(err, row) {
                p.estates.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/streets', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    var qry;
    p.streets = [
        { id:'ALL', name: 'ALL WAYS' },
        { id:'#', name: '--------------' }
    ];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        console.log('\n[--Return list of streets--]');
        console.log(qry);
    }
    db.serialize(function() {
        eqry = "";
        if(p.estate_id!="ALL"){
            eqry += "WHERE estate_id='"+p.estate_id+"' \n";
        }
        qry = "SELECT DISTINCT Street as id, Street as name \n";
        qry += "FROM 'workorders.CGEall.2011-2017'\n";
        qry += "ORDER BY Street ASC;\n";

        qry = "SELECT DISTINCT street as id, Street as name\n"
        qry += "FROM 'properties'\n"
        qry += eqry;
        qry += "ORDER BY street ASC"

        db.each(qry, function(err, row) {
                p.streets.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/trades', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    var qry;
    p.trades = [
        { trade_id: 'ALL', name: 'ALL TRADES' },
        { trade_id: '#', name: '--------------' }
    ];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        console.log('\n[--Return list of trades--]');
        console.log(qry);
    }
    db.serialize(function() {
        qry = "SELECT key_id as trade_id, name \n";
        qry += "FROM  'keys'\n";
        qry += "WHERE type='trade' \n";
        qry += "ORDER BY name ASC;\n";
        db.each(qry, function(err, row) {
                p.trades.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/properties', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    p.properties = [];
    function send(){
        res.send(p);
        db.close();
        console.log('\n[--Return list of propeties--]');
        console.log(p.qry);
    }
    db.serialize(function() {
        qry = "SELECT DISTINCT AddressLine1, Street, PostCode, PropRef\n";
        qry += "FROM 'workorders.CGEall.2011-2017' \n";
        qry += "WHERE street='"+p.street_id+"'\n";
        qry += "ORDER BY UPPER(AddressLine1);\n";

        var sqry = ''
        if(p.street_id!='ALL'){
            sqry = "WHERE street='"+p.street_id+"'\n";
        }
        qry = "SELECT DISTINCT AddressLine1, Street, PostCode, PropRef\n";
        qry += "FROM 'workorders.CGEall.2011-2017' \n";
        qry += sqry;
        qry += "ORDER BY UPPER(AddressLine1);\n";

        p.qry = qry;
        db.each(qry, function(err, row) {
                p.properties.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/repairs', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    p.repairs = [];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        console.log('\n[--Return list of repairs--]');
        console.log(qry);
    }
    db.serialize(function() {
        var PropRef = "WHERE PropRef='"+p.PropRef+"'\n";
        if(p.PropRef===undefined){
            PropRef = "WHERE PropRef IS NULL OR PropRef = '' \n"
        }
        qry = "SELECT DISTINCT WORef, WorkProg, MainTrade, FinalCostInPence, WODescription, DateRaised, DateInvoice  \n";
        qry += "FROM 'workorders' \n";
        qry += PropRef
        qry += "ORDER BY UnixDateRaised \n"
        qry += "LIMIT 100;"
        db.each(qry, function(err, row) {
                p.repairs.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/totalrepairs', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database('lambeth.db');
    var p = req.body;
    p.totalrepairs = [];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        console.log('\n[--Return total repairs--]');
        console.log(qry);
    }
    db.serialize(function() {
        qry = "SELECT DISTINCT WOref, WorkProg, MainTrade, TotalCost, WODescription, DateRaised \n";
        qry += "FROM 'workorders.CGEall.2011-2017' \n";
        qry += "WHERE PropRef='"+p.PropRef+"';";
        qry += "ORDER BY UnixDateRaised;"
        db.each(qry, function(err, row) {
                p.repairs.push(row)
            }, function() {
                send();
        })
    })
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
