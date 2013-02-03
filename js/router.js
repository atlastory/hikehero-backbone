
var app = app || {};

(function($){
	
	app.Router = Backbone.Router.extend({
		routes: {
			"": "home",
			"f/:dist/:l1/:l2/:d1/:d2/": "change"
		},
		update: function(trigger){
			var	f 	= app.hikeList.filterDefaults, hash;
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
			$.extend(app.hikeList.filterDefaults, {
				//distance: [0,dist],
				length: [l1,l2],
				difficulty: [d1,d2]
			});
			
			//$("select",app.$ctrlDist).val(dist);
			$(".slider",app.$ctrlLength).slider("option","values",[l1,l2]);
			$("min",app.$ctrlLength).html(l1);
			$("max",app.$ctrlLength).html(l2);
			$(".slider",app.$ctrlDiff).slider("option","values",[d1,d2]);
			$("min",app.$ctrlDiff).html(d1);
			$("max",app.$ctrlDiff).html(d2);
		}
	});
	
})(jQuery);