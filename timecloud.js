/* 
 * jQuery UI Timecloud
 *
 * Copyright (c) 2008 Stefan Marsiske
 * Dual licensed under the MIT and GPLv3 licenses.
 * 
 * http://github.com/stef/timecloud/
 *
 * Depends:
 *	jquery: ui.core.js, ui.draggable.js, ui.slider.js, jquery.sparkline
 *	external: tagcloud.js
 *
 *	because sparkline is canvas-based this will only work in firefox3+.
 */

(function($) {
$.widget("ui.timecloud", {
	ui: function(e) {
		return {
			options: this.options,
		};
	},

   // loads a sparse list of timed tagclouds, fills empty days with empty
   // taglcouds, then builds the appropriate dom and finally draws the first frame
   // afterwards it starts the animation if necessary
   sparkline: [],
   tags: [],
   overview: [],
   frames: [],
   init: function() {
      var nextdate=this.strToDate(this.options.timecloud[0][0]);
      for (id in this.options.timecloud) {
         // data received can be sparse, we fill any missing timesegments with
         // empty data 
         var curdate=this.strToDate(this.options.timecloud[id][0]);
         while(nextdate && nextdate<curdate) {
            this.frames.push([this.dateToStr(nextdate),[]]);
            nextdate=this.addDay(nextdate,1);
         }
         nextdate=this.addDay(nextdate,1);
         // push non-sparse data
         this.frames.push([this.options.timecloud[id][0],this.options.timecloud[id][1]]);

         // calculate overview counts
         curDay=this.options.timecloud[id][1];
         var tag;
         var cnt=0;
         for (tag in curDay) {
            cnt+=parseInt(curDay[tag][1]);
         }
         this.overview.push({'date': this.options.timecloud[id][0], 'count': cnt});
      }
      // calculate window position if options.start=-1
      if(0>this.options.start) {
         this.options.start=this.frames.length-this.options.winSize+(this.options.start+1);
         // no sense in playing forward 
         this.options.playBack=true;
      }

      // draw first frame
      this.buildWidget();
      this.drawTimecloud();
      this.play();
   },

   play: function() {
      var self=this;
      if(! this.options.play) return;
      if(this.options.playBack) { 
         setTimeout(function() { self.prevFrame.call(self); }, this.options.timeout); 
      } else {
         setTimeout(function() { self.nextFrame.call(self); }, this.options.timeout); 
      }
   },

   // internal, used to build the DOM
   buildWidget: function() {
		var thisObj = this;
		this.element.addClass("timecloud");
      // you can pan/zoom the timecloud using a window on the overview
      // sparkline
      this.window=$("<div/>").addClass("ui-slider");
      $("<span/>").addClass("ui-slider-handle")
         .addClass("left")
         .appendTo(this.window);
      $("<span/>").addClass("ui-slider-handle")
         .addClass("right")
         .appendTo(this.window);

      var timegraph=this.buildSparkline();
      timegraph.append(this.window);

      this.overviewElem=$("<div/>")
            .addClass("overview")
            .bind('wheel', function(e) { thisObj.resizeWindow(e);}) 
            .append(timegraph);
      this.element.append(this.overviewElem);
      
      // let's draw the overview sparkline
      this.drawSparkline(this.overview,this.overviewElem);

      // set up the window over the main sparkline
      this.window.slider({
         handles: [{start: 0 }, {start:this.options.winSize }],
         min: 0,
         max: this.frames.length,
         range: true,
         change: function (e,ui) {
            thisObj.options.start=thisObj.window.slider('value', 0);
            thisObj.options.winSize=Math.round(ui.range);
            thisObj.drawTimecloud(); } })
      // we also add support for dragging the window
      .find(".ui-slider-range").draggable({
         axis: 'x',
         containment: '.ui-slider',
         helper: 'clone',
         stop: function (e, ui) {
            thisObj.options.start=Math.round((thisObj.frames.length*ui.position.left)/thisObj.timecloudElem.width())
            thisObj.drawTimecloud(); } });
      
      this.timecloudElem=$("<div/>").addClass("details");

      // we setup a timeline graph of only the currently shown tags 
      this.timecloudElem.append(this.buildSparkline());
      // we want the mousewheel events to scroll the window
      this.timecloudElem.bind('wheel', function(e) { 
            if(e.delta<0) {
               thisObj.nextFrame();
            } else {
               thisObj.prevFrame();
            }}) 

      // building the animation controls
      // setup controls for time window size
      var controls=$("<div />")
         .addClass("control-container").appendTo(this.timecloudElem);
      this.back=$('<span>&lt;</span>')
         .addClass("text-control")
         .click(function () { 
               thisObj.options.playBack=true;
               thisObj.forward.removeClass("selected");
               $(this).addClass("selected");
               })
         .appendTo(controls);
      this.playElem=$('<span>Play</span>')
         .addClass("text-control")
         .click(function () { $(this).text(thisObj.togglePlay()); })
         .appendTo(controls);
      // stepwise forward
      this.forward=$('<span>&gt;</span>')
         .addClass("text-control")
         .click(function () { 
               thisObj.options.playBack=false;
               thisObj.back.removeClass("selected");
               $(this).addClass("selected");
               })
         .appendTo(controls);
      if(this.options.playBack) {
         this.back.addClass("selected");
      } else {
         this.forward.addClass("selected");
      }

      this.speed=$("<div/>").addClass("ui-speed");
      $("<span/>").addClass("ui-speed-handle")
         .appendTo(this.speed);
      $("<span>normal...fast</span>").addClass("ui-speed-label")
         .appendTo(this.speed);
      // set up the window over the main sparkline
      this.speed.slider({
         handle: '.ui-speed-handle',
         min: 0,
         steps: 2,
         max: 2,
         change: function (e,ui) {
            if(ui.value==0) {
               thisObj.options.steps=1;
            } else if(ui.value==1) {
               thisObj.options.steps=Math.round(thisObj.options.winSize*0.1);
            } else if(ui.value==2) {
               thisObj.options.steps=Math.round(thisObj.options.winSize*0.2);
            }
            } });
      this.speed.appendTo(controls);

      // create container for tagcloud
      $("<div/>").addClass("tagcloud")
         .appendTo(this.timecloudElem);
      this.element.append(this.timecloudElem);
   },

   // internal: used in building the UI
   buildSparkline: function(e) {
      // setup the first sparkline for a general overview
      var timegraph=$("<div/>").addClass("timegraph");
      var labels=$("<div/>").addClass("sparkline-container");
      var tmp=$("<div/>").addClass("sparkline-label");
      $("<div/>").addClass("max")
         .appendTo(tmp);
      $("<div/>").addClass("min")
         .appendTo(tmp);
      tmp.appendTo(labels);
      $("<div/>").addClass("sparkline")
         .appendTo(labels);
      labels.appendTo(timegraph);

      var dates=$("<div/>").addClass("dates");
      // end must appear first for some reason otherwise it breaks the
      // dateline... could spans be a solution?
      $("<span/>").addClass("enddate").
         appendTo(dates);
      $("<span/>").addClass("startdate").
         appendTo(dates);

      timegraph.append(dates);
      return timegraph;
   },

   // internal: callback used on mouse events
   resizeWindow: function(e) { 
      var delta=(Math.round(this.frames.length/100)*e.delta*-1);
      if(this.options.winSize+delta>0 && this.options.start-Math.round(delta/2)>=0 && 
            (this.options.start+this.options.winSize+Math.round(delta/2))<=this.frames.length) {
         this.options.winSize=this.options.winSize+delta;
         this.options.start=this.options.start-Math.round(delta/2);
      }
      this.drawTimecloud();
   }, 

   updateWindow: function() {
     var left=parseInt(this.options.start);
     if(left>this.window.slider("value",0)) {
         this.window.slider("moveTo", left+this.options.winSize-1, 1, true);
         this.window.slider("moveTo", left, 0, true);
     } else {
         this.window.slider("moveTo", left, 0, true);
         this.window.slider("moveTo", left+this.options.winSize-1, 1, true);
     }
   },

   // internal: used to draw a fresh frame
   drawTimecloud: function() {
      this.initCache();
      this.redrawTimecloud();
   },

   // internal: calculates a tagcloud from window_size elems in frame
   // it updates the sparkline cache as well
   initCache: function () {
      var i=this.options.start;
      this.tags=[];
      this.sparkline=[];
      // iterate over winSize
      while(i<this.options.start+this.options.winSize) {
         // fetch current day
         if(i>this.frames.length-1) break;
         var curday=this.frames[i];
         var currentDate=curday[0];
         //iterate over tags in day
         var item;
         var cnt=0;
         for(item in curday[1]) {
            var tag=curday[1][item][0];
            var count=parseInt(curday[1][item][1]);
            if(this.tags[tag]) {
               // add count
               this.tags[tag].count+=count;
            } else {
               // add tag
               this.tags[tag]=[];
               this.tags[tag].count=count;
            }
            this.tags[tag].currentDate=currentDate;
            cnt+=count;
         }
         this.sparkline.push({'date': currentDate, 'count': cnt});
         i+=1;
      }
   },

   // internal: this draws a tagcloud and sparkline from the cache
   redrawTimecloud: function() {
      this.drawTagcloud(this.listToDict(this.tags),this.timecloudElem);
      // only redraw the overview, if the window got resized
      if(this.vsize!=this.timecloudElem.width()) {
         this.drawSparkline(this.overview,this.overviewElem);
         this.vsize=this.timecloudElem.width();
      }
      this.drawSparkline(this.sparkline,this.timecloudElem);
      this.updateWindow();
   },

   // internal: used to all draw sparklines, we need to expand the possibly
   // sparse list of data and loose btw the dates in this process, in the end
   // we also display the start and end date on the left/right below the
   // sparkline
   drawSparkline: function (data,target) {
      // data might be sparse, insert zeroes into list
      var startdate=this.strToDate(data[0]['date']);
      var enddate=this.strToDate(data[data.length-1]['date']);
      var nextdate=startdate;
      var lst=[];
      var min=Infinity;
      var max=-Infinity;
      for (id in data) {
         var curdate=this.strToDate(data[id]['date']);
         while(nextdate<curdate) {
            lst.push(0);
            nextdate=this.addDay(nextdate,1);
         }
         var val=parseInt(data[id]['count']);
         if(val>max) max=val;
         if(val<min) min=val;
         lst.push(val);
         nextdate=this.addDay(nextdate,1);
      }
      $('.min',target).text(min);
      $('.max',target).text(max);
      $('.startdate',target).text(this.dateToStr(startdate));
      $('.enddate',target).text(this.dateToStr(enddate));
      var tmp=this.options.sparklineStyle;
      tmp.width=$('.sparkline',target).width();
      $('.sparkline',target).sparkline(lst, tmp);
   },

   // internal: this is used to draw a tagcloud, we invoke the services of tagcloud.js
   drawTagcloud: function (data,target) {
      var tc;
      var url='';
      tc=TagCloud.create();
      for (id in data) {
         var timestamp;
         if(data[id][2]) {
            timestamp=this.strToDate(data[id][2]);
         }
         if(this.options.urlprefix || this.options.urlpostfix) {
            url=this.options.urlprefix+data[id][0]+this.options.urlpostfix; //name
         }
         if(parseInt(data[id][1]) ) {
               // name
            tc.add(data[id][0],
               // count
               parseInt(data[id][1]),
               url,
               timestamp); // epoch
         }
      }
      tc.loadEffector('CountSize').base(24).range(12);
      tc.loadEffector('DateTimeColor');
      tc.runEffectors();
      $(".tagcloud", target).empty().append(tc.toElement());
   },

   // internal: used as a callback for the play button
   togglePlay: function() {
      if(this.options.play) { this.options.play=false; return("Play"); }
      else { this.options.play=true; this.play(); return("Pause");}
   },

   // internal: updates the cache advancing the window by self steps. to save
   // time we substract only the removed days tags and add the added days tags
   // to the cache. afterwards we update the sliding window widget, redraw the
   // timecloud and time the next frame
   nextFrame: function () { 
      if(this.options.start+this.options.winSize+this.options.steps<=this.frames.length) {
         var self=this;
         // substract $steps frames from $tags and $sparkline
         var exclude=this.frames.slice(this.options.start, this.options.start+this.options.steps);
         this.delFromCache(exclude);
         this.sparkline.splice(0,this.options.steps);

         // add $steps framse to tags and sparkline
         var include=this.frames.slice(this.options.start+this.options.winSize, this.options.start+this.options.winSize+this.options.steps);
         this.sparkline=this.sparkline.concat(this.addToCache(include));
         
         // advance $start by $steps
         this.options.start+=this.options.steps;

         // draw timecloud (current frame)
         this.redrawTimecloud();
         this.play();
      } else {
         this.options.play=false;
         this.playElem.text("Play"); 
      }
   },

   prevFrame: function () { 
      if(this.options.start-this.options.steps>=0) {
         var self=this;
         // substract $steps frames from $tags and $sparkline
         var exclude=this.frames.slice(this.options.start+this.options.winSize-this.options.steps, this.options.start+this.options.winSize);
         this.delFromCache(exclude);
         this.sparkline.splice(this.sparkline.length-this.options.steps,this.options.steps);

         // add $steps framse to tags and sparkline
         var include=this.frames.slice(this.options.start-this.options.steps, this.options.start);
         this.sparkline=this.addToCache(include).concat(this.sparkline);
         
         // advance $start by $steps
         this.options.start-=this.options.steps;

         // draw timecloud (current frame)
         this.redrawTimecloud();
         this.play();
      } else {
         this.options.play=false;
         this.playElem.text("Play"); 
      }
   },

   addToCache: function(frames) {
      var thisObj=this;
      var sparkline=[];
      // we need to add each days tags to the cache
      frames.forEach(function(day) {
         var today=day[0];
         var cnt=0;
         day[1].forEach(function(tag) {
            if(thisObj.tags[tag[0]]) {
                  thisObj.tags[tag[0]].count+=parseInt(tag[1]);
            } else {
               thisObj.tags[tag[0]]=new Array();
               thisObj.tags[tag[0]].count=parseInt(tag[1]);
            }
            cnt+=parseInt(tag[1]);
            thisObj.tags[tag[0]].currentDate=today;
         });
         sparkline.push({'date': today, 'count': cnt});
      });
      return sparkline;
   },

   delFromCache: function(frames) {
      var thisObj=this;
      frames.forEach(function(day) {
         day[1].forEach(function(tag) {
            thisObj.tags[tag[0]].count-=parseInt(tag[1]);
            if(thisObj.tags[tag[0]].count<=0) {
               delete thisObj.tags[tag[0]];
            }
         });
      });
   },


   // internal: used to convert the cache to the tagcloud.js format
   listToDict: function (lst) {
      var dict=[];
      // convert tags into list for drawTagcloud
      for ( tag in lst) {
         dict.push([tag, lst[tag].count, lst[tag].currentDate]);
      }
      return dict;
   },

   // internal: helper function to cope with dates
   dateToStr: function (dat) {
      var d  = dat.getDate();
      var day = (d < 10) ? '0' + d : d;
      var m = dat.getMonth() + 1;
      var month = (m < 10) ? '0' + m : m;
      var yy = dat.getYear();
      var year = (yy < 1000) ? yy + 1900 : yy;
      return(year + "-" + month + "-" + day);
   },

   // internal: helper function to cope with dates
   strToDate: function (str) {
      var frgs=str.split("-");
      return(new Date(frgs[0],frgs[1]-1,frgs[2]));
   },

   // internal: helper function to cope with dates
   addDay: function (d,n) {
      var oneday=24*60*60*1000;
      return new Date(d.getTime() + n*oneday); },
 });
$.ui.timecloud.getter = "start winSize steps timeout play graphStyle";
$.ui.timecloud.defaults = {
   timecloud: [], // the raw(sparse) timecloud data
   start: 0, // first frame to show, negative values start at the end-winSize
   winSize: 30,
   steps: 1, // animation should advance this many days / frame
   timeout: 200, // delay between frames
   playBack: false,  // forward
   play: false,  // start playing?
   sparklineStyle: { type:'line', lineColor:'Navy', height:'30px', chartRangeMin: '0' },
   urlprefix: '', // tagcloud links will be pointing here
   urlpostfix: '' // tagcloud links get this postfix
 };
})(jQuery);
