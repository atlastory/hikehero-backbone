
(function($){
	
	var app, hikeList, geoLocation, appRouter;
	
	// Load functions
	$(function(){
		
		hikeList = new HikeList();
		app = new App();
		appRouter = new AppRouter();
		Backbone.history.start();
		
	});

/* /////////////////// 
 * ///// MODELS //////
 * /////////////////// */
	
	// Model of individual hike
	var Hike = Backbone.Model.extend({
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
				here = geoLocation,
				dist = google.maps.geometry.spherical.computeDistanceBetween(here,point),
				d = dist/1609.34, // Convert from meters to miles
				intD = Math.floor(d),
				round = intD+Math.floor((d-intD)*10)/10;
			this.set({"distance": round});
		}
	});
	
	// Collection of hikes from database
	var HikeList = Backbone.Collection.extend({
		model: Hike,
		url: "data.json",
		initialize: function(){
			_.bindAll(this, "fltr");
			this.fetch();
		},
		filterDefaults: {
			length: [0,15],
			difficulty: [0,10],
			distance: [0,100]
		},
		fltr: function(inputs){
			$.extend(this.filterDefaults, inputs);
			var defs = this.filterDefaults, matches;
			matches = this.filter(function(hike){
				var match=true, dist=hike.get("distance");
				if (dist>defs.distance[1]) match=false;
				if (dist<defs.distance[0]) match=false;
				return match;
			});
			matches = _.filter(matches, function(hike){
				var match=true, len=hike.get("length");
				if (len>defs.length[1]) match=false;
				if (len<defs.length[0]) match=false;
				return match;
			});
			matches = _.filter(matches, function(hike){
				var match=true, diff=hike.get("difficulty");
				if (diff>defs.difficulty[1]) match=false;
				if (diff<defs.difficulty[0]) match=false;
				return match;
			});
			return matches;
		}
	});
	
	// Collection of hikes to display
	var HikeResults = Backbone.Collection.extend({
		model: Hike,
		initialize: function(){
			_.bindAll(this,"sort");
		},
		sort: function(attr,order){
			var sorted = this.sortBy(function(hike){
				return hike.get(attr)*order;
			});
			this.models = sorted;
		}
	});

/* /////////////////// 
 * ////// VIEWS //////
 * /////////////////// */
	
	// View objects
	var el = {
		hud: $(".mainHUD"),
		results: $(".results"),
		filterBar: $(".filterbar .inner"),
		ctrlDist: $("#distance"),
		ctrlLength: $("#length"),
		ctrlDiff: $("#difficulty"),
		resultList: $("#resultContainer ul"),
		resultTemplate: $("#hike-result").html(),
		blnkTemplate: $("#blank-template").html(),
		map: $(".map, #mapDiv"),
		modal: $(".modal")
	};
	
	// App view
	var App = Backbone.View.extend({
		el: $(window),
		events: {
			"resize"	: "resize"
		},
		initialize: function(){
			this.resize();
			
			this.resultView = new ResultView();
			this.mapView = new MapView();
		},
		resize: function(){
			el.map.width(el.hud.width()-
				el.results.width()-
				el.results.offset().left*3-4);
			el.map.height(el.results.height());	
		}
	});
	
	// Single hike result
	var HikeView = Backbone.View.extend({
		tagName: "li",
		template: _.template(el.resultTemplate),
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
				el.resultList.find(".hike").removeClass("selected");
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
	var ResultView = Backbone.View.extend({
		el: $(".filterbar"),
		events: {
			//"click button#test"	: "path"
		},
		template: _.template(el.blnkTemplate),
		initialize: function(){
			_.bindAll(this,"render","populate","length","difficulty");
			// Add UI elements:
			var self = this;
			el.resultList.html(this.template({mode:'loading'}));
			$(".slider",el.ctrlLength).slider({
				range: true,
				min: 0,
				max: 15,
				values: hikeList.filterDefaults.length,
				slide: function(event,ui){self.length(event,ui)},
				stop: function(){appRouter.update()}
			});
			$(".slider",el.ctrlDiff).slider({
				range: true,
				min: 0,
				max: 10,
				values: hikeList.filterDefaults.difficulty,
				slide: function(event,ui){self.difficulty(event,ui)},
				stop: function(){appRouter.update()}
			});
			$("select",el.ctrlDist).change(function(){self.distance($(this).val())});
			// Create model collection & attach handlers:
			this.collection = new HikeResults();
			this.collection.on("add reset change", this.render);
			hikeList.on("reset", this.populate);
		},
		render: function(){
			// Rebuilds results DOM with current results collection
			app.mapView.clearHikes();
			el.resultList.empty();
			if (this.collection.isEmpty()){
				el.resultList.html(this.template({mode:'none'}));
			} else {
				_(this.collection.models).each(function(hike){
					var hikeView = new HikeView({model: hike});
					el.resultList.append(hikeView.render().el);
				},this);
			}
		},
		populate: function(){
			// Populates results with hikeList DB collection
			app.mapView.getLocation();
			app.mapView.drawCircle(hikeList.filterDefaults.distance[1]);
			this.collection.models = hikeList.fltr();
			this.collection.sort("distance",1);
			this.collection.trigger("change");
		},
		distance: function(val){
			var filter = hikeList.fltr({distance:[0,val]});
			app.mapView.drawCircle(val);
			$("span",el.filterBar).removeClass("sorted");
			$(".distance",el.filterBar).addClass("sorted");
			this.collection.models = filter;
			this.collection.sort("distance",1);
			this.collection.trigger("change");
			appRouter.update();
		},
		length: function(event,ui){
			var min = ui.values[0], max = ui.values[1],
				filter = hikeList.fltr({length:[min,max]});
			$("min",el.ctrlLength).html(min);
			$("max",el.ctrlLength).html(max);
			$("span",el.filterBar).removeClass("sorted");
			$(".length",el.filterBar).addClass("sorted");
			this.collection.models = filter;
			this.collection.sort("length",1);
			this.collection.trigger("change");
		},
		difficulty: function(event,ui){
			var min = ui.values[0], max = ui.values[1],
				filter = hikeList.fltr({difficulty:[min,max]});
			$("min",el.ctrlDiff).html(min);
			$("max",el.ctrlDiff).html(max);
			$("span",el.filterBar).removeClass("sorted");
			$(".difficulty",el.filterBar).addClass("sorted");
			this.collection.models = filter;
			this.collection.sort("difficulty",1);
			this.collection.trigger("change");
		}
	});

	// Map view
	var MapView = Backbone.View.extend({
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
			el.modal.modal("hide");
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
				geoLocation = latLng;
				_(hikeList.models).each(function(hike){
					hike.updateDistance();
				},hikeList);
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
				
				$(".text",el.modal).html(msg);
				el.modal.modal("show");
			}
		},
		drawCircle: function(size){
			if (this.radius) this.radius.setMap(null);
			var self = this;
			this.radius = new google.maps.Circle({
				map: self.map,
				center: geoLocation,
				radius: size*1609.34,
				fillOpacity: 0,
				strokeColor: "#46a546",
				strokeWeight: 3
			});
		}
	});


/* /////////////////// 
 * ///// ROUTERS /////
 * /////////////////// */
	
	var AppRouter = Backbone.Router.extend({
		routes: {
			"": "home",
			"f/:dist/:l1/:l2/:d1/:d2/": "change"
		},
		update: function(trigger){
			var	f 	= hikeList.filterDefaults, hash;
			if (!trigger) trigger = false;
			
			hash	= f.distance[1]+"/"
					+ f.length[0]+"/"
					+ f.length[1]+"/"
					+ f.difficulty[0]+"/"
					+ f.difficulty[1]+"/";
			
			this.navigate("f/"+hash,{replace:true, trigger:trigger});
		},
		home: function(){
			
		},
		change: function(dist,l1,l2,d1,d2){
			// Distance doesn't work yet because of map geoloc delay
			$.extend(hikeList.filterDefaults, {
				//distance: [0,dist],
				length: [l1,l2],
				difficulty: [d1,d2]
			});
			
			//$("select",el.ctrlDist).val(dist);
			$(".slider",el.ctrlLength).slider("option","values",[l1,l2]);
			$("min",el.ctrlLength).html(l1);
			$("max",el.ctrlLength).html(l2);
			$(".slider",el.ctrlDiff).slider("option","values",[d1,d2]);
			$("min",el.ctrlDiff).html(d1);
			$("max",el.ctrlDiff).html(d2);
		}
	});
	
})(jQuery);

