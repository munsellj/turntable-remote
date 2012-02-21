/**
* Turntable Remote
* Version: 0.11
*
* Author: Jonathon Munsell
* TT DJ: Jonny Jump Up
* Website: http://jonathonmunsell.com
* Twitter: @munsellj
* Github: https://github.com/munsellj
*
* This bookmarklet was built to act as a mini remote control to display the currently playing info along
* the bottom of the screen to let you see whats going on while keeping TT in the background and
* getting some work done.  It also includes an autobopper (will automatically vote Awesome for every
* song) that can be turned on and off in case you come and go and don't want to have to refresh the 
* browser to regain control of your voting (or in case something really aweful gets played).
*
* The idea is also to potentially expand the feature set for it to replace some common/favorite 
* extension features and be more cross-browser friendly.  This is in no way affiliated with 
* turntable.fm and use at your own risk.
*
* Enjoy and feel free to send feedback via Twitter!
*
* Cheers!
*
**/

// Some variables for the UI
var ttRemoteCss = {
  'text-align' : 'center',
  'padding' : '15px',
  'color' : '#ddd',
  'background-color' : '#333',
  'position' : 'fixed',
  'bottom' : '0',
  'width' : '100%',
  'z-index' : '1984'
};
var ttSongInfoCss = {
  'text-align' : 'left'
};
var ttAutoBopCss = {
  'text-align' : 'right'
};
var songUi = "<span id ='tt-song-info'><span id='tt-artist'>Artist</span>&nbsp;&nbsp;-&nbsp;&nbsp;<span id='tt-song'>Song</span></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
var bopUi = "<span id='tt-auto-bop'>AutoBop:&nbsp;&nbsp;<a id='start-bop' href='javascript:ttRemote.startAutoBop();'>All</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a id='fan-bop' href='javascript:ttRemote.fanBop();'>Fan</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a id='stop-bop' href='javascript:ttRemote.stopAutoBop();' style='color: red;'>Stop</a></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a id='close-remote' href='javascript:ttRemote.close();'>X</a>";

// The meat and potatoes
var ttRemote = {
  // enables logging
  debug: false,
  // turntable object in the room scope that gives reference to local turntable js functions, variables, etc...
  ttRoom: null,
  // turntable object in the user scope that gives reference to local turntable js functions, variables, etc...
  ttUser: null,
  // bop timer to delay call of bop
  bopTimer: null,
  // bop flags
  isBoppin: false,
  bopSetting: "none",
  // logger
  log: function(aMsg) {
    if (this.debug) {
      console.log(aMsg);
    }
  },
  nowPlaying: null,
  // initialize ttRemote
  init: function() {
    // get reference to an avatar, props to @Inumedia for this bit
    var someAvatar = $("div[original-title]")[6];
    // mouse over it to make the user profile info and actions info appear
    $(someAvatar).mouseover();
    // get a reference to the blue user profile button
    var profileButton = $("a.blue");
    // set ttUser by parsing and evaluating the JS set in the href of profileButton 
    this.ttUser = eval(profileButton.attr("href").split(".")[0].replace("javascript:",""));
    // mouse out to return to original state
    $(someAvatar).mouseout();
    
    // parse the turntable object to try and find a reference to the room object.
    // TODO: This isn't super reliable.  Need a better way of finding this object, but should work for now...
    for (var prop in turntable) {
      if (turntable.hasOwnProperty(prop)) {
        var temp = turntable[prop];
        if (temp && typeof temp == 'object') {
          if (temp.roomId) {
            this.ttRoom = temp;
            break;
          }
        }
      }
    }
    
    this.currDj = this.ttRoom.currentDj;
    // this.currDj = ttUser.current_dj[0];
    // set onNewSong to be part of the new song callback list
    if (!this.ttUser.originalNewsong) {
      this.ttUser.originalNewsong = this.ttUser.newsong;
    }
    this.ttUser.newsong = (function(a,b,c,d) { ttRemote.ttUser.originalNewsong(a,b,c,d); ttRemote.onNewSong(a,b,c,d); });
    
    // initialize UI
    $('#tt-remote').css(ttRemoteCss);
    // Append TT Remote UI
    $('#tt-remote').append(songUi);
    $('#tt-remote').append(bopUi);
    $('#tt-song-info').css(ttSongInfoCss);
    $('#tt-auto-bop').css(ttAutoBopCss);
    if(this.debug) {
      $('#tt-remote').append("&nbsp;&nbsp;&nbsp;<a id='close-remote' href='javascript:ttRemote.logObjs();'>DEBUG</a>");
    }
  },
  /**
  * Check if a user is a mod in the room
  * @function
  * @param {string} aUserId - TT userId of the user to check
  * @return {boolean} 
  */
  isMod: function(aUserId) {
    this.log("[isMod] - : " + aUserId);
    for (var ii = 0; ii < this.ttUser.moderators.length; ii++) {
      if (this.ttUser.moderators[ii] == aUserId) {
        this.log("^ is a mod");
        return true;
      }
    }
    this.log("^ isn't a mod");
    return false;
  },
  /**
  * Get the DJ name (displayed name) for a userId.
  * @function
  * @param {string} aUserId - TT userId of the user to get
  * @return {String} DJ name of the user
  */
  getDjName: function(aUserId) {
    this.log("[getDjName] - : " + aUserId);
    return this.ttRoom.users[aUserId].name;
  },
  // alias to vote Awesome for a song
  bop: function() {
    if (this.currDj && (this.currDj != this.ttUser.myuserid)) {
      this.log("[bop]");
      if (this.ttRoom.currentDj != this.ttUser.myuserid) {
        this.ttUser.callback('upvote');
        if (this.bopTimer) {
          clearTimeout(this.bopTimer);
          this.bopTimer = null;
        }
      }
    }
  },
  // start auto bop for every song
  startAutoBop: function() {
    this.log("[startAutoBop]");
    $('#start-bop').css('color', 'green');
    $('#fan-bop').css('color', 'blue');
    $('#stop-bop').css('color', 'blue');
    this.isBoppin = true;
    this.bopSetting = "all";
    this.bop();
  },
  // auto bop only if you are a fan of the DJ
  fanBop: function() {
    this.log("[fanBop]");
    $('#start-bop').css('color', 'blue');
    $('#fan-bop').css('color', 'green');
    $('#stop-bop').css('color', 'blue');
    this.isBoppin = true;
    this.bopSetting = "fan";
    if (turntable.user.fanOf.indexOf(this.ttRoom.currentDj) != -1) {
      this.bop();
    }
  },
  stopAutoBop: function() {
    this.log("[stopAutoBop]");
    $('#start-bop').css('color', 'blue');
    $('#fan-bop').css('color', 'blue');
    $('#stop-bop').css('color', 'red');
    this.isBoppin = false;
    this.bopSetting = "none";
    if (this.bopTimer) {
      clearTimeout(this.bopTimer);
      this.bopTimer = null;
    }
  },
  onNewSong: function(a,b,c,d) {
    this.log("[onNewSong] params: " + a + "  " + b + "  " + c + "  " + d);
    this.currDj = this.ttRoom.currentDj;
    this.nowPlaying = {
      dj: a,
      artist: b,
      song: c,
      length: d
    };
    this.log(this.nowPlaying);
    // update remot ui for now playing
    $('#tt-artist').html(this.nowPlaying.artist);
    $('#tt-song').html(this.nowPlaying.song);
    /* bop may be disabled in some small rooms and only be allowed after 1 min
    * check song length, if less than 60 seconds, bop after 15, 
    * if less than 30, try bop right away
    */
    if (this.isBoppin) {
      var bopTimeout = 61000;
      if (this.nowPlaying.length < 50) {
        bopTimeout = 15000;
      } else if (this.nowPlaying.length < 14) {
        bopTimeout = 1000;
      }
      if (this.bopSetting == 'all') {
        this.bopTimer = setTimeout("ttRemote.bop()", bopTimeout);
      } else if (this.bopSetting == 'fan') {
        if (turntable.user.fanOf.indexOf(this.ttRoom.currentDj) != -1) {
          this.bopTimer = setTimeout("ttRemote.bop()", bopTimeout);
        }
      }
    }
  },
  close: function() {
    // clean up variables
    this.ttUser.newsong = this.ttUser.originalNewsong;
    this.ttUser.originalNewsong = null;
    // remove the code from the page
    $('#tt-remote').remove();
  },
  // log the TT objects for debugging
  logObjs: function() {
    this.log('[logObjs]')
    // print TT's turntable object and ttUser to console for debug
    this.log('turntable:');
    this.log(turntable);
    this.log('ttRoom:');
    this.log(this.ttRoom);
    this.log('ttUser:');
    this.log(this.ttUser);
  }
};

ttRemote.log("**** Loading TT Remote! *****");

// init
ttRemote.init();
