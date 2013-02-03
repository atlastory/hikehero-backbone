
var app = app || {};

(function($){
	
	$.extend(app,{
		$filterBar: $(".filterbar .inner"),
		$ctrlDist: $("#distance"),
		$ctrlLength: $("#length"),
		$ctrlDiff: $("#difficulty"),
		$results: $(".results"),
		$resultList: $("#resultContainer ul"),
		$resultTemplate: $("#hike-result").html(),
		$blnkTemplate: $("#blank-template").html(),
		$map: $(".map, #mapDiv")
	});

	// App view
	app.AppView = Backbone.View.extend({
		el: $(window),
		events: {
			"resize"	: "resize"
		},
		initialize: function(){
			this.resize();
		},
		resize: function(){
			app.$map.width(
				app.$hud.width() -
				app.$results.width() -
				app.$results.offset().left * 3 - 4);
			app.$map.height(app.$results.height());
		}
	});

	// Single hike result
	app.HikeView = Backbone.View.extend({
		tagName: "li",
		template: _.template(app.$resultTemplate),
		events: {
			"click .hike": "chooseHike",
			"click .close": "unrender"
		},
		initialize: function(){
			_.bindAll(this, "render", "chooseHike", "unrender", "remove");
			this.model.bind("change", this.render);
			this.model.bind("destroy", this.unrender)
		},
		render: function(){
			$(this.el).html(this.template(this.model.toJSON()));
			return this;
		},
		chooseHike: function(){
			var div = $(".hike",this.el);
			if (div.hasClass("selected")){
				div.removeClass("selected");
				app.mapView.clearHikes();
				// [remove from "detail" section]
			} else {
				app.$resultList.find(".hike").removeClass("selected");
				div.addClass("selected");
				app.mapView.showHike(this.model.get("path"),this.model.get("location"));
				// [push data to "detail" page section]
			}
		},
		unrender: function(){
			$(this.el).remove();
			app.mapView.clearHikes();
		},
		remove: function(){
			this.model.destroy();
		}
	});

	// Search filter & results
	app.ResultView = Backbone.View.extend({
		el: $(".filterbar"),
		events: {
			//"click button#test"	: "path"
		},
		template: _.template(app.$blnkTemplate),
		initialize: function(){
			_.bindAll(this,"render","populate","length","difficulty");
			// Add UI elements:
			var self = this;
			app.$resultList.html(this.template({mode:'loading'}));
			$(".slider",app.$ctrlLength).slider({
				range: true,
				min: 0,
				max: 15,
				values: app.hikeList.filterDefaults.length,
				slide: function(event,ui){self.length(event,ui)},
				stop: function(){app.router.update()}
			});
			$(".slider",app.$ctrlDiff).slider({
				range: true,
				min: 0,
				max: 10,
				values: app.hikeList.filterDefaults.difficulty,
				slide: function(event,ui){self.difficulty(event,ui)},
				stop: function(){app.router.update()}
			});
			$("select",app.$ctrlDist).change(function(){self.distance($(this).val())});
			
			// attach handlers:
			app.hikeList.on("reset change", this.render);
			app.hikeList.on("reset", this.populate);
		},
		render: function(){
			// Rebuilds results DOM with current results collection
			app.mapView.clearHikes();
			app.$resultList.empty();
			if (_.isEmpty(app.hikeList.fltr())){
				app.$resultList.html(this.template({mode:'none'}));
			} else {
				_(app.hikeList.fltr()).each(function(hike){
					var hikeView = new app.HikeView({model: hike});
					app.$resultList.append(hikeView.render().el);
				},this);
			}
		},
		populate: function(){
			// Populates results with app.hikeList DB collection
			app.mapView.getLocation();
			app.mapView.drawCircle(app.hikeList.filterDefaults.distance[1]);
			app.hikeList.sortList("distance");
		},
		distance: function(val){
			app.hikeList.fltr({distance:[0,val]});
			app.mapView.drawCircle(val);
			$("span",app.$filterBar).removeClass("sorted");
			$(".distance",app.$filterBar).addClass("sorted");
			app.hikeList.sortList("distance");
			app.router.update();
		},
		length: function(event,ui){
			var min = ui.values[0], max = ui.values[1];
			app.hikeList.fltr({length:[min,max]});
			$("min",app.$ctrlLength).html(min);
			$("max",app.$ctrlLength).html(max);
			$("span",app.$filterBar).removeClass("sorted");
			$(".length",app.$filterBar).addClass("sorted");
			app.hikeList.sortList("length");
		},
		difficulty: function(event,ui){
			var min = ui.values[0], max = ui.values[1];
			app.hikeList.fltr({difficulty:[min,max]});
			$("min",app.$ctrlDiff).html(min);
			$("max",app.$ctrlDiff).html(max);
			$("span",app.$filterBar).removeClass("sorted");
			$(".difficulty",app.$filterBar).addClass("sorted");
			app.hikeList.sortList("difficulty");
		}
	});

	// Map view
	app.MapView = Backbone.View.extend({
		el: $(".map #mapDiv"),
		initialize: function(){
			_.bindAll(this,"render","showHike","clearHikes");
			this.render();
		},
		render: function(){
			this.map = new google.maps.Map(this.el, {
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
			});
			this.pathObjects = [];
			app.$modal.modal("hide");
			this.geoLocate = false;
		},
		showHike: function(pathArr,loc){
			this.clearHikes();
			if (pathArr=="") return;
			var pointArr = [];
			for (var i in pathArr){
				var	latlng = pathArr[i].split(","),
					lng = parseFloat(latlng[0]),
					lat = parseFloat(latlng[1]);
				if (!isNaN(lat) && !isNaN(lng))
					pointArr.push(new google.maps.LatLng(lat,lng));
			}
			var path = new google.maps.Polyline({
				path: pointArr,
				strokeOpacity: 1.0,
				strokeWeight: 3,
				strokeColor: "#f89406"
			});
			this.pathObjects.push(path);
			this.pathObjects[0].setMap(this.map);
			this.map.panTo(new google.maps.LatLng(loc[0],loc[1]));
			if (this.map.getZoom()<12) this.map.setZoom(12);
		},
		clearHikes: function(){
			for (var i in this.pathObjects){
				this.pathObjects[i].setMap(null);
			}
			this.pathObjects = [];
		},
		getLocation: function(){
			if (navigator.geolocation)
				navigator.geolocation.getCurrentPosition(pSuccess,pError);
			else pError(-1);

			var self = this;
			function pSuccess(pos){
				var	c = pos.coords || pos.coordinate || pos,
					latLng = new google.maps.LatLng(c.latitude,c.longitude),
					marker = new google.maps.Marker({
						map: self.map,
						position: latLng,
						title: "Your current location"
					});
				self.geoLocation = latLng;
				_(app.hikeList.models).each(function(hike){
					hike.updateDistance();
				},app.hikeList);
			}
			function pError(err){
				var msg;
				switch(err.code){
					case err.UNKNOWN_ERROR:
						msg = "Unable to find your location.";
						break;
					case err.PERMISSION_DENINED:
						msg = "Permission denied in finding your location.";
						break;
					case err.POSITION_UNAVAILABLE:
						msg = "Your location is currently unknown.";
						break;
					case err.BREAK:
						msg = "Attempt to find location took too long.";
						break;
					default:
						msg = "Location detection not supported in browser.";
				}

				$(".text",app.$modal).html(msg);
				app.$modal.modal("show");
			}
		},
		drawCircle: function(size){
			if (this.radius) this.radius.setMap(null);
			var self = this;
			this.radius = new google.maps.Circle({
				map: self.map,
				center: self.geoLocation,
				radius: size*1609.34,
				fillOpacity: 0,
				strokeColor: "#46a546",
				strokeWeight: 3
			});
		}
	});

})(jQuery);