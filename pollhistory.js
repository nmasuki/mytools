var mysql = require('mysql');
var cradle = require('cradle');
var https = require('https');
var Async = require('async');

/*
var log4js = require('log4js'); 
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file('logs/send.log'), 'msg');
var logger = log4js.getLogger('msg');
logger.debug('Starting to execute');
logger.setLevel('DEBUG');
*/

var apiAuth = 'GEOPOLL TW9iaWxlV2ViOjQ5MDA4MzQ='

console.log('setup processqueue');

var processQueeue = Async.queue(function (task, callback) {
    processPoll(task,callback)
}, 8);

console.log('setup interval');
var processRunId = setInterval(function(){
	console.log('waiting....'+ 'items left', processQueeue.length())
},3000)

processQueeue.drain = function() {
	clearInterval(processRunId);
	console.log('all items have been processed at',new Date().toISOString());
  console.log('ending connection');
  connection.end();
}

//setup mysql connection
console.log('setup mysql connection');
var connection = mysql.createConnection({
  host     : 'de-mysql-ha-1',
  user     : 'root',
  password : 'Ih8uih8U',
  database : 'geopoll'
});
 
console.log('connecting to mysql');
connection.connect();

console.log('setup couchdb connection');
//setup couchdb connection
var couchdb = new(cradle.Connection)('couchdb.geopoll.com', 443, {
      secure: true,
      retries: 3,
      retryTimeout: 30 * 1000,
      auth: { username: 'ollessellyingeducheaderf', password: '4f15762f39cf087a6fd23919f2778a9bc84deb71' }
  }).database('poll-history');;
 
connection.query('select p.id, p.pollid,pi.value as email,p.`action`  from  geopoll.PollLog p join user.PersonalInfo pi on p.userid=pi.userid and pi.name=\'EmailAddress\' where p.State=\'Pending\' limit 10', function(err, rows, fields) {
//connection.query('select p.id,p.version from geopoll.Poll p where p.ModifiedDate > DATE_SUB(utc_timestamp, INTERVAL 8 HOUR)', function(err, rows, fields) {
  if (err) {
	console.log('failed query mysql db');
  	console.log(err);
  }
  else{
    console.log('processing pollids length '+rows.length)

    if(rows.length==0){
      console.log('there are no new records to process. killing my self...');
      clearInterval(processRunId);
      connection.end();
    }
  	for (var i = 0; i < rows.length; i++) {
    		console.log('PollId is: ', rows[i].pollid);
  		  processQueeue.push({pollid: rows[i].pollid, id :rows[i].id,email:rows[i].email, action:rows[i].action}, function (err) {
  			if(err){
  				console.log(err);
  			}
		  });
  	}
  	 
  }
 
});


// process poll
function processPoll(task,doneCallback){
	console.log(task.pollid+' processing.. id:'+task.id);

  var options = {
    hostname: 'intranet-latest.geopoll.com',
    port: 443,
    path: '/api/apipoll/logdata?pollid='+task.pollid,
    method: 'GET',
    headers:{ 'Authorization': apiAuth}
  };

  (function(processtask){
    https.get(options, (res) => {
      console.log('statusCode:', res.statusCode);
      //console.log('headers:', res.headers);
      res.setEncoding();
      var store = "";
      res.on('data', (d) => {
        store += d;
      });
      res.on('end', ()=> {
          if(res.statusCode==200){
            console.log('saving cache data for taks:',processtask);
            saveResult(processtask,store,doneCallback);
          }
          else{
            doneCallback();
          }
      });

    }).on('error', (e) => {
      console.error(e);
      console.log('on error calling callback')
      doneCallback();
    });
  })(task);

}

function saveResult(task,jsonresult,doneCallback){
  console.log('length of jsonresult is',jsonresult.length);

  var jsn=JSON.parse(jsonresult);
  var polldata='test';
  if(jsn.Poll && jsn.Poll.Version){
      console.log('updating poll version',jsn.Poll.Version);


      var id = 'poll-history'+'-'+jsn.Poll.Id+'-'+jsn.Poll.Version+'-'+Guid();
      var link = 'https://couchdb.geopoll.com/poll-history/'+id
      var d = { _id:id,email:task.email, action:task.action, data:jsn,logid:task.id }

      couchdb.save(id, d, function (err, res) {
          if (err) {
            console.log(err);
            doneCallback();
              // Handle error 
          } else {
            console.log(res);
            connection.query('update geopoll.PollLog set PollVersion = ?, PollData = ? ,State = \'Processed\' where id = ? ;', [jsn.Poll.Version,link, task.id], function(err, results) {
              console.log('error',err);
              doneCallback();
            });
              // Handle success 
          }
      });


  }
  else {
		console.log('poll obj is empty. not creating hisotry obj');
		connection.query('update geopoll.PollLog set PollVersion = ?, PollData = ? ,State = \'FailedToProcess\' where id = ? ;', [0,'', task.id], function(err, results) {
		  console.log('error',err);
		  doneCallback();
		});
  }  
}

function Guid() {
      var S4 = function () {
          return Math.floor(
              Math.random() * 0x10000 /* 65536 */
          ).toString(16);
      };

      return (
          S4() + S4() + "-" +
              S4() + "-" +
                  S4() + "-" +
                      S4() + "-" +
                          S4() + S4() + S4()
      );
}
