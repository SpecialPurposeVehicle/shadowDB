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
var mycache = {};
const dbPath = path.resolve(__dirname, 'lambeth.db')
var server = process.env.NODE_ENV;

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

function logme(msg){
    if (process.env.NODE_ENV === 'development') {
        console.log(msg);
    }
}

logme(process.versions.node);
if (process.env.NODE_ENV === 'development') {
    logme("DEV SERVER");
}
if (process.env.NODE_ENV === 'production') {
    logme("PRODUCTION SERVER");
}

// Cache DB queries to reduce load on the server
function cache(db, p){
    thiscache = {result:'nocache'};
    // Generate a unique ID for the cache
    var cacheid = p.col+p.estate_id+p.street_id+p.property_id+p.repairs_id;
    cacheid += p.trade_id+p.value+p.url;
    thiscache.cacheid = cacheid;
    // See if we already have the cache and wait for a response
    var qry = 'SELECT cache_id, data FROM cache WHERE cache_id="'+cacheid+'"';
    // How to create a nodjejs Promise:  https://medium.com/dev-bits/writing-neat-asynchronous-node-js-code-with-promises-32ed3a4fd098
    logme('run cache');
    return new Promise(function(resolve, reject) {
        logme('run cache2');
        db.each(qry, function(err, row) {
            if (err) {
                reject(err);
            } else {
                logme("got row: "+row.cache_id);
                thiscache.result='gotcache';
                thiscache.data=JSON.parse(row.data);
            }
        }, function() {
            resolve(thiscache);
        })
    })
}

function sendmeback(db, res, p, msg){
    res.send(p);
    var qry = ''
    //logme(msg);
    // Create cache
    p_string = JSON.stringify(p);
    var qry = 'INSERT INTO cache(cache_id, data) VALUES(?,?)';
    db.run(qry, [mycache.cacheid,p_string], function(err) {
        if (err) {
            logme('Cache already exists');
        }else{
            logme('A row has been inserted with rowid'+this.lastID);
        }
    });
    // CLose the DB
    db.close();
}

function myprom(bob){
   logme('START MYPROM: '+bob)
   return new Promise(function(resolve, reject) {
        resolve('DONE');
   })
}


app.post('/api/taxyear', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    var qry;
    //logme(p)
    myprom('go on then you bugger').then(function(result) {
        logme(result);
    })

    cache(db, p).then(function(result) {
        mycache = result;
        if(mycache.result==='gotcache'){
            logme("     Retrived DB query from cache");
            msg = "Generated taxyear";
            p = mycache.data;
            sendmeback(db, res, p, msg);
        }else{
            logme("     Performed DB query then added to cache");
            p.server = server;
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

            db.serialize(function() {
                // CHECK cache
                //var mycache = cache(db, p);
                if(mycache.result==='gotcache'){
                    p = mycache.p;
                    send();
                }else if(mycache.result==='nocache'){
                    // INITIALISE VARS
                    var start = 2015;
                    var end = 2017;
                    if(p.estate_id==='' || p.estate_id===undefined || p.estate_id==='ALL'){
                        eqry = "";
                    }else{
                        eqry = " AND EstateCode='"+p.estate_id+"' ";
                    }
                    if(p.estate_id=='EA037'){ // cressingham specific
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
                                    // FINSHED THE QUERY LETS RETURN
                                    msg = '\n[--Return totals for a tax year--]\n';
                                    msg += 'Generated '+qrys.length+' queries for years:\n';
                                    msg += datemsg;
                                    msg += '\n'+invoicemsg+'\n ';
                                    msg += '\n'+workprogmsg+'\n' ;
                                    msg += '\n'+trademsg+'\n' ;
                                    sendmeback(db, res, p, msg)
                                }
                        });
                    });
                }
            });
        }
    }, function(err) {
       logme('Error retrieving cache: '+mycache.result);
    })


});

app.post('/api/estates', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    //host = request.headers.host;
    //logme('#######HOST: '+host)
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    var qry;
    p.server = server;
    p.estates = [
        { estate_id: 'ALL', estate_name: 'ALL AREAS', properties: 'ALL AREAS'},
        { estate_id: '#', estate_name: '--------------' }
    ];
    p.estates = {
        'ALL':{ estate_name: 'ALL AREAS',      properties:''},
        '#':  { estate_name: '--------------', properties:''  }
    };
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        logme('\n[--Return list of estates--]');
        logme(qry);
    }
    db.serialize(function() {
        //qry = "SELECT estate_id, estate_name \n";
        //qry += "FROM estates\n";
        //qry += "ORDER BY estate_name ASC;\n";
        var totalproperties = 0;
        qry = "SELECT P.estate_id, estate_name, \n"
        qry += "count(property_ref) as properties \n"
        qry += "FROM properties P \n"
        qry += "LEFT JOIN estates E  \n"
        qry += "ON P.estate_id=E.estate_id \n"
        qry += "WHERE P.residential='yes' \n"
        qry += "GROUP by estate_name \n"
        qry += "ORDER BY estate_name ASC;\n"
        db.each(qry, function(err, row) {
                id = row.estate_id;
                totalproperties += row.properties;
                name = row.estate_name;
                if(id == 'ENST4'){
                    name = '!NO NAME!';
                    logme(row)
                }
                p.estates[id] = {
                    estate_name:name,
                    properties:row.properties
                }
                //p.estates.push(row)
            }, function() {
                p.estates['ALL'].properties = totalproperties;
                send();
        })
    });
});

app.post('/api/streets', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    var qry;
    p.server = server;
    p.streets = [
        { id:'ALL', name: 'ALL PLACES' },
        { id:'#', name: '--------------' }
    ];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        logme('\n[--Return list of streets--]');
        logme(qry);
    }
    db.serialize(function() {
        eqry = "";
        if(p.estate_id==='' || p.estate_id===undefined || p.estate_id==='ALL'){
            eqry = "";
        }else{
            eqry = "WHERE estate_id='"+p.estate_id+"' ";
        }
        qry = "SELECT \n";
        qry += "street as id,\n";
        qry += "Street as name,\n";
        qry += "count(street) as properties\n";
        qry += "FROM properties \n";
        qry += eqry;
        qry += "GROUP BY street\n";
        qry += "ORDER BY street ASC\n";

        db.each(qry, function(err, row) {
                p.streets.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/trades', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    var qry;
    p.server = server;
    p.trades = [
        { trade_id: 'ALL', name: 'ALL TRADES' },
        { trade_id: '#', name: '--------------' }
    ];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        logme('\n[--Return list of trades--]');
        logme(qry);
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
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    p.server = server;
    p.properties = {
        'ALL': {
            address1: 'ALL STRUCTURES',
            street:'',
            structure_id:'',
            tmp_structure_add:''
        },
        '#':{
            address1: '',
            street:'--------------',
            structure_id:'',
            tmp_structure_add:''
        }
    };
    function send(){
        res.send(p);
        db.close();
        logme('\n[--Return list of propeties--]');
        logme(p.qry);
    }
    db.serialize(function() {
        if(p.street_id=='ALL'){
            sqry = "WHERE street!='"+p.street_id+"'\n";
        }else{
            sqry = "WHERE street='"+p.street_id+"'\n";
        }

        qry = "SELECT property_ref, address1, street,\n";
        qry += "structure_id, tmp_structure_add, \n";
        qry += "A.archi_id, A.name, A.image_plan, A.bedrooms, A.size_sq_meter, A.size_sq_feet, \n";
        qry += "M.view_id, M.media_id, M.view_type, M.video_frame, \n";
        qry += "ME.media_id, ME.file_name, ME.file_type \n";
        qry += "FROM properties P \n";
        qry += "LEFT JOIN mediaviews M ON M.property_id=P.property_ref \n"
        qry += "LEFT JOIN architecture A ON P.archi_id=A.archi_id \n";
        qry += "LEFT JOIN media ME ON M.media_id=ME.media_id \n";
        qry += sqry;
        qry += "AND P.estate_id='"+p.estate_id+"'\n";
        qry += "ORDER BY  CAST(address1 AS INTEGER)\n";
        p.qry = qry;

        db.each(qry, function(err, row) {
            id = row.property_ref;
            p.properties[id] = {};
            Object.keys(row).forEach(function(key) {
                p.properties[id][key] = row[key]
            });
            //p.properties.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/repairs', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }HOMES
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    p.server = server;
    p.repairs = [];
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        logme('\n[--Return list of repairs--]');
        logme(qry);
    }
    db.serialize(function() {
        var pqry = "";
        if(p.property_id=='ALL'){
            pqry = ""
        }else if(p.property_id===undefined || p.property_id===''){
            pqry = "AND PropRef IS NULL OR PropRef = '' \n"
        }else{
            pqry = "AND PropRef = '"+p.property_id+"' \n"
        }
        qry = "SELECT DISTINCT WORef as repairs_id, WorkProg, MainTrade, FinalCostInPence, DateRaised, DateInvoice, WOStatus ";
        // Hide descriptions on production server
        if (process.env.NODE_ENV === 'production') {
            qry = qry.replace("WODescription", "");
            qry +=', "--" as WODescription';
        }else{
            qry += ', WODescription'
        }
        qry += "\n"
        qry += "FROM 'workorders' \n";
        qry += "WHERE EstateCode='"+p.estate_id+"'\n";
        qry += pqry
        qry += "ORDER BY UnixDateRaised \n"
        //qry += "LIMIT 100;"
        db.each(qry, function(err, row) {
                p.repairs.push(row)
            }, function() {
                send();
        })
    })
});

app.post('/api/totalrepairs', function(req, res) {
    // { estate_id: '', street_id: '', property_id: '', repairs_id: '' }
    var db = new sqlite3.Database(dbPath);
    var p = req.body;
    p.totalrepairs = [];
    p.server = server;
    function send(){
        p.qry = qry;
        res.send(p);
        db.close();
        logme('\n[--Return total repairs--]');
        logme(qry);
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
