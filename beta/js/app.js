
(function($){
	
	// Load functions
	$(function(){
		hudResize();
		map.init();
		assignCallbacks();
	});

/* ////// VIEWS ////// */

	// View objects
	var el = {
		hud: $(".mainHUD"),
		results: $(".results"),
		map: $(".map, #mapDiv"),
		mapEl: $("#mapDiv").get(0)
	};
	
	// View events
	function assignCallbacks(){
		$(window).resize(hudResize);
	}
	
/* ////// CONTROLLERS ////// */
	
	// App resize
	function hudResize(){
		el.map.width(el.hud.width()-
			el.results.width()-
			el.results.offset().left*3-4);
		el.map.height(el.results.height());	
	}
	
	// Map functions
	var map = {
		init: function(){
			this.obj = new google.maps.Map(el.mapEl, {
				center: new google.maps.LatLng(40.66814,-111.247559),
	            zoom: 9,
	            minZoom: 2,
	            mapTypeId: google.maps.MapTypeId.TERRAIN,
	            panControl: false,
	            scaleControl: false,
	            streetViewControl: false,
	            zoomControlOptions: {style: google.maps.ZoomControlStyle.SMALL},
	            mapTypeControl: true,
			    mapTypeControlOptions: {
			    	style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			    	mapTypeIds: [google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.HYBRID]},
			    overviewMapControl: true
			});
		}
	};
	
})(jQuery);
