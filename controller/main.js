var Main = module.exports = function(req, res){
	res.render('main');
};

Main.user = function(req, res){
	res.send('user');
};