/**
* Turntable Remote
* Version: 0.2.1
**/

// The meat and potatoes
var ttRemote = {
  // Some variables for the UI
  artHtml: "<div id='tt-art'><img src='https://s3.amazonaws.com/static.turntable.fm/images/room/record.png' alt='Unknown' /></div>",
  songHtml: "<div id='tt-song-info'><div id='tt-song'>Song - 0:00</div><div id='tt-artist'>Artist</div><div id='tt-album'>Album</div><div id='tt-genre'>Genre</div></div>",
  controlsHtml: "<div id='tt-controls'><a id='mute-song' href='javascript: ttRemote.muteSong();'>Mute Song</a>AutoBop:&nbsp;&nbsp;<a id='start-bop' href='javascript:ttRemote.startAutoBop();'>All</a>|<a id='fan-bop' href='javascript:ttRemote.fanBop();'>Fan</a>|<a id='stop-bop' href='javascript:ttRemote.stopAutoBop();'>Off</a></div>",
  closeHtml: "<div id='close-remote'><a href='javascript:ttRemote.close();'>x</a></div>",
  // enables logging
  debug: false,
  // turntable object in the room scope that gives reference to local turntable js functions, variables, etc...
  ttRoom: null,
  // turntable object in the user scope that gives reference to local turntable js functions, variables, etc...
  ttUser: null,
  // turntable API reference to make API calls
  ttApi: null,
  // timeout used to initialize
  loadTimeout: null,
  isMute: false,
  volume: 0,
  // bop timer to delay call of bop
  bopTimer: null,
  // bop flags
  isBoppin: false,
  bopSetting: "none",
  // max number of DJs in the room
  maxDjs: null,
  // logger
  log: function(aMsg) {
    if (this.debug) {
      console.log(aMsg);
    }
  },
  // initialize ttRemote
  init: function() {
    // append the tt remote style sheet
    $('head').append('<link rel="stylesheet" href="http://bestroomontt.com/tt-remote/tt_remote.css">');
    
    // get reference to an avatar, props to @Inumedia for this bit
    var someAvatar = $("div[original-title]")[6];
    // mouse over it to make the user profile info and actions info appear
    $(someAvatar).mouseover();
    // get a reference to the blue user profile button
    var profileButton = $("a.blue");
    // mouse out to return to original state
    $(someAvatar).mouseout();
    
    // parse the turntable object to find and set ttRoom
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
    
    // parse the ttRoom to find and set ttUser
    for (var prop in this.ttRoom) {
      if (this.ttRoom.hasOwnProperty(prop)) {
        var temp = this.ttRoom[prop];
        if (temp && typeof temp == 'object') {
          if (temp.myuserid) {
            this.ttUser = temp;
            break;
          }
        }
      }
    }
    
    // parse the turntable object to find and set ttApi
    var apiRegEx = / Preparing message /i;
    for (var prop in turntable) {
      var temp = turntable[prop];
      if (typeof temp !== "function") {
        continue;
      }
      temp.toString = Function.prototype.toString;
      if (apiRegEx.test(temp.toString())) {
        this.ttApi = temp;
      }
    }
    
    this.maxDjs = this.ttRoom.maxDjs;
    this.currDj = this.ttRoom.currentDj;
    // this.currDj = ttUser.current_dj[0];
    // set onNewSong to be part of the new song callback list
    if (!this.ttUser.originalNewsong) {
      this.ttUser.originalNewsong = this.ttUser.newsong;
    }
    this.ttUser.newsong = (function(a,b,c,d) { ttRemote.ttUser.originalNewsong(a,b,c,d); ttRemote.onNewSong(a,b,c,d); });
    
    // initialize UI
    // Append TT Remote UI
    $('#tt-remote').append('<div id="remote-main"></div>');
    $('#remote-main').append(this.artHtml);
    $('#remote-main').append(this.songHtml);
    $('#remote-main').append(this.controlsHtml);
    $('#remote-main').append(this.closeHtml);    
    if(this.debug) {
      $('#tt-controls').append("&nbsp;&nbsp;&nbsp;<a href='javascript:ttRemote.logObjs();'>DEBUG</a>");
    }
    
    $('#mute-song').css('padding-left', '0');
    $('#stop-bop').css('color', 'red');
    // Update now playing info if a song is currently playing
    if (this.ttRoom.currentSong) {
      this.updateMetadata();
    }
    this.loadTimeout = setTimeout('ttRemote.setLayout()', 1000);
  },
  setLayout: function() {
    clearTimeout(this.loadTimeout);
    this.loadTimeout = null;
    // add a bottom margin to the page so all content is still accessible
    var remoteHeight = $('#tt-remote').height();
    $('#maindiv').css('margin-bottom', (remoteHeight + 25) + 'px');
    $('#close-remote').css('bottom', (remoteHeight - 10) + 'px');
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
  muteSong: function() {
    if (this.isMute) {
      $('#mute-song').css('color', '#D9A343');
      this.isMute = false;
      turntablePlayer.setVolume(this.volume);
    } else {
      $('#mute-song').css('color', 'green');
      this.isMute = true;
      this.volume = turntablePlayer.volume;
      turntablePlayer.setVolume(0);
    }
  },
  // alias to vote Awesome for a song
  bop: function() {
    if (ttRemote.currDj && (ttRemote.currDj != ttRemote.ttUser.myuserid)) {
      ttRemote.log("[bop]");
      turntable.whenSocketConnected(function () {
        if (ttRemote.ttRoom.currentSong) {
          ttRemote.ttApi({
            api: "room.vote",
            roomid: ttRemote.ttRoom.roomId,
            val: "up",
            vh: $.sha1(ttRemote.ttRoom.roomId + "up" + ttRemote.ttRoom.currentSong._id),
            th: $.sha1(Math.random() + ""),
            ph: $.sha1(Math.random() + "")
          });
        }
      });
      if (ttRemote.bopTimer) {
        clearTimeout(ttRemote.bopTimer);
        ttRemote.bopTimer = null;
      } 
    }
  },
  // start auto bop for every song
  startAutoBop: function() {
    this.log("[startAutoBop]");
    $('#start-bop').css('color', 'green');
    $('#fan-bop').css('color', '#D9A343');
    $('#stop-bop').css('color', '#D9A343');
    this.isBoppin = true;
    this.bopSetting = 'all';
    this.bop();
  },
  // auto bop only if you are a fan of the DJ
  fanBop: function() {
    this.log("[fanBop]");
    $('#start-bop').css('color', '#D9A343');
    $('#fan-bop').css('color', 'green');
    $('#stop-bop').css('color', '#D9A343');
    this.isBoppin = true;
    this.bopSetting = "fan";
    if (turntable.user.fanOf.indexOf(this.ttRoom.currentDj) != -1) {
      this.bop();
    }
  },
  stopAutoBop: function() {
    this.log("[stopAutoBop]");
    $('#start-bop').css('color', '#D9A343');
    $('#fan-bop').css('color', '#D9A343');
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
    this.updateMetadata();
    /* Awesome may be disabled in some small rooms and only be allowed after 1 min
    * check song length. Vote is delayed to allow user to cancel vote as well as to meet TT restrictions.
    */
    if (this.isBoppin) {
      var songLength = this.ttRoom.currentSong.metadata.length;
      // set the bop timeout to half the song length to delay vote
      var bopTimeout = (songLength * 1000) / 2;
      if (this.bopSetting == 'all') {
        this.bopTimer = setTimeout('ttRemote.bop()', bopTimeout);
      } else if (this.bopSetting == 'fan') {
        if (turntable.user.fanOf.indexOf(this.ttRoom.currentDj) != -1) {
          this.bopTimer = setTimeout('ttRemote.bop()', bopTimeout);
        }
      }
    }
    // unmute for new song if last song was muted
    if (this.isMute) {
      this.muteSong();
    }
  },
  updateMetadata: function() {
    var songLength = this.ttRoom.currentSong.metadata.length;
    var mins = Math.floor(songLength / 60);
    var secs = songLength % 60;
    if (secs < 10) {
      secs = '0' + secs;
    }
    var duration = mins + ':' + secs;
    
    $('#tt-song').html(this.ttRoom.currentSong.metadata.song + ' - ' + duration);
    $('#tt-artist').html(this.ttRoom.currentSong.metadata.artist);
    $('#tt-album').html(this.ttRoom.currentSong.metadata.album);
    $('#tt-genre').html(this.ttRoom.currentSong.metadata.genre);
    
    if (this.ttRoom.currentSong.metadata.coverart) {
      $('#tt-art img').attr('src', this.ttRoom.currentSong.metadata.coverart);
    } else {
      $('#tt-art img').attr('src', 'https://s3.amazonaws.com/static.turntable.fm/images/room/record.png');
    }
    $('#tt-art img').attr('alt', this.ttRoom.currentSong.metadata.album);
  },
  close: function() {
    // clean up variables
    this.ttUser.newsong = this.ttUser.originalNewsong;
    this.ttUser.originalNewsong = null;
    if (this.bopTimer) {
      clearTimeout(this.bopTimer);
      this.bopTimer = null;
    }
    if (this.autoDjInterval) {
      clearInterval(this.autoDjInterval);
      this.autoDjInterval = null;
    }
    $('#maindiv').css('margin-bottom', '0');
    // remove the code from the page
    $('#tt-remote').remove();
  },
  // log the TT objects for debugging
  logObjs: function() {
    this.log('[logObjs]')
    // print TT's turntable object and ttUser to console for debug
    this.log('turntable: ');
    this.log(turntable);
    this.log('ttUser:');
    this.log(this.ttUser);
  }
};

// init
ttRemote.init();
