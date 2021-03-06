/*global window, console, navigator*/

var Erizo = Erizo || {};

Erizo.sessionId = 103;

// Erizo 连接
Erizo.Connection = function (spec) {
    "use strict";
    var that = {};

    spec.session_id = (Erizo.sessionId += 1);

    // Check which WebRTC Stack is installed.
    // 添加浏览器信息到 spec描述
    that.browser = Erizo.getBrowser();
    // 浏览器支持判断 返回支持的Stack
    if (that.browser === 'fake') {
        L.Logger.warning('Publish/subscribe video/audio streams not supported in erizofc yet');
        that = Erizo.FcStack(spec);
    } else if (that.browser === 'mozilla') {
        L.Logger.debug("Firefox Stack");
        that = Erizo.FirefoxStack(spec);
    } else if (that.browser === 'bowser'){
        L.Logger.debug("Bowser Stack");
        that = Erizo.BowserStack(spec);
    } else if (that.browser === 'chrome-stable') {
        L.Logger.debug("Chrome Stable Stack");
        that = Erizo.ChromeStableStack(spec);
    } else {
        L.Logger.error("No stack available for this browser");
        throw "WebRTC stack not available";
    }
    if (!that.updateSpec){
        that.updateSpec = function(newSpec, callback){
            L.Logger.error("Update Configuration not implemented in this browser");
            if (callback)
                callback ("unimplemented");
        };
    }

    return that;
};

// 获取浏览器信息
Erizo.getBrowser = function () {
  "use strict";

    var browser = "none";

    if (typeof module!=='undefined' && module.exports){
        browser = "fake";
    }else if (window.navigator.userAgent.match("Firefox") !== null) {
        // Firefox
        browser = "mozilla";
    } else if (window.navigator.userAgent.match("Bowser") !==null){
        browser = "bowser";
    } else if (window.navigator.userAgent.match("Chrome") !==null) {
        if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] >= 26) {
            browser = "chrome-stable";
        }
    } else if (window.navigator.userAgent.match("Safari") !== null) {
        browser = "bowser";
    } else if (window.navigator.userAgent.match("AppleWebKit") !== null) {
        browser = "bowser";
    }
    return browser;
};


// 获取流
Erizo.GetUserMedia = function (config, callback, error) {
    "use strict";

    navigator.getMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);

    if (config.screen){

        L.Logger.debug("Screen access requested");
        switch(Erizo.getBrowser()){
            case "mozilla":
                L.Logger.debug("Screen sharing in Firefox");
                var theConfig = {};
                if(config.video.mandatory != undefined){
                    theConfig.video = config.video;
                    theConfig.video.mediaSource = 'window' || 'screen';
                }else{
                    theConfig = { audio: config.audio, video: { mediaSource: 'window' || 'screen' }};
                }
                navigator.getMedia(theConfig,callback,error);
                break;
            case "chrome-stable":
                L.Logger.debug("Screen sharing in Chrome");
                // Default extensionId - this extension is only usable in our server, please make your own extension
                // based on the code in erizo_controller/erizoClient/extras/chrome-extension
                var extensionId = "okeephmleflklcdebijnponpabbmmgeo";
                if (config.extensionId){
                    L.Logger.debug("extensionId supplied, using " + config.extensionId);
                    extensionId = config.extensionId;
                }
                L.Logger.debug("Screen access on chrome stable, looking for extension");
                try{
                    chrome.runtime.sendMessage(extensionId,{getStream:true}, function (response){
                        var theConfig = {};
                        if (response==undefined){
                            L.Logger.error("Access to screen denied");
                            var theError = {code:"Access to screen denied"};
                            error(theError);
                            return;
                        }
                        var theId = response.streamId;
                        if(config.video.mandatory!= undefined){
                            theConfig.video = config.video;
                            theConfig.video.mandatory.chromeMediaSource = 'desktop';
                            theConfig.video.mandatory.chromeMediaSourceId = theId;

                        }else{
                            theConfig = {video: {mandatory: {chromeMediaSource: 'desktop',  chromeMediaSourceId: theId }}};
                        }
                        navigator.getMedia(theConfig,callback,error);
                    });
                } catch (e){
                    L.Logger.debug("Screensharing plugin is not accessible ");
                    var theError = {code:"no_plugin_present"};
                    error(theError);
                    return;
                }
                break;
            default:
                L.Logger.error("This browser does not support ScreenSharing");
        }
    } else {
      if (typeof module !== 'undefined' && module.exports) {
        L.Logger.error('Video/audio streams not supported in erizofc yet');
      } else {
        navigator.getMedia(config, callback, error);
      }
    }
};

