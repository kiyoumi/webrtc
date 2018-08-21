/**
 * Created by ThinkPad on 2016/10/25.
 */
var room,_localStream=null, recording,_noAnswerFlag=false,_startMeetingPhone=null,haveMeeting=false;
var remoteStreams=[],duration=0;
var subscribeNum=1;
var showVideoNum=3;

//on stream
/*function onStream(type){
    //4. 添加监听
    // 接入成功消息
    console.log(_localStream);
    _localStream.addEventListener("access-accepted", function () {
        var subscribeToStreams = function (streams) {
            var index=0;
            console.log("subscribe streams------>"+JSON.stringify(streams));
            var _stream=streams[index];
            if(streams!==null && streams.length>0){
                subscribeFun(_stream);
                console.log("subscribe phone------>"+_stream.getAttributes().uin);
            }
            function subscribeFun(sub_stream){
                if(_localStream){
                    if (_localStream.getID() !== sub_stream.getID()) {
                        if(type==2){
                            ifSubscribeVideo(sub_stream,false);
                        }else{
                            if(subscribeNum<(showVideoNum+1)){
                                ifSubscribeVideo(sub_stream,true);
                            }else{
                                ifSubscribeVideo(sub_stream,false);
                            }
                        }
                    }
                }
            }

            function ifSubscribeVideo(stream,videoType){
                room.subscribe(stream, {audio: true, video: videoType},function(result, error){
                    if (result === undefined){
                        index++;
                        if(index<streams.length){
                            _stream=streams[index];
                            subscribeFun(_stream);
                        }
                        console.log("Error subscribing to stream------------PCPlus", error);
                    } else {
                        index++;
                        subscribeNum++;
                        if(index<streams.length){
                            _stream=streams[index];
                            subscribeFun(_stream);
                        }
                        remoteStreams.push(stream);
                        console.log("1111subscribeNum--------------------->"+subscribeNum);
                        console.log("Stream subscribed!------------PCPlus");
                    }
                });
            }
        };
        // 房间连接消息
        room.addEventListener("room-connected", function (roomEvent) {
            // 向房间中上传本地流
            room.publish(_localStream, {maxVideoBW: 300});
            subscribeToStreams(roomEvent.streams);
        });
        // 订阅房间的流消息
        var subPhoneList=[];
        room.addEventListener("stream-subscribed", function(streamEvent) {
            var stream = streamEvent.stream;
            var flag=stream.video;
            console.log("audio------------>"+stream.audio);
            console.log("video------>"+flag,type); //getAudioTracks()
            var subscribePhone=stream.getAttributes().uin;
            var specialHtml='';
            if(type==2){
                specialHtml +='<i class="audioBtn iconfont icon-roundcheckfill videoAudio"><span>语音</span></i>';
            }else{
                if(flag){
                    specialHtml='<i class="videoBtn iconfont icon-roundcheckfill videoAudio"><span >视频</span></i>';
                    specialHtml +='<i class="audioBtn iconfont icon-roundcheckfill videoAudio"><span>语音</span></i>';
                }else{
                    specialHtml='<i class="videoBtn iconfont icon-roundcheckfill"><span>视频</span></i>';
                    specialHtml +='<i class="audioBtn iconfont icon-roundcheckfill videoAudio"><span>语音</span></i>';
                }
            }
            if(flag){
                var div = document.createElement('div');
                div.setAttribute("id", "test" + stream.getID());
                console.log("_startMeetingPhone---"+_startMeetingPhone);
                div.setAttribute("streamId",stream.getID());
                div.setAttribute("class","videoContainer_remote videoContainerBlock");
                if( subscribePhone == _startMeetingPhone ){
                    stream.show("_otherVideo");
                    div.setAttribute("class","videoContainer_remote videoContainerBlock remoteVideosAvtive");
                    //div.setAttribute('style','position:absolute');
                }
                console.log(122);
                getInfo(subscribePhone,function(fromName){
                    var html='<div class="joinMeetPersonSign">';
                    html+='<i class="icon iconfont icon-information"></i>';
                    html+='</div>';
                    html+='<div class="tip-bubble tip-bubble-bottom displayNone">';
                    html+='<div>姓名：<span>'+fromName+'</span></div>';
                    html+='<div>号码：<span>'+subscribePhone+'</span></div>';
                    html+='</div>';
                    div.innerHTML=html;
                    document.getElementById("remoteVideo_bottom1").appendChild(div);
                    stream.show("test" + stream.getID());

                    $("#remoteVideos_meet .videoContainerBlock").click(function(){
                            $(this).siblings().removeClass("remoteVideosActive");
                            $(this).addClass("remoteVideosActive");
                            var bigScreenSrc=$(this).find(".stream").attr("src");
                            $("#_otherVideo video").attr("src",bigScreenSrc);
                        });
                    $(".videoContainerBlock .joinMeetPersonSign").hover(function(){
                            $('#remoteVideo_bottom1').attr('overflow','');
                            $(this).next().removeClass("displayNone");
                        },function(){
                            $('#remoteVideo_bottom1').attr('overflow','hidden');
                            $(this).next().addClass("displayNone");
                    });
                });
            }else{
                var _div = document.createElement('div');
                _div.setAttribute("id", "test" + stream.getID());
                _div.setAttribute("streamId",stream.getID());
                document.getElementById("closeVideo").appendChild(_div);
                stream.show("test" + stream.getID());
            }
            console.log(subPhoneList,subscribePhone);
            getInfo(subscribePhone,function(fromName){
                console.log(subPhoneList.indexOf(subscribePhone) == -1);
                if(subPhoneList.indexOf(subscribePhone) == -1){
                    subPhoneList.push(subscribePhone);
                    var _html ='<li streamId='+stream.getID()+'>';
                    _html+='<div class="videoClose_fl"><div class="videoClose_fl">';
                    _html+='<img class="videoClose_fl" src="public/images/tuzi.png" alt=""></div>';
                    _html+='<div class="videoClose_fl changeVideoInfo"><div>'+fromName+'</div><div>'+subscribePhone+'</div></div>';
                    _html+='<div class="videoClose_fr">'+specialHtml+'</div></div></li>';
                    $("#videoClose_streamList ul").append(_html);
                }
                $("#videoClose_streamList ul li .videoBtn").unbind().click(function(){
                    var streamId=$(this).parent().parent().parent().attr("streamId");
                    var audioType=$(this).siblings(".audioBtn").hasClass("videoAudio");
                    if(audioType){
                        audioType=true;
                    }else{
                        audioType=false;
                    }
                    var num=0;
                    $("#videoClose_streamList ul li .videoBtn").each(function(){
                        if($(this).hasClass("videoAudio")){
                            num++;
                        }
                    });
                    if($(this).hasClass("videoAudio")){
                        $(this).removeClass("videoAudio");
                        subscribeFun(streamId,audioType,false);
                    }else{
                        if(num<showVideoNum){
                            $(this).toggleClass("videoAudio");
                            if($(this).hasClass("videoAudio")){
                                subscribeFun(streamId,audioType,true);
                            }else{
                                subscribeFun(streamId,audioType,false);
                            }
                        }else{
                            layer.msg("最多只能显示"+(showVideoNum+1)+"个参会人的视频", {
                                icon: 5,
                                shift: 6
                            });
                        }
                    }
                });
                $("#videoClose_streamList ul li .audioBtn").unbind().click(function(){
                    $(this).toggleClass("videoAudio");
                    var streamId=$(this).parent().parent().parent().attr("streamId");
                    var thisStream='';
                    for(var i=0;i<remoteStreams.length;i++){
                        if(streamId == remoteStreams[i].getID()){
                            thisStream=remoteStreams[i];
                        }
                    }
                    if($(this).hasClass("videoAudio")){
                        thisStream.openAudio();
                    }else{
                        thisStream.closeAudio();
                    }
                })
            });
            function subscribeFun(streamId,audio,video){
                for(var i=0;i<remoteStreams.length;i++){
                    if(streamId == remoteStreams[i].getID()){
                        var thisStream=remoteStreams[i];
                        room.unsubscribe(thisStream, function(result, error){
                            if (result === undefined){
                                console.log("Error unsubscribing", error);
                            } else {
                                console.log("Stream unsubscribed!");
                                if(video == false){
                                    var thisNode=document.getElementById("test"+thisStream.getID());
                                    thisNode.parentNode.removeChild(thisNode);
                                }
                                room.subscribe(thisStream, {audio: audio, video: video}, function(result, error){
                                    if (result === undefined){
                                        console.log("Error subscribing to stream", error);
                                    } else {
                                        console.log("Stream subscribed!");
                                    }
                                });
                            }
                        });
                    }
                }
            }
        });
        // 流加入房间消息
        room.addEventListener("stream-added", function (streamEvent) {
            var streams = [];
            streams.push(streamEvent.stream);
            console.log("stream add---------------------------->"+JSON.stringify(streams));
            subscribeToStreams(streams);
        });
        // 房间中流移除消息
        room.addEventListener("stream-removed", function (streamEvent) {
            var stream = streamEvent.stream;
            var subPhone=stream.getAttributes().uin;
            var l=subPhoneList.indexOf(subPhone);
            subPhoneList.splice(l,1);
            // Remove stream from DOM
            removeLists(stream);
        });
        // 取消订阅房间中流
        /!*room.addEventListener("stream-unsubscribe", function (streamEvent) {
            // Remove stream from DOM
            var stream = streamEvent.stream;
            if (stream.elementID !== undefined) {

            }
        });*!/

        // 房间中流失败消息
        room.addEventListener("stream-failed", function (streamEvent){
            var stream = streamEvent.stream;
            var subPhone=stream.getAttributes().uin;
            var l=subPhoneList.indexOf(subPhone);
            subPhoneList.splice(l,1);
            console.log("Stream Failed, act accordingly");
            removeLists(stream);
        });

        //5. 连接上房间
        room.connect();

        console.log("onStream _startMeetingPhone------->"+_startMeetingPhone);
        if(_startMeetingPhone == ownUin){
            _localStream.show("_otherVideo");
        }
        _localStream.show("_myVideo");

        $("#joinMeetList").removeClass("displayNone");
        $("#icodeButton").removeClass("displayNone");
        $(".nav-control").removeClass("displayNone");
        $("#remoteVideos_control").removeClass("displayNone");
        $("#remoteVideos_area").removeClass("displayNone");
    });
}*/
function onStream(type){
    console.log(cmode,type);
    if((cmode==3 || cmode==1) && ownUin!=_startMeetingPhone){
        _localStream.closeAudio();
    }
    //4. 添加监听
    // 接入成功消息
    _localStream.addEventListener("access-accepted", function () {
        var subscribeToStreams = function (streams) {
            var index=0;
            console.log("subscribe streams------>"+JSON.stringify(streams));
            var _stream=streams[index];
            if(streams!==null && streams.length>0){
                subscribeFun(_stream);
            }
            function subscribeFun(sub_stream){
                console.log(sub_stream);
                if(_localStream){
                    if (_localStream.getID() !== sub_stream.getID()) {
                        if(type===2){
                            ifSubscribeVideo(sub_stream,false);
                        }else{
                            //订阅视频和语音流
                            if(subscribeNum<(showVideoNum+1)){
                                ifSubscribeVideo(sub_stream,true);
                            }else{
                                ifSubscribeVideo(sub_stream,false);
                            }
                        }
                    }
                }
            }

            function ifSubscribeVideo(stream,videoType){
                room.subscribe(stream, {audio: true, video: videoType},function(result, error){
                    if (result === undefined){
                        index++;
                        if(index<streams.length){
                            _stream=streams[index];
                            subscribeFun(_stream);
                        }
                        console.log("Error subscribing to stream------------PCPlus", error);
                    } else {
                        index++;
                        subscribeNum++;
                        if(index<streams.length){
                            _stream=streams[index];
                            subscribeFun(_stream);
                        }
                        console.log(cmode);
                        if(cmode==3){
                            console.log('=============='+stream);
                            var subscribePhone=stream.getAttributes().uin;
                            console.log(subscribePhone,_startMeetingPhone);
                            if(subscribePhone == _startMeetingPhone){
                                remoteStreams.push(stream);
                                console.log(remoteStreams);
                            }
                        }else{
                            remoteStreams.push(stream);
                            console.log(remoteStreams);
                        }
                    }
                });
            }
        };
        // 房间连接消息
        room.addEventListener("room-connected", function (roomEvent) {
            // 向房间中上传本地流
            room.publish(_localStream, {maxVideoBW: 300});
            subscribeToStreams(roomEvent.streams);
        });
        // 订阅房间的流消息
        var subPhoneList=[];
        room.addEventListener("stream-subscribed", function(streamEvent) {
            var stream = streamEvent.stream;
            var flag=stream.video;
            console.log("audio------------>"+stream.audio);
            console.log("video------>"+flag,type); //getAudioTracks()
            var subscribePhone=stream.getAttributes().uin;
            var specialHtml='';
            if(type==2){
                specialHtml +='<i class="audioBtn iconfont icon-roundcheckfill videoAudio"><span>语音</span></i>';
            }else{
                console.log("cmode======="+cmode);
                if(cmode!=3){
                    if(flag){
                        if(cmode!==1){
                            specialHtml='<i class="videoBtn iconfont icon-roundcheckfill videoAudio"><span >视频</span></i>';
                            specialHtml +='<i class="audioBtn iconfont icon-roundcheckfill videoAudio"><span>语音</span></i>';
                        }else{
                            if(subscribePhone===_startMeetingPhone){
                                specialHtml +='<i class="iconfont icon-home"><span>发起人</span></i>';
                            }
                            if(ownUin===_startMeetingPhone){
                                specialHtml +='<i class="sendAudio iconfont icon-roundcheckfill"><span>邀请发言</span></i>';
                            }
                        }
                    }else{
                        specialHtml='<i class="videoBtn iconfont icon-roundcheckfill"><span>视频</span></i>';
                        specialHtml +='<i class="audioBtn iconfont icon-roundcheckfill videoAudio"><span>语音</span></i>';
                    }
                }else if(subscribePhone===_startMeetingPhone){
                    specialHtml +='<i class="iconfont icon-home"><span>发起人</span></i>';
                }
                if(ownUin===_startMeetingPhone){
                    specialHtml +='<i class="reject iconfont icon-delete"><span>踢出</span></i>';
                }
            }
            if(flag){
                var div = document.createElement('div');
                div.setAttribute("id", "test" + stream.getID());
                div.setAttribute("streamId",stream.getID());
                div.setAttribute("class","videoContainer_remote videoContainerBlock");
                if( subscribePhone === _startMeetingPhone ){
                    stream.show("_otherVideo");
                    div.setAttribute("class","videoContainer_remote videoContainerBlock remoteVideosActive");
                }
                /*var width=$("#stramlocal").width()/2;
                console.log(width);
                $("#streamlocal").css("left","calc(50% - "+width+")");*/
                getInfo(subscribePhone,function(){
                    var html='<div class="joinMeetPersonSign">';
                    html+='<i class="icon iconfont icon-information"></i>';
                    html+='</div>';
                    html+='<div class="tip-bubble tip-bubble-bottom displayNone">';
                    html+='<div>姓名：<span>'+fromName+'</span></div>';
                    html+='</div>';
                    div.innerHTML=html;
                    document.getElementById("remoteVideo_bottom1").appendChild(div);
                    stream.show("test" + stream.getID());

                    $("#remoteVideos_meet .videoContainerBlock").click(function(){
                        setCookie();
                        $(this).siblings().removeClass("remoteVideosActive");
                        $(this).addClass("remoteVideosActive");
                        var bigScreenSrc=$(this).find(".stream").attr("src");
                        $("#_otherVideo video").attr("src",bigScreenSrc);
                    });
                    $(".videoContainerBlock .joinMeetPersonSign").hover(function(){
                        $('#remoteVideo_bottom1').attr('overflow','');
                        $(this).next().removeClass("displayNone");
                    },function(){
                        $('#remoteVideo_bottom1').attr('overflow','hidden');
                        $(this).next().addClass("displayNone");
                    });
                });
                if(cmode==3){
                    $("#remoteVideo_bottom,#remoteVideos_control").addClass("displayNone");
                } else{
                    $("#remoteVideo_bottom,#remoteVideos_control").removeClass("displayNone");
                }
                $(".stream").css("left","0");
            }/*else{
                var _div = document.createElement('div');
                _div.setAttribute("id", "test" + stream.getID());
                _div.setAttribute("streamId",stream.getID());
                document.getElementById("closeVideo").appendChild(_div);
                stream.show("test" + stream.getID());
            }*/
            getInfo(subscribePhone,function(){
                if(subPhoneList.indexOf(subscribePhone) == -1){
                    subPhoneList.push(subscribePhone);
                    var _html ='<li uin='+subscribePhone+' streamId='+stream.getID()+'>';
                    _html+='<div class="videoClose_fl"><div class="videoClose_fl">';
                    _html+='<img class="videoClose_fl" src="public/images/tuzi.png" alt=""></div>';
                    _html+='<div class="videoClose_fl changeVideoInfo"><div>'+fromName+'</div><div>'+subscribePhone+'</div></div>';
                    _html+='<div class="videoClose_fr">'+specialHtml+'</div></div></li>';
                    $("#videoClose_streamList ul").append(_html);
                }
                $("#videoClose_streamList ul li .videoBtn").unbind().click(function(){
                    setCookie();
                    var streamId=$(this).parent().parent().parent().attr("streamId");
                    var audioType=$(this).siblings(".audioBtn").hasClass("videoAudio");
                    if(audioType){
                        audioType=true;
                    }else{
                        audioType=false;
                    }
                    var num=0;
                    $("#videoClose_streamList ul li .videoBtn").each(function(){
                        if($(this).hasClass("videoAudio")){
                            num++;
                        }
                    });
                    if($(this).hasClass("videoAudio")){
                        $(this).removeClass("videoAudio");
                        subscribeFun(streamId,audioType,false);
                    }else{
                        if(num<showVideoNum){
                            $(this).toggleClass("videoAudio");
                            if($(this).hasClass("videoAudio")){
                                subscribeFun(streamId,audioType,true);
                            }else{
                                subscribeFun(streamId,audioType,false);
                            }
                        }else{
                            layer.msg("最多只能显示"+(showVideoNum+1)+"个参会人的视频", {
                                icon: 5,
                                shift: 6
                            });
                        }
                    }
                });
                $("#videoClose_streamList ul li .audioBtn").unbind().click(function(){
                    setCookie();
                    $(this).toggleClass("videoAudio");
                    var streamId=$(this).parent().parent().parent().attr("streamId");
                    var thisStream='';
                    for(var i=0;i<remoteStreams.length;i++){
                        if(streamId == remoteStreams[i].getID()){
                            thisStream=remoteStreams[i];
                        }
                    }
                    if($(this).hasClass("videoAudio")){
                        thisStream.openAudio();
                    }else{
                        thisStream.closeAudio();
                    }
                })
                $("#videoClose_streamList ul li .sendAudio").unbind().click(function(){
                    setCookie();
                    var touinList=[];
                    touinList.push($(this).parents("li").attr("uin"));
                    $(this).toggleClass("videoAudio");
                    if($(this).hasClass("videoAudio")){
                        client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"邀请发言消息","result":{"meetingType":116,"uin":'+ownUin+',"touin":'+touinList+'}}');
                        //emitData(ownUin,touinList,SignalingDataType._MEETING,{code:116,msg:"邀请发言消息"});
                    }else{
                        client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"主控要求结束分会场发言","result":{"meetingType":117,"uin":'+ownUin+',"touin":'+touinList+'}}');
                        //emitData(ownUin,touinList,SignalingDataType._MEETING,{code:117,msg:"主控要求结束分会场发言"});
                    }

                })
                $("#videoClose_streamList ul li .reject").unbind().click(function () {
                    var touinList=[];
                    touinList.push($(this).parents("li").attr("uin"));
                    client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"踢出消息","result":{"meetingType":115,"uin":'+ownUin+',"touin":'+touinList+'}}');
                    //emitData(ownUin,touinList,SignalingDataType._MEETING,{code:115,msg:"踢出消息"});
                })
            });
            function subscribeFun(streamId,audio,video){
                for(var i=0;i<remoteStreams.length;i++){
                    if(streamId == remoteStreams[i].getID()){
                        var thisStream=remoteStreams[i];
                        room.unsubscribe(thisStream, function(result, error){
                            if (result === undefined){
                                console.log("Error unsubscribing", error);
                            } else {
                                console.log("Stream unsubscribed!");
                                if(video == false){
                                    var thisNode=document.getElementById("test"+thisStream.getID());
                                    console.log(thisNode);
                                    if(thisNode){
                                        thisNode.parentNode.removeChild(thisNode);
                                    }
                                }
                                room.subscribe(thisStream, {audio: audio, video: video}, function(result, error){
                                    /*if(cmode==1 && subscribePhone != _startMeetingPhone){
                                        thisStream.stream.getAudioTracks().forEach(function(track) {
                                            track.enabled=false;
                                        });
                                    }*/
                                    if (result === undefined){
                                        console.log("Error subscribing to stream", error);
                                    } else {
                                        console.log("Stream subscribed!");
                                    }
                                });
                            }
                            console.log(subscribePhone,_startMeetingPhone);
                            if(subscribePhone == _startMeetingPhone){
                                $("#remoteVideos_meet .videoContainerBlock").eq(0).addClass("remoteVideosActive").siblings().removeClass("remoteVideosActive");
                                var BigScreenSrc=$("#remoteVideos_meet .videoContainerBlock.remoteVideosActive").find(".stream").attr("src");
                                $("#_otherVideo video.stream").attr("src",BigScreenSrc);
                            }
                            /*if(subscribeNum>1){

                                $("#remoteVideos_meet .videoContainerBlock").eq(0).addClass("remoteVideosActive").siblings().removeClass("remoteVideosActive");
                                var BigScreenSrc=$("#remoteVideos_meet .videoContainerBlock.remoteVideosActive").find(".stream").attr("src");
                                $("#_otherVideo video.stream").attr("src",BigScreenSrc);
                            }*/
                        });
                    }
                }
            }
        });
        // 流加入房间消息
        room.addEventListener("stream-added", function (streamEvent) {
            var streams = [];
            streams.push(streamEvent.stream);
            console.log("stream add---------------------------->"+JSON.stringify(streams));
            subscribeToStreams(streams);
        });
        // 房间中流移除消息
        room.addEventListener("stream-removed", function (streamEvent) {
            console.log(streamEvent.stream);
            var stream = streamEvent.stream;
            console.log("stream.elementID-------------------"+stream,stream.elementID);
            var subPhone=stream.getAttributes().uin;
            var l=subPhoneList.indexOf(subPhone);
            subPhoneList.splice(l,1);
            // Remove stream from DOM
            removeLists(stream);
            if(cmode==2){
                $("#remoteVideos_meet .videoContainerBlock").eq(0).addClass("remoteVideosActive").siblings().removeClass("remoteVideosActive");
                var BigScreenSrc=$("#remoteVideos_meet .videoContainerBlock.remoteVideosActive").find(".stream").attr("src");
                $("#_otherVideo video.stream").attr("src",BigScreenSrc);
            }
        });

        // 房间中流失败消息
        room.addEventListener("stream-failed", function (streamEvent){
            var stream = streamEvent.stream;
            var subPhone=stream.getAttributes().uin;
            var l=subPhoneList.indexOf(subPhone);
            subPhoneList.splice(l,1);
            console.log("Stream Failed, act accordingly");
            removeLists(stream);
        });

        //5. 连接上房间
        room.connect();

        _localStream.show("_otherVideo");
        _localStream.show("_myVideo");
    });
}

function removeLists(stream){
    if (stream.elementID !== undefined) {
        console.log("stream.elementID-------------------"+stream.elementID);
        for (var i = 0; i < $("#_videoClose_streamList div ul li").length; i++) {
            var meetingPhones = "test" +$("#_videoClose_streamList div ul li").eq(i).attr("streamid");
            if (meetingPhones == stream.elementID) {
                $("#_videoClose_streamList div ul li").eq(i).remove();
            }
        }
        $('#'+stream.elementID).remove();
    }
}

$("#joinMeetList").click(function(){
    if($("#choose_streamList").hasClass("showVideo-control-in")){
        $("#choose_streamList").toggleClass('showVideo-control-in showVideo-control-out');
    }
    $("#chooseMeetList").removeClass("controlClickNative");
    $("#videoClose_streamList").toggleClass('showVideo-control-in showVideo-control-out');
});
$("#chooseMeetList").click(function(){
    if($("#videoClose_streamList").hasClass("showVideo-control-in")){
        $("#videoClose_streamList").toggleClass('showVideo-control-in showVideo-control-out');
    }
    $("#joinMeetList").removeClass("controlClickNative");
    $("#choose_streamList").toggleClass('showVideo-control-in showVideo-control-out');
});

//operation after hang up meeting or end meeting
function meeting_leave_operation(){
    $('#localVideoContainer').addClass('displayNone');
    $("#videoClose_streamList ul").html("");
    $("#joinMeetList").addClass("displayNone");
    $("#videoClose_streamList,#choose_streamList").attr("class","showVideo-control-out");
    audio_called.pause();
    _startMeetingPhone=null;
    callNumbers = 0;
    haveMeeting = false;
    //停止捕获远程流，本地流不上传
    console.log("meeting_leave_operation,_localStream------------------"+_localStream);
    console.log(_localStream);
    if(_localStream!=null && _localStream!==""){
        room.unpublish(_localStream, function( result,error ) {
            console.log(result,error);
            if(result===undefined){
                console.log("Error unpublishing-------->",error);
                _localStream=null;
            }else{
                console.log(_localStream);
                console.log(_localStream.elementID);
                console.log("_localStream unpublished success！！！");
                _localStream.close();
                _localStream=null;
            }
        });
    }
    console.log("remoteStreams length--------------->"+remoteStreams.length);
    if(remoteStreams.length > 0){
        for(var i = 0; i < remoteStreams.length; i++){
            console.log(remoteStreams[i]);
            room.unsubscribe(remoteStreams[i], function (result,error) {
                room.disconnect();
                if(result === undefined){
                    console.log("--------->unsubscribe remote stream fail------------PCPlus!!!", error);
                    _localStream=null;
                }else{
                    console.log("--------->unsubscribe remote stream success------------PCPlus!!!");
                    _localStream=null;
                }
            });
        }
    }
    reloadVideoAreaStyle();
    stopCountTime();
}

//start meeting
function startMeeting(title,subject,type,cmode,id){
    var param;
    if(id){
        param={title:title, subject:subject, ctype:type,cmode:cmode,uinList:JSON.stringify(selectUin),id:id};
    }else{
        param={title:title, subject:subject, ctype:type,cmode:cmode,uinList:JSON.stringify(selectUin)};
    }
    console.log(param);
    if(_localStream!=null||_localStream!=null){
        layer.alert('你还在视频通话中，请先行挂断再试');
        return false;
    }
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/start',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data:param,
        dataType : "json",
        success: function(result) {
            console.log("========发起会议=========");
            callOrMeetingFlag=false;
            console.log(result);
            var data = result;
            if(data.code === 0){
                _startMeetingPhone=ownUin;
                console.log("发起会议人的邀请icode------------------->"+data.result.icode);
                client.subscribe("/vcsplat/meeting/"+data.result.icode,{qos:0});
                answerMeeting(data.result.icode);
                $("#hangUpButton span").html("结束");
                $("#chooseMeetList").removeClass("displayNone");
                var contacts = JSON.parse(sessionStorage.getItem('contactsList')),html='';
                for(var i=0;i<selectUin.length;i++){
                    for(var j=0;j<contacts.length;j++){
                        if(selectUin[i]===contacts[j].uin){
                            html+="<li uin="+selectUin[i]+"><div class='videoClose_fl'><div class='videoClose_fl'><img class='videoClose_fl' src='public/images/tuzi.png' alt=''></div><div class='videoClose_fl'><div>"+contacts[j].name+"</div>";
                            if(contacts[j].mobile){
                                html += "<div>"+contacts[j].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+"</div>";
                            }else{
                                html+="<div></div>";
                            }
                            html+="</div></div></li>";
                        }
                    }
                }
                $("#_choose_streamList ul").html(html);
            }else if(data.code===-2){
                layer.msg('用户未登录');
                history.go(0);
            }else{
                layer.msg(data.msg);
            }
        }
    })
}

function getTokenToJoinRoom(icode,result){
    console.log(result);
    console.log(_startMeetingPhone);
    var data = result;
    _startMeetingPhone=data.result.uin;
    console.log(data.result.ctype);
    var myDate = new Date();
    startTime=myDate.getTime();
    //挂断会议
    onMeetFlag=true;
    _noAnswerFlag=false;
    haveMeeting=true;
    callNumbers=1;
    $('#localVideoContainer').removeClass('displayNone');
    $('#myVideo').addClass('displayNone');
    $("#hangUpButton").unbind('click').bind('click',function(){
        client.unsubscribe("/vcsplat/meeting/"+icode);
        if(_startMeetingPhone===ownUin){
            var endTime=new Date().getTime();
            endMeeting(icode,endTime-startTime);//结束会议
        }else{
            hangUpMeeting(icode);//挂断会议
        }
    });
    $("#joinMeeting .in input").val("");
    //音视频配置
    var config;
    //config = { data: true, audio: true, video: true, frameRate: [15, 20], videoSize: [160, 120, 320, 240], attributes: {phone:ownUin,name:ownName}};
    if(data.result.ctype===2){
        config = { data: true, audio: true, video: false, frameRate: [15, 20], videoSize: [160, 120, 1080, 810], attributes: {uin:ownUin,name:ownName}};
    }else{
        config = { data: true, audio: true, video: true, frameRate: [15, 20], videoSize: [160, 120, 1080, 810], attributes: {uin:ownUin,name:ownName}};
    }
    //1. 获取本地视频流
    _localStream = Erizo.Stream(config);
    //调用创建token
    console.log("token----------------------->"+data.result.token);
    // 3. 加入房间 -> 返回房间
    room = Erizo.Room({token: data.result.token});
    //绑定本地媒体流到video标签用于输出
    $("#remoteVideos_area,#joinMeetList,#remoteVideos_control,.nav-control,#icodeButton").removeClass("displayNone");
    if(_startMeetingPhone===ownUin){
        $("#record,#controlVoice").removeClass("displayNone");
    }else{
        $("#applySpeak").removeClass("displayNone");
    }
    if(cmode===3){
        $("#remoteVideos_control,#localVideoContainer").addClass("displayNone");
        $("#remoteVideos_bottom").removeClass("displayNone");
        if( _startMeetingPhone!==ownUin){
            $("#applySpeak,#controlVideo,#controlVoice").addClass("displayNone");
        }
    }
    else if(cmode===1){
        if(_startMeetingPhone!==ownUin){
            $("#controlVoice").addClass("displayNone");
        }
        $("#controlVideo").addClass("displayNone");
    }else{
        $("#applySpeak").addClass("displayNone");
        $("#controlVideo").removeClass("displayNone");
    }
    //4. 添加监听
    onStream(data.result.config.ctype);

    //流初始化
    _localStream.init();
}
//answer meeting
function answerMeeting(icode){
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/answer',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {icode:icode},
        dataType : "json",
        success: function(_result) {
            console.log("token result----------------->"+_result);
            if(_result != null) {
                var result = _result;
                if(result.code === 0) {
                    console.log('=========加入视频会议=========');
                    $("#wait").addClass("displayNone");
                    $("body").attr("callOrMeeting","meeting");
                    $("#controlVideo").find("i").removeClass("icon-videooff").addClass("icon-video1");
                    $("#controlVoice").find("i").removeClass("icon-iconfrontmicrophonemute").addClass("icon-iconfontvoicefill");
                    $("#meetIcode").html(icode);
                    $("#_meetTheme").html(result.result.title);
                    $("#_meetName").html(result.result.subject);
                    getTokenToJoinRoom(icode,_result);
                } else {
                    errorTips(result.msg,'#addCode');
                    if(result.code ===2){
                        console.log("---------------->获取token失败");
                        layer.msg(result.msg,2,1);
                        failedList=[];
                        failedList.push(icode);
                        checkFailedList();
                        return false;
                    }if(result.code===-2){
                        layer.msg(result.msg,2,1);
                        history.go(0);
                        return false;
                    }
                }
            }
        }
    })

}
/**
 * 获取rtcs token
 * @param _params
 * @param _callback
 */
var failedList = [];
var tokenGetTimeout = -1;

function checkFailedList() {
    clearTimeout(tokenGetTimeout);
    if(failedList != null && failedList.length !== 0) {
        for(var i=0; i<failedList.length;i++) {
            tokenGetTimeout = setTimeout(function(){
                answerMeeting(failedList[i]);
            },2000);
        }
    }
}

//end meeting
function endMeeting(icode,duration){
    console.log('=============结束会议视频==============');
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/end',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {icode:icode, duration:duration},
        dataType : "json",
        success: function(result) {
            console.log("=======结束会议=======");
            var data = result;
            console.log(result);
            //停止捕获远程流，本地流不上传
            meeting_leave_operation();
            if(data.code === 0){
                layer.msg("会议结束");
                $('.meeting_info input').val('');
                $("#chooseList ul").html("");
                $('#starMeeting #selectList ul').html(meetListHtml);
                selectUin=[];
                selectMember();
                $("#chooseList").addClass("displayNone").removeClass("displayBlock");
            }
            $('#_otherVideo').html('');
        }
    })
}

//hang up meeting
function hangUpMeeting(icode){
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/hangup',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {icode:icode},
        dataType : "json",
        success: function(result) {
            console.log("=======挂断会议=======");
            console.log(result);
            var data = result;
            //停止捕获远程流，本地流不上传
            meeting_leave_operation();
            if(data.code === 0){
                layer.msg("挂断会议成功");
                $('#_otherVideo').html('');
            }
        }
    })
}

//refuse meeting
function refuseMeeting(icode){
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/refuse',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {icode:icode},
        dataType : "json",
        success: function(result) {
            console.log("=======拒绝会议=======");
            console.log(result);
            var data = result;
            _noAnswerFlag=false;
            haveMeeting=false;
            callNumbers=0;
            _startMeetingPhone = null;
            audio_called.pause();
            if(data.code == 0){
                layer.msg("拒绝成功");
                $("#wait").addClass("displayNone");
            }else{
                $('.infoTip').css('display','block');
                layer.msg("房主已结束会议");
                $("#wait").addClass("displayNone");
            }
        }
    })
}

//join meeting by invite code
$('#addCodeSure').bind("click",function () {
    if( _localStream!==null && _localStream!==""){
        layer.alert('你还在视频通话中，请先行挂断再试');
    }else{
        var icode = $('#addCode').val();
        if(icode==''){
            errorTips('请输入邀请码','#addCode');
        }else if(!(/^\d{6}$/).test(icode) || icode.match(/\s+/g) ){
            errorTips('邀请码输入有误(为六位数字)','#addCode');
        }else{
            answerMeeting(icode);
        }
    }
});

function reloadVideoAreaStyle(){
    $(".nav-control").addClass("displayNone");
    $("#remoteVideos_control").addClass("displayNone");
    $("#remoteVideos_control").addClass("displayNone");
    $(".nav-control .control-fs-2").removeClass("controlClickNative");
    $(".videoContainer_remote").remove();
    $("#icodeButton").addClass("displayNone");
    //$("#remoteVideos_area").addClass("displayNone");
    $("#hangUpButton span").html("挂断");
    /*document.getElementById("videoTimer").innerHTML = "00 : 00";*/
}
//录制
var recordingId;
$("#record").unbind("click").bind("click",function () {
    if($(this).hasClass("controlClickNative")){
        $(this).find("i").removeClass("color-red");
        $(this).find("span").html("录制结束");
        if(_localStream!==null && _localStream!==""){
            room.stopRecording(recordingId, function( result,error ) {
                console.log(result,error);
            })
        }
    }else{
        $(this).find("i").addClass("color-red");
        $(this).find("span").html("录制中");
        if(_localStream!==null && _localStream!==""){
            room.startRecording(_localStream, function( result,error ) {
                console.log(result,error);
                recordingId=result;

            });
        }
    }
})


