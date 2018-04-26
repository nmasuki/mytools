/**
 * Created by nmasuki on 11/1/2017.
 */
var money = require('./money');

var mpesa = new money.Mpesa();
mpesa.paybill("174379", "254720805835", 10)
    .then(function(data){
        if(data && data.CheckoutRequestID){
            setTimeout(function(){
                mpesa.confirmPaybill("174379", data.CheckoutRequestID);
            }, 3000);
        }
    });

