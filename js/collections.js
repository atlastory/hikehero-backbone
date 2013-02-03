
var app = app || {};

(function($){

	// Collection of hikes
	app.HikeList = Backbone.Collection.extend({
		model: app.Hike,
		url: "data.json",
		
		initialize: function(){
			this.on("all", this.render, this);
			this.fetch();
		},
		
		render: function(){
			this.sort({silent:true});
		},
		
		filterDefaults: {
			length: [0,15],
			difficulty: [0,10],
			distance: [0,100]
		},

		fltr: function(inputs){
			var inputs = inputs || {};
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
		},
		
		sortDefaults: {
			attribute: "difficulty",
			order: 1
		},
		
		comparator: function(hike){
			return hike.get(this.sortDefaults.attribute) * 
			       this.sortDefaults.order;
		},
		
		sortList: function(attr,order){
			var order = order || 1;
			this.sortDefaults = {
				attribute: attr,
				order: order
			};
			this.trigger("change");
		}	

	});
	

})(jQuery);