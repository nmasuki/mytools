var mongoose =require('mongoose');

var QuantitySchema= new mongoose.Schema({
		price  :{type  :Number, required  :true},
		name  :{type  : String, required  :true},
		quantity :{ type :String, required :true },
		parent :{ ref : 'Drink', type :mongoose.Schema.Types.ObjectId }
})

module.exports = mongoose.model('Quantity', QuantitySchema);