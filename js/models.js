var app = app || {};

(function($){

	// Model of individual hike
	app.Hike = Backbone.Model.extend({
		defaults: {
			name: "Hike name",
			location: [],
			path: "",
			rating: 3
		},
		initialize: function(){
			if (!this.get("path")) {
				this.set({"path": this.defaults.path});
			} else {
				var path = this.get("path");
				var pathArr = path.split(",0");
				this.set({"path": pathArr});
			} 
			if (!this.get("distance"))
				this.set({"distance": 0});
			if (!this.get("grade"))
				var	g = this.get("vert")*100/(this.get("length")*5280),
					intD = Math.floor(g),
					round = intD + Math.floor((g-intD)*10)/10;
				this.set({"grade": round});
			if (!this.get("difficulty")){
				// Calculates difficulty level
				var	d = this.get("length"),
					g = this.get("vert")/(d*5280),
					v = this.get("variation"),
					s = this.get("shade"),
					diff = d*(60*g + v/10 + 1)*(2-s)/15,
					intD = Math.floor(diff),
					round = intD + Math.floor((diff-intD)*10)/10;
				this.set({"difficulty": round});
			}
		},
		updateDistance: function(){
			var	coords = this.get("location"),
				point = new google.maps.LatLng(coords[0],coords[1]),
				here = app.mapView.geoLocation,
				dist = google.maps.geometry.spherical.computeDistanceBetween(here,point),
				d = dist/1609.34, // Convert from meters to miles
				intD = Math.floor(d),
				round = intD+Math.floor((d-intD)*10)/10;
			this.set({"distance": round});
		}
	});
	
})(jQuery);