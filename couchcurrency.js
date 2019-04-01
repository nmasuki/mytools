 
var sql = require('mssql');
var cradle = require('cradle');
var https = require('https');
 
var connection = new(cradle.Connection)('https://couchdb.geopoll.com', 443, {
	auth: { username: 'bormtelterstactfuldellyi', password: '0ecefcaa773813e7bc9976ebceec815e47feab0d' }
});

var db = connection.database('currency');

console.log('starting');
 
https.get('https://openexchangerates.org/api/latest.json?app_id=05f9dda9d5734057928b02a25df0ece4',function(res){
	console.log('statusCode: ', res.statusCode);
	console.log('headers: ', res.headers);
	 var chunks = "";
	res.on('data', function (d) {
		//updateCurrency(d);
		chunks += d;
	});

	res.on('end', ()=> {
		if(res.statusCode==200){
			//console.log(chunks)
			updateCurrency(chunks);
		}
		else{
			console.log(res)
		}
	});
	
});
 
function updateCurrency(data) {
	console.log('updating currency');

	var ratesData = JSON.parse(data);
	console.log(ratesData);
	
	var ratesDataCount = Object.keys(ratesData.rates).length;
	var excCount=0;
	console.log('getting couch db currency latest');
	db.get('latest', function(err, doc) {
		doc.timestamp = ratesData.timestamp;
		doc.rates = ratesData.rates;
		doc.license = ratesData.license;
		doc.disclaimer=  ratesData.disclaimer;
		console.log('saving doc');
		db.save(doc, function (err, res) {
		  console.log(err);
		  console.log(res);
		});
		
	});
	
	sql.connect("mssql://sa:Ih8uih8U@de-sql-1/Users").then(function(){

		var ps = new sql.PreparedStatement();
		ps.input('USDConversionRate', sql.Float);
		ps.input('code', sql.VarChar(10));
		ps.prepare('update users.dbo.Currency set USDConversionRate = @USDConversionRate where [Code] = @code ', function(err) {
			console.log(err);
			for(var propertyName in ratesData.rates) {
				console.log(propertyName+':'+ratesData.rates[propertyName]);
				ps.execute({USDConversionRate: ratesData.rates[propertyName],code:propertyName}, function(err) {
					excCount++;
					if(err)
						console.log(err);
					console.log('call count:',excCount,'ratescount:',ratesDataCount)
					if(excCount==ratesDataCount){
						sql.close();
					}
				});
			}
			console.log('unpreparing');
			ps.unprepare(function(err) {
				if(err)
					console.log(err);
				
			});
		});
			
		
	}).catch(function(err){
		console.log(err);
	});
	

	
}
 
 
