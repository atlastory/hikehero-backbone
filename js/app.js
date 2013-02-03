
var app = app || {};

(function($){
	
	$.extend(app,{
		$hud: $(".mainHUD"),
		$modal: $(".modal"),
	});

	// Load functions
	$(function(){

		app.appView = new app.AppView();
		app.mapView = new app.MapView();
		app.hikeList = new app.HikeList();
		app.resultView = new app.ResultView();
			
		app.router = new app.Router();
		Backbone.history.start();

	});


})(jQuery);
