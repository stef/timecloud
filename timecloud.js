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

      // draw first frame
      this.buildWidget();
      this.drawTimecloud();
      if(this.options.play) { 
         setTimeout(function() { self.nextFrame.call(self); }, this.options.timeout); 
      }
   },

   // internal, used to build the DOM
   buildWidget: function() {
		var thisObj = this;
		this.element.addClass("timecloud");
      // setup the first sparkline for a general overview
      var timegraph=$("<div/>").addClass("timegraph")
      var sparkline=$("<div/>").addClass("sparkline");
      timegraph.append(sparkline);
      var dates=$("<div/>").addClass("dates");
      // end must appear first for some reason otherwise it breaks the
      // dateline... could spans be a solution?
      $("<div/>").addClass("enddate").
         appendTo(dates);
      $("<div/>").addClass("startdate").
         appendTo(dates);
      timegraph.append(dates);

      // you can pan/zoom the timecloud using a window on the overview
      // sparkline
      this.window=$("<div/>").addClass("ui-slider");
      $("<div/>").addClass("ui-slider-handle")
         .addClass("left")
         .appendTo(this.window);
      $("<div/>").addClass("ui-slider-handle")
         .addClass("right")
         .appendTo(this.window);
      timegraph.append(this.window);
      var overview=$("<div/>")
            .addClass("overview").
            append(timegraph);
      this.element.append(overview);
      
      // let's draw the overview sparkline
      this.drawSparkline(this.overview,overview);

      this.window.slider({
         handles: [{start: 0 }, {start:this.options.winSize }],
         min: 0,
         max: this.frames.length,
         range: true,
         change: function (e,ui) {
            thisObj.options.start=thisObj.window.slider('value', 0);
            thisObj.options.winSize=Math.round(ui.range);
            thisObj.drawTimecloud(); } })
      .bind('wheel', function(e) { 
            if(e.delta<0) {
               thisObj.nextFrame();
            } else {
               // TODO thisObj.prevFram();
            }}) 
      .find(".ui-slider-range").draggable({
         axis: 'x',
         containment: '.ui-slider',
         helper: 'clone',
         stop: function (e, ui) {
            thisObj.options.start=Math.round((thisObj.frames.length*ui.position.left)/800)
            thisObj.window.slider("moveTo", thisObj.options.start+thisObj.options.winSize-1, 1, true);
            thisObj.window.slider("moveTo", thisObj.options.start, 0, true);
            thisObj.drawTimecloud(); } });
      // we also want to see a timeline graph of only the currently shown tags 
      timegraph=$("<div/>").addClass("timegraph");
      sparkline=$("<div/>").addClass("sparkline")
         .bind('wheel', function(e) { thisObj.resizeWindow(e);}); 
      timegraph.append(sparkline);
      dates=$("<div/>").addClass("dates");
      // enddate again before startdate, otherwise the layout breaks... why?
      $("<div/>").addClass("enddate")
         .appendTo(dates);
      $("<div/>").addClass("startdate")
         .appendTo(dates);
      timegraph.append(dates);
      // lets 
      this.timecloudElem=$("<div/>").addClass("details");
      this.timecloudElem.append(timegraph);
      $('<input type="submit" />')
         .attr( 'name', 'pause' )
         .val( '>' )
         .click(function () { $(this).val(thisObj.togglePlay()); })
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', 'step' )
         .val( '+' )
         .click(function () { thisObj.nextFrame(); })
         .appendTo(this.timecloudElem);

      this.timecloudElem.append(" | ");
      $('<input type="submit" />')
         .attr( 'name', '7d' )
         .val( '7d' )
         .click(function () { 
               thisObj.options.winSize=7;
               thisObj.window.slider("moveTo", thisObj.options.start+thisObj.options.winSize-1, 1, true);
               thisObj.window.slider("moveTo", thisObj.options.start, 0, true);
               thisObj.drawTimecloud();
               return false;})
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', '30d' )
         .val( '30d' )
         .click(function () { 
               thisObj.options.winSize=30;
               thisObj.window.slider("moveTo", thisObj.options.start+thisObj.options.winSize-1, 1, true);
               thisObj.window.slider("moveTo", thisObj.options.start, 0, true);
               thisObj.drawTimecloud();
               return false;})
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', '3m' )
         .val( '3m' )
         .click(function () { 
               thisObj.options.winSize=90;
               thisObj.window.slider("moveTo", thisObj.options.start+thisObj.options.winSize-1, 1, true);
               thisObj.window.slider("moveTo", thisObj.options.start, 0, true);
               thisObj.drawTimecloud();
               return false;})
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', '6m' )
         .val( '3m' )
         .click(function () { 
               thisObj.options.winSize=180;
               thisObj.window.slider("moveTo", thisObj.options.start+thisObj.options.winSize-1, 1, true);
               thisObj.window.slider("moveTo", thisObj.options.start, 0, true);
               thisObj.drawTimecloud();
               return false;})
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', '1y' )
         .val( '1y' )
         .click(function () { 
               thisObj.options.winSize=365;
               thisObj.window.slider("moveTo", thisObj.options.start+thisObj.options.winSize-1, 1, true);
               thisObj.window.slider("moveTo", thisObj.options.start, 0, true);
               thisObj.drawTimecloud();
               return false;})
         .appendTo(this.timecloudElem);
      this.timecloudElem.append(" | Steps ");
      $('<input type="submit" />')
         .attr( 'name', '1d' )
         .val( '1d' )
         .click(function () { thisObj.options.steps=1; return false;})
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', '7d' )
         .val( '7d' )
         .click(function () { thisObj.options.steps=7; return false;})
         .appendTo(this.timecloudElem);
      $('<input type="submit" />')
         .attr( 'name', '30d' )
         .val( '30d' )
         .click(function () { thisObj.options.steps=30; return false;})
         .appendTo(this.timecloudElem);
      $("<div/>").addClass("tagcloud")
         .bind('wheel', function(e) { thisObj.resizeWindow(e);}) 
         .appendTo(this.timecloudElem);
      this.element.append(this.timecloudElem);
   },

   // internal: used on mouse events
   resizeWindow: function(e) { 
      this.options.winSize=this.options.winSize+(Math.round(this.frames.length/100)*e.delta*-1);
      this.window.slider("moveTo", this.options.start+this.options.winSize-1, 1, true);
      this.window.slider("moveTo", this.options.start, 0, true);
      this.drawTimecloud();
      }, 

   // internal: used to draw a fresh frame
   drawTimecloud: function() {
      this.initCache();
      this.window.slider("moveTo", parseInt(this.options.start), 0, true);
      this.window.slider("moveTo", parseInt(this.options.start+this.options.winSize-1), 1, true);
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
      this.drawSparkline(this.sparkline,this.timecloudElem);
      this.drawTagcloud(this.listToDict(this.tags),this.timecloudElem);
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
      for (id in data) {
         var curdate=this.strToDate(data[id]['date']);
         while(nextdate<curdate) {
            lst.push(0);
            nextdate=this.addDay(nextdate,1);
         }
         lst.push(parseInt(data[id]['count']));
         nextdate=this.addDay(nextdate,1);
      }
      $('.startdate',target).text(this.dateToStr(startdate));
      $('.enddate',target).text(this.dateToStr(enddate));
      $('.sparkline',target).sparkline(lst, this.options.sparklineStyle);
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
      if(this.options.play) { this.options.play=false; return(">"); }
      else { this.options.play=true; this.nextFrame(); return("||");}
   },

   // internal: updates the cache advancing the window by self steps. to save
   // time we substract only the removed days tags and add the added days tags
   // to the cache. afterwards we update the sliding window widget, redraw the
   // timecloud and time the next frame
   nextFrame: function () {
      var self=this;
      var totalFrames=this.frames.length;

      // iterate over all frames
      if((this.options.start+this.options.winSize+this.options.steps)<totalFrames) {
         // substract all days tags leaving the sliding window
         var i=0;
         while(i<this.options.steps) {
            var curDay=this.frames[this.options.start+i][1];
            for (tag in curDay) {
               var item=curDay[tag];
               this.tags[item[0]].count-=parseInt(item[1]);
               if(this.tags[item[0]].count<=0) {
                  delete this.tags[item[0]];
               }
            }

            // add days start+winSize - start+winSize+steps
            curDay=this.frames[this.options.start+this.options.winSize+i][1];
            var tag;
            var cnt=0;
            for (tag in curDay) {
               var item=curDay[tag];
               if(this.tags[item[0]]) {
                     this.tags[item[0]].count+=parseInt(item[1]);
               } else {
                  this.tags[item[0]]=new Array();
                  this.tags[item[0]].count=parseInt(item[1]);
               }
               cnt+=parseInt(item[1]);
               this.tags[item[0]].currentDate=this.frames[this.options.start+this.options.winSize+i][0];
            }
            this.sparkline.push({'date': this.frames[this.options.start+this.options.winSize+i][0], 'count': cnt});
            i+=1;
         }
         this.sparkline.splice(0,this.options.steps);

         // advance start with steps
         this.options.start+=this.options.steps;
         this.window.slider("moveTo", parseInt(this.options.start), 0, true);
         this.window.slider("moveTo", parseInt(this.options.start+this.options.winSize-1), 1, true);

         // draw timecloud (current frame)
         this.redrawTimecloud();
      }
      if(this.options.play) { 
         setTimeout(function() { self.nextFrame.call(self); }, this.options.timeout); 
      }
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
   start: 0, // first frame to show
   winSize: 30,
   steps: 1, // animation should advance this many days / frame
   timeout: 200, // delay between frames
   play: 0,  // play animation?
   sparklineStyle: { type:'line', lineColor:'Navy', height:'30px', width:'800px', chartRangeMin: '0' },
   urlprefix: '', // tagcloud links will be pointing here
   urlpostfix: '' // tagcloud links get this postfix
 };
})(jQuery);
