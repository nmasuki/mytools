var mongoose = require('mongoose');

var regexSchema= new mongoose.Schema({
	format: {type: String, required  :true},
	formatType: {type: String, default: 'international'},

	numbers: { type : Array , "default" : [] },
	carriers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Carrier'
	}],
	
	modifiedDate: {type: Date},

	
	occurences : {type  :Number, default: 0},
});

var NumberRegex = mongoose.model('NumberRegex', regexSchema);

module.exports = NumberRegex;