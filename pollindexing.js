var mysql = require('mysql');
var cradle = require('cradle');
var https = require('https');
var Async = require('async');
console.log('setup processqueue');

var processQueeue = Async.queue(function (task, callback) {
    processPoll(task,callback)
}, 8);

var processRunId = setInterval(function(){
	console.log('waiting....'+ 'items left',processQueeue.length())
},3000)

processQueeue.drain = function() {
	clearInterval(processRunId);
	console.log('all items have been processed at',new Date().toISOString());
  console.log('ending connection');
  connection.end();
}

var connection = mysql.createConnection({
  host     : 'de-mysql-ha-1',
  user     : 'root',
  password : 'Ih8uih8U',
  database : 'geopoll'
});
 
connection.connect();
 
connection.query('select distinct p.id,p.version from geopoll.Poll p   left join  geopoll.PollCache pc on p.id=pc.pollid and p.version = pc.version inner join geopoll.PollQuestionInstance pqi on p.id=pqi.pollid and pqi.orderby=1  where pc.id is null and  p.deleted=0 and pollmethodtype in (\'App\',\'MobileWeb\') order by p.id desc;', function(err, rows, fields) {
//connection.query('select p.id,p.version from geopoll.Poll p where p.ModifiedDate > DATE_SUB(utc_timestamp, INTERVAL 8 HOUR)', function(err, rows, fields) {
  if (err) {
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
    		console.log('PollId is: ', rows[i].id);
  		  processQueeue.push({pollid: rows[i].id,version:rows[i].version}, function (err) {
  			if(err){
  				console.log(err);
  			}
		  });
  	}
  	 
  }
 
});


// process poll
function processPoll(task,doneCallback){
	console.log(task.pollid+' processing.. version:'+task.version);

  var options = {
    hostname: 'api-mobile.geopoll.com',
    port: 443,
    path: '/api/geopoll/polls?pollIds='+task.pollid,
    method: 'GET',
    headers:{ 'Authorization':'MOBILE FEB4DF79C20A90806F3C3C6E974B7D05529CE7778CE730ECCC5765B8EFF1B467'}
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
  if(jsonresult.length<7900000){
    if(jsonresult.indexOf('"Questions"')>0){
      connection.query('call geopoll.StorePollCache(?,?,?);', [task.pollid, task.version, jsonresult], function(err, results) {
        console.log('error',err);
        doneCallback();
      });
    }
    else{
      console.log('poll is missing questions',task);
      doneCallback();
    }
  }
  else{
    console.log('did not save task.pollid '+ task.pollid+' json too large length:'+jsonresult.length);
    doneCallback();
  }
}
