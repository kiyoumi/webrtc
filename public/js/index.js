/**
 * Created by ThinkPad on 2016/11/16.
 */
var host = ServerConfig.host;

var _localStream=null,recording,_noAnswerFlag=false,LOGINFlag=false,_callNumbers=0,_startMeetingPhone,haveMeeting=false;

var localStream = null;
var ownPhone,ownUin,selectUin=[],localAccount,ownName,ownPass,loginFlag=true,callOrMeetingFlag,contactsList,localContactsList,fromName,meetingInfo,noAnswerFlag=false,onMeetFlag=true,callingPhone=null;
var audio_called = document.getElementById('audio');
var audio_caller = document.getElementById('audio1');
var audio_noAnswer = document.getElementById('noAnswerAudio');
var audio_busyAudio = document.getElementById('busyAudio');
audio_called.loop=false;
audio_caller.loop=false;
audio_busyAudio.loop=false;
audio_noAnswer.loop=false;
var clearTimeOut1=-1;
var callNumbers=0;
var ownStreamSrc;
var remoteStreams=[],duration=0;
var subscribeNum=1;
var cmode;
var selectUinList=[];
// 4. 处理到来的信令
var pc,clientId,client=null;
var iceServer= {
    "iceServers": [{
        "urls": ["stun:v.sunniwell.net:3478"]
    }, {
    "urls": ["turn:v.sunniwell.net:3478?transport=udp", "turn:v.sunniwell.net:3478?transport=tcp"],
        "credential": "sunniwell",
        "username": "sunniwell"
    }]
    ,"iceTransportPolicy": "all"
};

function getConnect() {
    var mqttOpts = {
        host:'172.16.36.242',
        port: 28083,
        path:'/mqtt',
        username: clientId.toString(),
        password: sessionStorage.getItem("token").split(" ")[1],
        clientId: clientId.toString()
    };
    client=mqtt.connect(mqttOpts);
    console.log(client);
    client.subscribe(["/vcsplat/vchat/+/"+clientId,"/vcsplat/meeting/+/"+clientId],{qos:0});
    client.on('message', function (topic, message) {
        console.log("topic:" + topic);
        console.log(message.toString());
        var data=JSON.parse(message.toString());
        console.log(topic.indexOf('vchat')!==-1);
        if(topic.indexOf('vchat')!==-1){
            if(data.code===0){
                console.log("99");
                switch (data.result.vchatType){
                    case 1:
                        //1-拨打电话
                        console.log("callNumbers"+callNumbers);
                        callNumbers++;
                        if(callNumbers===1){
                            $("#remoteVideos_area").removeClass("displayNone");
                            callingPhone=data.result.uin;
                            noAnswerFlag=true;
                            if(localStream!==null && localStream!==""){
                                client.publish('/vcsplat/vchat/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"正在通话中","result":{"sid":'+data.result.sid+',"vchatType":5,"uin":'+data.result.touin+',"touin":'+data.result.uin+'}}');
                            }else{
                                audio_called.volume=1;
                                audio_called.loop=true;
                                audio_called.currentTime=0;
                                audio_called.play();
                                getInfo(data.result.uin,function(fromName){
                                    console.log(fromName);
                                    $("#wait .name").html(fromName);
                                });
                                $("#wait .waitTip").html("邀请你进行视频聊天...");
                                $("#wait").removeClass("displayNone");
                                $("#calledAnswer").unbind().bind("click",function(){
                                    answerPhone(data.result.uin,data.result.sid,data.result.touin);
                                });
                                $("#refuseHangUp").unbind().bind("click",function(){
                                    refusePhone(data.result.touin,data.result.uin,data.result.sid);
                                });
                                var dialTime=0;
                                var time=function(target){
                                    var _time=setTimeout(function() {
                                        time(target)
                                    },1000);
                                    dialTime++;
                                    if(dialTime===20){
                                        clearTimeout(_time);
                                        if(localStream==null && noAnswerFlag){
                                            client.publish("/vcsplat/vchat/"+clientId+"/"+data.result.uin,"无人接听消息");
                                            audio_called.pause();
                                            $("#wait").addClass("displayNone");
                                            window.setTimeout(function (){
                                                getCallRecords_withLocalContacts();
                                            }, 2500);
                                        }
                                    }
                                    if(!noAnswerFlag){
                                        clearTimeout(_time);
                                    }
                                };
                                time();
                            }
                        }else{
                            client.publish('/vcsplat/vchat/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"正在通话中","result":{"sid":'+data.result.sid+',"vchatType":5,"uin":'+data.result.touin+',"touin":'+data.result.uin+'}}');
                        }
                        break;
                    case 2:
                        //2-接受通话
                        createOffer(data.result.uin,data.result.sid);
                        break;
                    case 3:
                        //3-拒绝通话
                        hangUp("对方拒绝了你的视频聊天邀请",false);
                        break;
                    case 4:
                        //4-结束通话
                        if((callingPhone === data.result.uin)&& (_startMeetingPhone == null)){
                            if(localStream==null || localStream==""){
                                noAnswerFlag=false;
                                audio_called.pause();
                                layer.msg("对方已取消，聊天结束");
                                $('#localVideoContainer').addClass('displayNone');
                                $(".nav-control .control-fs-2").removeClass("controlClickNative");
                                $(".nav-control").addClass("displayNone");
                                $("#remoteVideos_control").addClass("displayNone");
                                $("#myVideo").attr("src","");
                                $("#otherVideo").attr("src","");
                                $("#wait").addClass("displayNone");
                                callNumbers=0;
                            }else{
                                hangUp("对方已挂断，聊天结束",true);
                            }
                            window.setTimeout(function (){
                                getCallRecords_withLocalContacts();
                            }, 2500);
                        }
                        break;
                    case 5:
                        //5-正在通话
                        $("body").attr("callBusy","true");
                        layer.open({
                            type: 1
                            ,title: '信息'
                            ,shade: 0
                            ,btn: ['确定']
                            ,moveType: 1 //拖拽模式，0或者1
                            ,content: '<div style="padding:20px 80px;">对方正在通话中</div>'
                            ,yes: function(){
                                layer.closeAll();
                                audio_busyAudio.pause();
                                hangUp('聊天结束',false);
                            }
                        });
                        //layer.alert('对方正在通话中');
                        audio_busyAudio.volume=1;
                        audio_busyAudio.loop=true;
                        audio_busyAudio.currentTime=0;
                        audio_busyAudio.play();
                        break;
                    case 6:
                        // 6-offer
                        console.log(typeof data.msg);
                        pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.msg)));
                        //向PeerConnection中加入需要发送的流
                        console.log("localStream33333333333------------------"+localStream);
                        if(localStream==null){
                            showLocalVideo(false,true,data.result.uin,data.result.sid);
                        }else{
                            pc.addStream(localStream);
                            //发送ICE候选到其他客户端
                            pc.onicecandidate = OnIcecandidateCbGen(ownUin,data.result.uin,8,data.result.sid);
                            pc.createAnswer(pcCreateCbGen(pc, ownUin,data.result.uin, 7,data.result.sid), pcCreateErrorCb);
                        }
                        break;
                    case 7:
                        //7-answer
                        pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.msg)));
                        break;
                    case 8:
                        //8-candidate
                        pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.msg)));
                        break;
                }
            }else{
                layer.msg(data.msg);
            }
        }
        else if(topic.indexOf('meeting')!==-1){
            //会议
            console.log("视频会议消息");
            console.log(data);
            var icode,title,subject;
            var json_data = data;
            console.log("json_data");
            console.log(json_data);
            var fromWhoPhone=json_data.result.uin;
            switch(json_data.result.meetingType) {
                case -1:
                    //其它消息
                    console.log('其它消息');
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"不在线");
                    });
                    break;
                case 1:
                    //预约会议消息
                    cmode=json_data.result.params.config.cmode;
                    callNumbers++;
                    if(callNumbers==1){
                        haveMeeting=true;
                        _noAnswerFlag=true;
                        _startMeetingPhone=json_data.result.uin;
                        icode = json_data.result.params.icode;
                        title = json_data.result.params.title;
                        subject = json_data.result.params.subject;
                        if(cmode!=3){
                            $('#remoteVideos_area').removeClass('displayNone');
                        }
                        $("#wait").removeClass("displayNone");
                        getInfo(fromWhoPhone,function(fromName){
                            $("#wait .name").html(fromName);
                        });
                        if(json_data.result.params.config.ctype==2){
                            $("#wait .waitTip").html("邀请你加入语音会议...");
                        }else{
                            $("#wait .waitTip").html("邀请你加入视频会议...");
                        }
                        callOrMeetingFlag=false;
                        audio_called.volume=1;
                        audio_called.loop=true;
                        audio_called.currentTime=0;
                        audio_called.play();
                        //加入会议
                        $("#calledAnswer").unbind().bind('click',function(){
                            setCookie();
                            //console.log("接受会议邀请icode------------------->"+icode);
                            answerMeeting(icode);
                            audio_called.pause();
                        });
                        //拒绝会议
                        $('#refuseHangUp').unbind().bind("click",function () {
                            setCookie();
                            refuseMeeting(icode);
                        });
                        var dialTime=0;
                        var time=function(target){
                            var _time1=setTimeout(function() {
                                time(target)
                            },1000);
                            dialTime++;
                            if(dialTime===30){
                                clearTimeout(_time1);
                                if(_localStream==null && _noAnswerFlag){
                                    audio_called.pause();
                                    $("#wait").addClass("displayNone");
                                    refuseMeeting(icode);
                                    _startMeetingPhone = null;
                                    callNumbers = 0;
                                }
                            }
                            if(!_noAnswerFlag){
                                clearTimeout(_time1);
                            }
                        };
                        time();
                    }else{
                        getInfo(fromWhoPhone,function(fromName){
                            infoTips("消息提示："+fromName+"邀请你加入会议",6);
                        });
                    }
                    break;
                case 2:
                    //取消预约消息
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"加入会议");
                    });
                    break;
                case 3:
                    //邀请会议消息
                    cmode=json_data.result.params.config.cmode;
                    icode = json_data.result.params.icode;
                    client.subscribe("/vcsplat/meeting/"+icode,{qos:0});
                    callNumbers++;
                    if(callNumbers==1){
                        haveMeeting=true;
                        _noAnswerFlag=true;
                        _startMeetingPhone=json_data.result.uin;
                        title = json_data.result.params.title;
                        subject = json_data.result.params.subject;
                        if(cmode!==3){
                            $('#remoteVideos_area').removeClass('displayNone');
                        }
                        $("#wait").removeClass("displayNone");
                        getInfo(fromWhoPhone,function(fromName){
                            $("#wait .name").html(fromName);
                        });
                        if(json_data.result.params.config.ctype==2){
                            $("#wait .waitTip").html("邀请你加入语音会议...");
                        }else{
                            $("#wait .waitTip").html("邀请你加入视频会议...");
                        }
                        callOrMeetingFlag=false;
                        audio_called.volume=1;
                        audio_called.loop=true;
                        audio_called.currentTime=0;
                        audio_called.play();
                        //加入会议
                        $("#calledAnswer").unbind().bind('click',function(){
                            setCookie();
                            //console.log("接受会议邀请icode------------------->"+icode);
                            answerMeeting(icode);
                            audio_called.pause();
                        });
                        //拒绝会议
                        $('#refuseHangUp').unbind().bind("click",function () {
                            setCookie();
                            refuseMeeting(icode);
                        });
                        var dialTime=0;
                        var time=function(target){
                            var _time1=setTimeout(function() {
                                time(target)
                            },1000);
                            dialTime++;
                            if(dialTime===30){
                                clearTimeout(_time1);
                                if(_localStream==null && _noAnswerFlag){
                                    audio_called.pause();
                                    $("#wait").addClass("displayNone");
                                    refuseMeeting(icode);
                                    _startMeetingPhone = null;
                                    callNumbers = 0;
                                }
                            }
                            if(!_noAnswerFlag){
                                clearTimeout(_time1);
                            }
                        };
                        time();
                    }else{
                        getInfo(fromWhoPhone,function(fromName){
                            infoTips("消息提示："+fromName+"邀请你加入会议",6);
                        });
                    }
                    break;
                case 4:
                    //接入会议消息
                    if(fromWhoPhone!==ownUin){
                        getInfo(fromWhoPhone,function(fromName){
                            layer.msg(fromName+"加入会议");
                        });
                    }
                    break;
                case 5:
                    //处理拒绝消息
                    console.log("拒绝会议消息");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"拒绝加入会议");
                    });
                    break;
                case 6:
                    //处理挂断消息
                    console.log("挂断会议通话");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"退出会议");
                    });
                    subscribeNum=1;
                    break;
                case 7:
                    //房主结束会议消息
                    if(fromWhoPhone===_startMeetingPhone){
                        haveMeeting=false;
                        meeting_leave_operation();
                        callNumbers=0;
                        subscribeNum=1;
                        _noAnswerFlag=false;
                        layer.msg("会议结束");
                        $("#wait").addClass("displayNone");
                        $('#_otherVideo').html('');
                    }
                    break;
                case 8:
                    //正在通话中
                    console.log("----------------会议消息，用户正在通话中");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"正在通话中");
                    });
                    break;
                case 9:
                    //配置消息
                    console.log("----------------会议消息，配置修改消息");
                    console.log(json_data.result.params.config);
                    cmode=json_data.result.params.config.cmode;
                    //ctype=json_data.content.result.config.ctype;
                    //{"touinlist":[0],"fromuin":10126,"type":3,"content":{"msg":"配置消息","code":7,"result":{"config":{"speaker":"10254"}}}}

                    break;
                case 101:
                    //麦克风禁用消息
                    console.log("----------------会议消息，麦克风禁用消息");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"同意禁用麦克风");
                    });
                    break;
                case 102:
                    //麦克风启用消息
                    console.log("----------------会议消息，麦克风启用消息");
                    $("#applySpeak").removeClass("controlClickNative");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"同意启用麦克风");
                    });
                    client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"麦克风启用消息","result":{"meetingType":113,"params":{"config":{"speaker":'+ownUin+'}},"uin":'+json_data.result.touin+',"touin":'+json_data.result.uin+'}}');
                    //emitData(ownUin,[],SignalingDataType._MEETING,{code:113,msg:"麦克风启用消息","result":{"config":{}}});
                    break;
                case 103:
                    //视频禁用消息
                    console.log("----------------会议消息，视频禁用消息");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"同意禁用视频");
                    });
                    break;
                case 104:
                    //视频启用消息
                    console.log("----------------会议消息，视频启用消息");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"同意启用视频");
                    });
                    client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"用户视频启用成功消息","result":{"meetingType":114,"uin":'+json_data.result.touin+',"touin":'+json_data.result.uin+'}}');
                    //emitData(ownUin,[],SignalingDataType._MEETING,{code:114,msg:"视频启用消息","result":{"config":{"speaker":ownUin}}});
                    break;
                case 105:
                    //申请启用麦克风消息
                    console.log("----------------会议消息，申请启用麦克风消息");
                    getInfo(fromWhoPhone,function(fromName){
                        var touinList=[];
                        touinList.push(fromWhoPhone);
                        layer.confirm(fromName+'申请启用麦克风消息', {
                            btn: ['同意', '拒绝']   //按钮,
                            ,shade:false
                        }, function(index){
                            layer.close(index);
                            client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"接受申请启用麦克风","result":{"meetingType":107,"uin":'+json_data.result.touin+',"touin":'+json_data.result.uin+'}}');
                        }, function(Index){
                            layer.close(Index);
                            client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"拒绝申请启用麦克风","result":{"meetingType":108,"uin":'+json_data.result.touin+',"touin":'+json_data.result.uin+'}}');
                            //emitData(ownUin,touinList,SignalingDataType._MEETING,{code:108,msg:"申请启用麦克风拒绝消息"});
                        });
                    });
                    break;
                case 106:
                    //申请启用视频消息
                    console.log("----------------会议消息，申请启用视频消息");
                    getInfo(fromWhoPhone,function(fromName){
                        var touinList=[];
                        touinList.push(fromWhoPhone);
                        layer.confirm(fromName+'申请启用视频消息', {
                            btn: ['同意', '拒绝'] //按钮
                            ,shade:false
                        }, function(index){
                            layer.close(index);
                            client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"视频启用消息","result":{"meetingType":104,"uin":'+json_data.result.touin+',"touin":'+json_data.result.uin+'}}');
                            //emitData(ownUin,touinList,SignalingDataType._MEETING,{code:104,msg:"视频启用消息"});
                        }, function(Index){
                            layer.close(Index);
                        });
                    })
                    break;
                case 107:
                    //申请启用麦克风接受消息
                    console.log("----------------会议消息，申请启用麦克风接受消息");
                    if(json_data.result.touin === ownUin){
                        getInfo(fromWhoPhone,function(fromName){
                            layer.msg(fromName+"同意您启用麦克风");
                        });
                        $("#applySpeak").removeClass("controlClickNative");
                    }
                    for(var l=0;l<remoteStreams.length;l++){
                        console.log(remoteStreams[l].getAttributes().uin);
                        if(fromWhoPhone === remoteStreams[l].getAttributes().uin){
                            remoteStreams[l].stream.getAudioTracks().forEach(function(track) {
                                track.enabled=false;
                            });
                        }else if(json_data.result.touin === remoteStreams[l].getAttributes().uin){
                            remoteStreams[l].stream.getAudioTracks().forEach(function(track) {
                                track.enabled=true;
                            });
                        }
                    }
                    if(json_data.result.touin === ownUin) {
                        console.log(localStream);
                        console.log(_localStream);
                        _localStream.stream.getAudioTracks().forEach(function (track) {
                            track.enabled = true;
                        });
                    }
                    break;
                case 108:
                    //申请启用麦克风拒绝消息
                    console.log("----------------会议消息，申请启用麦克风拒绝消息");
                    if(json_data.result.touin === ownUin){
                        getInfo(fromWhoPhone,function(fromName){
                            layer.msg(fromName+"拒绝您启用麦克风");
                        });
                        $("#applySpeak").removeClass("controlClickNative");
                    }
                    break;
                case 109:
                    //申请启用视频接受消息
                    console.log("----------------会议消息，申请启用视频接受消息");
                    if(json_data.result.touin === ownUin){
                        getInfo(fromWhoPhone,function(fromName){
                            layer.msg(fromName+"同意您启用视频");
                        });
                    }
                    for(var i=0;i<remoteStreams.length;i++){
                        console.log(remoteStreams[i].getAttributes().uin);
                        if(fromWhoPhone === remoteStreams[i].getAttributes().uin){
                            remoteStreams[i].stream.getVideoTracks().forEach(function(track) {
                                track.enabled=false;
                            });
                        }else if(json_data.result.touin === remoteStreams[i].getAttributes().uin){
                            remoteStreams[i].stream.getVideoTracks().forEach(function(track) {
                                track.enabled=true;
                            });
                        }
                    }
                    if(json_data.result.touin === ownUin){
                        _localStream.stream.getVideoTracks().forEach(function(track) {
                            track.enabled=true;
                        });
                    }
                    break;
                case 110:
                    //申请启用视频拒绝消息
                    console.log("----------------会议消息，申请启用视频拒绝消息");
                    if(json_data.result.touin === ownUin){
                        getInfo(fromWhoPhone,function(fromName){
                            layer.msg(fromName+"拒绝您启用视频");
                        });
                    }
                    break;
                case 111:
                    //用户麦克风被禁用成功消息
                    console.log("----------------会议消息，用户麦克风被禁用成功消息");
                    getInfo(json_data.result.touin,function(fromName){
                        layer.msg(fromName+"麦克风被禁用");
                    });
                    if(json_data.result.touin === ownUin){
                        console.log(localStream);
                        console.log(_localStream);
                        _localStream.stream.getAudioTracks().forEach(function(track) {
                            track.enabled=false;
                        });
                    }
                    break;
                case 112:
                    //用户视频被禁用成功消息
                    console.log("----------------会议消息，用户视频被禁用成功消息");
                    getInfo(json_data.result.touin,function(fromName){
                        layer.msg(fromName+"视频被禁用");
                    });
                    if(json_data.result.touin === ownUin){
                        _localStream.stream.getVideoTracks().forEach(function(track) {
                            track.enabled=false;
                        });
                    }
                    break;
                case 113:
                    //用户麦克风启用成功消息
                    console.log("----------------会议消息，用户麦克风启用成功消息");
                    getInfo(json_data.result.touin,function(fromName){
                        layer.msg(fromName+"麦克风启用成功");
                    });
                    if(json_data.result.touin === ownUin){
                        _localStream.stream.getAudioTracks().forEach(function(track) {
                            track.enabled=true;
                        });
                    }
                    break;
                case 114:
                    //用户视频启用成功消息
                    console.log("----------------会议消息，用户视频启用成功消息");
                    getInfo(json_data.result.touin,function(fromName){
                        layer.msg(fromName+"视频启用成功");
                    });
                    if(json_data.result.touin === ownUin){
                        _localStream.stream.getVideoTracks().forEach(function(track) {
                            track.enabled=true;
                        });
                    }
                    break;
                case 115:
                    //被踢出视频会议消息
                    console.log("----------------会议消息，被踢出视频会议消息");
                    haveMeeting=false;
                    meeting_leave_operation();
                    callNumbers=0;
                    subscribeNum=1;
                    _noAnswerFlag=false;
                    getInfo(json_data.touinlist[0],function(fromName){
                        layer.msg(fromName+"被踢出视频会议");
                    });
                    $('#_otherVideo').html('');
                    break;
                case 116:
                    //主控邀请发言消息
                    console.log("----------------会议消息，主控邀请发言");
                    getInfo(fromWhoPhone,function(fromName){
                        var touinList=[];
                        touinList.push(fromWhoPhone);
                        layer.confirm(fromName+'邀请发言消息', {
                            btn: ['同意', '拒绝'] //按钮
                            ,shade:false
                        }, function(index){
                            layer.close(index);
                            client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"麦克风启用消息","result":{"meetingType":102,"uin":'+json_data.result.touin+',"touin":'+json_data.result.uin+'}}');
                            //client.publish('/vcsplat/meeting/'+clientId+'/'+data.result.uin,'{"code":0,"msg":"麦克风启用消息","result":{"meetingType":102,"params":{"config":{"cmode":1,"ctype":1},"icode":"703500","subject":"r","title":"r"},"touin":'+data.result.touin+',"uin":'+data.result.uin+'}}');
                            //emitData(ownUin,touinList,SignalingDataType._MEETING,{code:102,msg:"麦克风启用消息"});
                        }, function(Index){
                            layer.close(Index);
                        });
                    });
                    break;
                case 117:
                    //主会场要求结束分会场发言消息
                    console.log("----------------会议消息，主会场要求结束分会场发言");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"主会场要求结束分会场发言");
                    });
                    break;
                case 118:
                    //发言者邀请发言成功
                    console.log("----------------会议消息，发言者开始发言");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"发言者开始发言");
                    });
                    break;
                case 119:
                    //发言者结束发言
                    console.log("----------------会议消息，发言者结束发言");
                    getInfo(fromWhoPhone,function(fromName){
                        layer.msg(fromName+"发言者结束发言");
                    });
                    break;
                case 120:
                    //拒绝发起者的发言邀请
                    console.log("----------------会议消息，发言者结束发言");
                    getInfo(json_data.touinlist[0],function(fromName){
                        layer.msg(fromName+"拒绝发起者的发言邀请");
                    });
                    break;
                default:
                    $("#wait").css({"display":"none","left":"100%"});
                    $("#OnMeet").css({"display":"none","left":"100%"});
                    $(".main").css("display","block");
                    break;
            }
        }

    });
}

// 创建offer和anwser 成功回调函数
// pc peerconnect连接 toid 消息发送给谁, 即谁的id
var pcCreateCbGen = function(cur_pc, from, to, type,sid) {
    return function(session_desc) {
        console.log("session_desc"+JSON.stringify(session_desc));
        cur_pc.setLocalDescription(session_desc);
        var peerMessage = {},result = {};
        peerMessage.code = 0;
        peerMessage.msg = JSON.stringify(session_desc);
        result.sid=sid;
        result.vchatType=type;
        result.uin=from;
        result.touin=to;
        peerMessage.result = result;
        if(session_desc!==null){
            client.publish('/vcsplat/vchat/'+clientId+'/'+to, JSON.stringify(peerMessage));
        }
    };
};

// 创建offer和anwser  失败回调函数
var pcCreateErrorCb = function(error) {
    console.log("Failure callback:" + error);
};

// icecandidate 处理
var OnIcecandidateCbGen = function( from, to, type,sid ) {
    return function(event) {
        console.log("======onicecandidate "+JSON.stringify(event.candidate));
        //通过服务器转发给对方
        var iceMessage = {},result = {};
        iceMessage.code = 0;
        iceMessage.msg = JSON.stringify(event.candidate);
        result.sid=sid;
        result.vchatType=type;
        result.uin=from;
        result.touin=to;
        iceMessage.result = result;
        if (event.candidate !== null) {
            client.publish('/vcsplat/vchat/'+clientId+'/'+to, JSON.stringify(iceMessage));
            //client.publish('/vcsplat/vchat/'+clientId+'/'+to,'{"code":0,"msg":"'+event.candidate+'","result":{"sid":'+sid+',"vchatType":'+type+',"uin":'+from+',"touin":'+to+'}}');
        }
    };
};

function createOffer(touin,sid) {
    pc = new RTCPeerConnection(iceServer);
    pc.oniceconnectionstatechange = function(event) {
        console.log(event);
        if (pc.iceConnectionState === "failed") {
            // Handle the failure
            console.log("连接超时");
            if(callingPhone==calledPhone){
                var offerOptions = {
                    offerToReceiveAudio: 1,
                    offerToReceiveVideo: 1
                };
                offerOptions.iceRestart = true;
                pc.onicecandidate = OnIcecandidateCbGen( ownUin,touin, 8,sid);
                pc.createOffer( pcCreateCbGen( pc, ownUin,touin, 6,sid), pcCreateErrorCb);
            }
        }
    };

    // 3. 如果检测到媒体流连接到本地，将其绑定到一个video标签上输出
    pc.onaddstream = function(event) {
        // 监听到流加入
        document.getElementById('otherVideo').muted=false;
        console.log("===pc.onaddstream " + event,event.stream);
        document.getElementById('otherVideo').src = URL.createObjectURL(event.stream);
        $('#localVideoContainer,#myVideo,#remoteVideos_control').removeClass('displayNone');
        $("#myVideo").attr("src",ownStreamSrc);
        callVideoSwitch();
    };
    console.log(localStream);
    if(localStream){
        pc.addStream(localStream);
    }
    //2. 发送ICE候选到其他客户端
    console.log("---------------上传本地流成功");
    pc.onicecandidate = OnIcecandidateCbGen( ownUin,touin, 8,sid);
    //3. 如果是发起方则发送一个offer信令 创建offer
    pc.createOffer( pcCreateCbGen( pc, ownUin,touin,6,sid), pcCreateErrorCb);
    audio_caller.pause();
    onMeetFlag=true;
    hangButton(touin,sid,ownUin);
}

function showLocalVideo(callerFlag,type,touin,sid){
    console.log(callerFlag,type,touin,sid);
    // 1. 获取本地音频和视频流
    navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    navigator.getUserMedia({
        "audio": true,
        "video": true
    }, function(stream) {
        document.getElementById('myVideo').muted=true;
        document.getElementById('otherVideo').muted=true;
        $("body").attr("callOrMeeting","call");
        localStream = stream;
        console.log("showLocalVideo"+pc);
        //绑定本地媒体流到video标签用于输出
        ownStreamSrc=URL.createObjectURL(stream);
        if(callerFlag){
            document.getElementById('otherVideo').src = ownStreamSrc;
        }else{
            document.getElementById('myVideo').src = ownStreamSrc;
        }
        if(type){
            pc.addStream(localStream);
            //发送ICE候选到其他客户端
            pc.onicecandidate = OnIcecandidateCbGen(ownUin, touin,8,sid);
            pc.createAnswer(pcCreateCbGen(pc,ownUin,touin,7,sid),pcCreateErrorCb);
        }
    }, function(error) {
        //处理媒体流创建失败错误
        console.log('getUserMedia error: ' + error);
        layer.msg("获取本地流失败，检查是否开启麦克风和摄像头的权限");
    });
}

//获取联系人列表
var contactListHtml,meetListHtml;
function getContactList(){
    $.ajax({
        type: 'GET',
        url: host+'apis/userInfo/getContactsList',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data:{pageIndex:0,pageSize:99999},
        success: function(result) {
            console.log("========获取联系人=========");
            console.log(result);
            var data = result;
            if(data.code === 0){
                sessionStorage.setItem("contactsList",JSON.stringify(data.result));
                console.log(sessionStorage.getItem("contactsList"));
                $("#contactList ul,#selectList ul,.selectList ul").html('');
                var init = data.result;
                var num = 0;
                var initials = [];
                for(var i = 0 ; i < init.length; i ++){
                    var str = init[i].initial.toUpperCase().substr(0, 1);
                    if(str>='A'&&str<='Z'){
                        if(initials.indexOf(str) === -1){
                            initials.push(str);
                        }
                    }else{
                        num ++;
                    }
                }
                initials=initials.sort();
                $.each(initials, function(index, value) {//添加首字母标签
                    $("#contactList ul").append('<li class="tag" id="list_'+ value +'">' + value + '</li>');
                    $('#selectList ul').append('<li class="tag" id="select_'+ value +'">' + value + '</li>');
                });
                if(num!==0){
                    $("#contactList ul").append('<li class="tag" id="default">#</li>');
                    $("#selectList ul").append('<li class="tag" id="selectDefault">#</li>');
                }
                if(init){
                    if(init.length > 0){
                        for(var j = 0; j < init.length ; j++){
                            if(init[j].uin===ownUin){
                            }else{
                                var s = init[j].initial.toUpperCase().substr(0, 1);
                                var Html = '';
                                var html = '';
                                //联系人
                                Html += '<li class="contact" uin='+init[j].uin+'><div class="contactHead_portrait">';
                                Html += '<img src="public/images/tuzi.png"/></div>';
                                Html += '<div class="contact_info"><p class="contactName">'+init[j].nickname+'</p>';
                                if(init[j].mobile){
                                    Html += '<p class="contactPhone">'+init[j].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+'</p></div>';
                                }else{
                                    Html += '<p class="contactPhone"></p></div>';
                                }
                                Html += '<div class="call"><a>拨打</a></div>';
                                //会议选择
                                if(init[j].mobile){
                                    html += '<li class="contact" phone="'+init[j].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+'" uin="'+init[j].uin+'"><div class="selectBox">';
                                }else{
                                    html += '<li class="contact" phone="" uin="'+init[j].uin+'"><div class="selectBox">';
                                }
                                html += '<i class="iconfont icon-roundcheckfill"></i></div>';
                                html += '<div class="contactHead_portrait"><img src="public/images/tuzi.png"/></div>';
                                html += '<div class="contact_info"><p class="contactName">'+init[j].nickname+'</p>';
                                if(init[j].mobile){
                                    html += '<p class="contactPhone">'+init[j].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+'</p></div></li>';
                                }else{
                                    html += '<p class="contactPhone"></p></div></li>';
                                }
                                if(s>='A'&&s<='Z'){
                                    $('#list_'+s).after(Html);
                                    $('#select_'+s).after(html);
                                }else{
                                    $('#default').after(Html);
                                    $('#selectDefault').after(html);
                                }
                            }
                        }
                        contactListHtml=$("#contactList ul").html();
                        meetListHtml=$("#selectList ul").html();
                        $("#order .selectList ul").html(meetListHtml);
                        theContactDetail();
                        //recordCall();
                        selectMember();
                        getMeetingInfo();
                        //获取会议回看列表
                        //getRecordInfo();
                        getCallRecords_withLocalContacts();
                    }
                }
            }
        }
    })
}

//get call records
function getCallRecords_withLocalContacts(){
    console.log("getCallRecords_withLocalContacts"+ownUin);
    localContactsList=JSON.parse(sessionStorage.getItem('contactsList'));
    console.log(localContactsList);
    if(localContactsList!==null && localContactsList!=="" && localContactsList.length>0){
        if(ownUin!==null && ownUin!==""){
            getCallRecord(ownUin,localContactsList);
        }
    }
}

//get call record
function getCallRecord(localPhone,contactList){
    $.ajax({
        type: 'GET',
        url: host + 'apis/vchat/list',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {pageindex:0, pagesize:'10000'},
        success: function (data) {
            console.log("========获取通话记录========="+data);
            console.log(data);
            $('#call_records_list ul').html('');
            if(data.result && data.result.list.length>0){
                localStorage.setItem("webrtc_webMobile_callRecords",JSON.stringify(data.result.list));
                if(data.result.list.length>50){
                    callRecordList(data.result.list,contactList,50);
                }else{
                    callRecordList(data.result.list,contactList,data.result.list.length);
                }
            }
        }
    })
}

var n_sec = 1; //秒
var n_min = 0; //分
var n_hour = 0; //时
var videoTime,startTime,timeCountFunction;
var timeLongth=0;
function videoTimeCount(){
    var str_sec = n_sec;
    var str_min = n_min;
    var str_hour = n_hour;
    if ( n_sec < 10) {
        str_sec = "0" + n_sec;
    }
    if ( n_min < 10 ) {
        str_min = "0" + n_min;
    }

    if ( n_hour < 10 ) {
        str_hour = "0" + n_hour;
    }
    n_sec++;
    if (n_sec > 59){
        n_sec = 0;
        n_min++;
    }
    if (n_min > 59) {
        n_sec = 0;
        n_hour++;
    }
    if (n_hour===0){
        videoTime =  str_min + " : " + str_sec;
    }else{
        videoTime = str_hour + " : " + str_min + " : " + str_sec;
    }
    /*document.getElementById("videoTimer").innerHTML = videoTime;*/
    timeLongth++;
}
function stopCountTime(){ //停止计时
    clearInterval(timeCountFunction);
    n_sec = 1;
    n_min = 0;
    n_hour = 0;
    timeLongth=0;
}
function timeCount() {
    /*document.getElementById("videoTimer").innerHTML = "00 : 00";*/
    timeCountFunction=setInterval(videoTimeCount,1000);
    return timeCountFunction;
}

//notify being offline
function notifyReLogin(){
    socket.on("/rtcsvr/notify/user",function(result){
        var data=JSON.parse(result);
        console.log(data);
        if(data.content.code===1 && data.type!==2){
            layer.confirm('你的账号在别的地方登陆,被迫下线', {
                btn: ['确认'] //按钮
                ,end: function(){
                    var _userSaveInfo=JSON.parse(localStorage.getItem('userSaveInfo'));
                    _userSaveInfo.automaticLogin=false;
                    localStorage.setItem("userSaveInfo",JSON.stringify(_userSaveInfo));
                    clearCookie();
                    history.go(0);
                }
            }, function(){
                history.go(0);
            })
        }else if(data.type==2 && data.content.code==1 && data.content.msg=="邀请会议消息"){
            if(data.content.result.ctype==2){
                $("#wait .waitTip").html("邀请你加入语音会议...");
            }else{
                $("#wait .waitTip").html("邀请你加入视频会议...");
            }
            window.setTimeout(function(){
                haveMeeting=true;
                _noAnswerFlag=true;
                _startMeetingPhone = data.fromuin;
                var icode = data.content.result.icode;
                $('#remoteVideos_area').removeClass('displayNone');
                $("#wait").removeClass("displayNone");
                getInfo( data.fromuin,function(fromName){
                    $("#wait .name").html(fromName);
                });
                callOrMeetingFlag=false;
                audio_called.volume=1;
                audio_called.loop=true;
                audio_called.currentTime=0;
                audio_called.play();
                //加入会议
                $("#calledAnswer").unbind().bind('click',function(){
                    console.log("接受会议邀请icode------------------->"+icode);
                    answerMeeting(icode);
                    audio_called.pause();
                });
                //拒绝会议
                $('#refuseHangUp').unbind().bind("click",function () {
                    refuseMeeting(icode);
                });
                var dialTime=0;
                var time=function(target){
                    var _time1=setTimeout(function() {
                        time(target)
                    },1000);
                    dialTime++;
                    if(dialTime===30){
                        clearTimeout(_time1);
                        if(_localStream==null && _noAnswerFlag){
                            audio_called.pause();
                            //$('#remoteVideos_area').addClass('displayNone');
                            $("#wait").addClass("displayNone");
                            refuseMeeting(icode);
                            _startMeetingPhone = null;
                            callNumbers = 0;
                        }
                    }
                    if(!_noAnswerFlag){
                        clearTimeout(_time1);
                    }
                };
                time();
            },1000);

        }
    })
}

//检测拨打的是否为自己的uin
function call_ifMyself(name,uin,type){
    console.log(name,uin,ownUin,type);
    if(uin===ownUin){
        layer.alert("不能拨打本机号码");
    }else{
        callUp(uin,name);
    }
}

/*call*/
var calledPhone=null;
function callUp(touin,name){
    console.log(touin,name,localStream,_localStream,callNumbers);
    if(localStream!=null||_localStream!=null || callNumbers==1){
        layer.alert('你还在视频通话中，请先行挂断再试');
        return false;
    }
    callNumbers = 1;
    console.log(ownUin,touin);
    $.ajax({
        type: 'POST',
        url: host+'apis/vchat/request',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {touin:touin},
        dataType : "json",
        success: function(result) {
            console.log("=====发起消息=====");
            console.log(result);
            switch(result.code){
                case 0:
                    $("#contactDetail").fadeOut(200);
                    $("#remoteVideos_area").removeClass("displayNone");
                    $(".nav-control").removeClass("displayNone");
                    callingPhone=touin;
                    calledPhone=touin;
                    if(name==null || name===""){
                        name=touin;
                    }
                    if(localStream!==null){
                        localStream.stream.getTracks().forEach(function(track) {
                            track.enabled=true;
                        });
                    }
                    onMeetFlag=false;
                    showLocalVideo(true,false,touin,result.result.sid);
                    callCancel(touin);
                    break;
                case -1:
                    layer.alert("对方未登录");
                    $('#localVideoContainer').addClass('displayNone');
                    break;
                case -2:
                    console.log(999);
                    callNumbers=0;
                    if(result.msg==="对方不在线"){
                        $('#localVideoContainer').addClass('displayNone');
                        layer.alert("对方不在线");
                    }else{
                        history.go(0);
                    }
                    break;
                case -3:
                    $('#localVideoContainer').addClass('displayNone');
                    layer.alert("对方未注册");
                    break;
            }
        }
    })
}


function answerPhone(uin,sid,touin){
    $.ajax({
        type: 'POST',
        url: host+'apis/vchat/accept',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {sid:sid},
        dataType : "json",
        success: function(data) {
            console.log("=====同意通话=====");
            console.log(data);
            if(data.code===0){
                console.log(uin,sid,touin);
                $('#localVideoContainer').removeClass('displayNone');
                $('#myVideo').removeClass('displayNone');
                $("#wait").addClass("displayNone");
                $(".nav-control").removeClass("displayNone");
                pc = new RTCPeerConnection(iceServer);
                console.log(pc);
                pc.oniceconnectionstatechange = function(event) {
                    console.log("event"+event);
                    if (pc.iceConnectionState === "failed" ||
                        pc.iceConnectionState === "disconnected") {
                        // Handle the failure
                        setTimeout("hangUp('连接超时',true);",10000);
                    }
                };
                pc.onaddstream = function(event) {
                    // 监听到流加入
                    console.log("===pc.onaddstream " + event);
                    document.getElementById('otherVideo').src = URL.createObjectURL(event.stream);
                    callVideoSwitch();
                    $("#remoteVideos_control").removeClass("displayNone");
                };
                noAnswerFlag=false;
                callNumbers=1;
                audio_called.pause();
                hangButton(uin,sid,touin);
                //client.publish('/vcsplat/vchat/'+clientId+'/'+uin,'{"code":0,"msg":"接受消息","result":{"sid":'+sid+',"vchatType":2,"uin":'+touin+',"touin":'+uin+'}}');
            }else{
                layer.msg(data.msg);
            }
        }
    });
}

function hangButton(uin,sid,touin) {
    $("#hangUpButton").unbind("click").bind("click",function(){
        setCookie();
        console.log("------挂断localStream------------"+localStream);
        hangUp("聊天结束",true);
        stopCountTime(); //停止计时
        client.publish('/vcsplat/vchat/'+clientId+'/'+uin,'{"code":0,"msg":"挂断消息","result":{"sid":'+sid+',"vchatType":4,"uin":'+touin+',"touin":'+uin+'}}');
        window.setTimeout(function (){
            getCallRecords_withLocalContacts();
        }, 2500);
    });
}

function callCancel(uin,sid,touin){
    $("#hangUpButton").unbind("click").bind("click",function(){
        var touinList=[];
        touinList.push(touin);
        setCookie();
        callNumbers = 0;
        $(".nav-control .control-fs-2").removeClass("controlClickNative");
        $(".nav-control").addClass("displayNone");
        $("#otherVideo").attr("src","");
        var flag=$("body").attr("callBusy");
        var flag2=$("body").attr("noAnswer");
        audio_caller.pause();
        //关闭本地流---------------
        console.log("关闭本地流localStream-----------------"+localStream);
        if(a===1){
            a=0;
            $("#controlScreen").removeClass("controlClickNative");
            exitFullScreen();
        };
        if(localStream){
            localStream.getTracks().forEach(function(track) {
                track.stop();
            });
            localStream=null;
        }
        if( flag !== "true" ){
            client.publish('/vcsplat/vchat/'+clientId+'/'+uin,'{"code":0,"msg":"挂断消息","result":{"sid":'+sid+',"vchatType":4,"uin":'+touin+',"touin":'+uin+'}}');
        }else{
            audio_busyAudio.pause();
        }
        if(flag2==="true"){
            audio_noAnswer.pause();
        }
        layer.msg("聊天已取消");
        $("body").attr({"callBusy":"false","noAnswer":"false"});

    })
}

function refusePhone(uin,touin,sid){
    $.ajax({
        type: 'POST',
        url: host+'apis/vchat/refuse',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {sid:sid},
        dataType : "json",
        success: function(result) {
            console.log("拒绝通话");
            console.log(result);
            if(result.code===0){
                $("#wait").addClass("displayNone");
                $("#wait .userInfo .name").html("");
                noAnswerFlag=false;
                callNumbers=0;
                audio_called.pause();
                layer.msg("已拒绝，聊天结束");
                client.publish('/vcsplat/vchat/'+uin+'/'+touin,'{"code":0,"msg":"拒绝通话","result":{"sid":'+sid+',"vchatType":3,"uin":'+uin+',"touin":'+touin+'}}');
                window.setTimeout(function (){
                    getCallRecords_withLocalContacts();
                }, 2000);
                callingPhone=null;
            }else{
                layer.msg(result.msg);
            }
        }
    })
}

function hangUp(tips,type){
    //type为true-----------接通后挂断，type为false-----------未接通时挂断
    $('#localVideoContainer').addClass('displayNone');
    $(".nav-control .control-fs-2").removeClass("controlClickNative");
    $(".nav-control").addClass("displayNone");
    $("#remoteVideos_control").addClass("displayNone");
    $("#myVideo").attr("src","");
    $("#otherVideo").attr("src","");
    audio_caller.pause();
    $("#controlVoice").find('i').removeClass('icon-iconfrontmicrophonemute').addClass('icon-iconfontvoicefill');
    $("#controlVideo").find("i").removeClass("icon-videooff").addClass('icon-video1');
    layer.msg(tips);
    console.log("pc 挂断-------------------->"+pc);
    if(type){
        if(localStream){
            pc.removeStream(localStream);
        }
        pc.close();
    }
    if(localStream){
        localStream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    callNumbers = 0;
    localStream=null;
    callingPhone=null;
    if(a===1){
        a=0;
        $("#controlScreen").removeClass("controlClickNative");
        exitFullScreen();
    }
}

//get user information of caller
function getInfo(uin,callback){
    localContactsList=JSON.parse(sessionStorage.getItem('contactsList'));
    //console.log(localContactsList);
    if(localContactsList!==null && localContactsList!=="" && localContactsList.length>0){
        for(var i=0;i<localContactsList.length;i++){
            if(localContactsList[i].uin===uin){
                fromName=localContactsList[i].nickname;
            }
        }
        callback(fromName);
    }
}


//获取会议信息
function getMeetingDetail(id,callback){
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/info',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {id:id},
        dataType : "json",
        success: function(data) {
            console.log("=====获取会议信息=====");
            console.log(data);
            if(data.code===0){
                //获取成功
                meetingInfo=data.result;
                callback();
            }else{
                layer.msg(data.msg);
            }
        }
    });
}

//联系人详情
function theContactDetail(){
    $('#contactList li.contact').mouseenter(function () {
        $(this).find('.call').addClass('li_call_out').removeClass('li_call_in');
        $(this).find('.call a').addClass('addSelected');
    }).mouseleave(function () {
        $(this).find('.call').addClass('li_call_in').removeClass('li_call_out');
        $(this).find('.call a').removeClass('addSelected');
    });

    //点击直接发起视频电话
    $('#contactList li .call').unbind("click").bind("click",function () {
        var name=$(this).parent().find(".contactName").html();
        var uin=$(this).parent().attr("uin");
        clearTimeout(clearTimeOut1);
        clearTimeOut1 = setTimeout(call_ifMyself(name,parseInt(uin),2),500);
        return false;
    });
}

//拨打通话
function recordCall(){
    $('#call_records_list li').mouseenter(function () {
        $(this).find('.call').addClass('li_call_out').removeClass('li_call_in');
    }).mouseleave(function () {
        $(this).find('.call').addClass('li_call_in').removeClass('li_call_out');
    });
    $('#call_records_list li .call').unbind('click').bind('click', function () {
       var name = $(this).parent('li').find('.call_name').text();
        var uin = $(this).parent('li').attr('uin');
        callUp(uin,name);
    });
}


//退出登录
function loginOut(){
    if(getParameterByName ("ticket")){
        $.ajax({
            type: 'POST',
            url: host+'apis/user/logout/single',
            beforeSend: function(request) {
                request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
            },
            data:{ticket:getParameterByName ("ticket")},
            success: function(data) {
                console.log("========退出登录=========");
                console.log(data);
                if(data.code === 0){
                    var _userSaveInfo=JSON.parse(localStorage.getItem('userSaveInfo'));
                    _userSaveInfo.automaticLogin=false;
                    localStorage.setItem("userSaveInfo",JSON.stringify(_userSaveInfo));
                    layer.msg('退出成功', {icon: 6});
                    localStorage.setItem('automaticLogin','false');
                    clearCookie();
                    window.setTimeout(function () {
                        history.go(0);
                    },1500);
                }else{
                    layer.msg('网络有点问题哦');
                }
            }
        })
    }else{
        $.ajax({
            type: 'POST',
            url: host+'apis/user/logout',
            beforeSend: function(request) {
                request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
            },
            success: function(data) {
                console.log("========退出登录=========");
                console.log(data);
                if(data.code === 0){
                    var _userSaveInfo=JSON.parse(localStorage.getItem('userSaveInfo'));
                    _userSaveInfo.automaticLogin=false;
                    localStorage.setItem("userSaveInfo",JSON.stringify(_userSaveInfo));
                    layer.msg('退出成功', {icon: 6});
                    localStorage.setItem('automaticLogin','false');
                    clearCookie();
                    window.setTimeout(function () {
                        history.go(0);
                    },1500);
                }else{
                    layer.msg('网络有点问题哦');
                }
            }
        })
    }

}

//获取我的信息
function getMyInfo(){
    $.ajax({
        methods: 'GET',
        url: host+'apis/userInfo/getUserInfo',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        success: function(data) {
            console.log("========获取用户信息========="+data);
            if(data.code===0){
                $('#my_nickName').val(data.result.nickname);
                clientId=data.result.uin;
                if(data.result.mobile){
                    $('.my_phone').text(data.result.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'));
                }
            }else{
                layer.msg(data.msg);
            }

        }
    })
}

//修改自己信息
function MyInfo(name) {
    $.ajax({
        type: 'POST',
        url: host + 'apis/user/modify',
        data: {nickname: name, photo: 'images/headPortrait.png'},
        beforeSend: function (request) {
            request.setRequestHeader('X-Authorization', sessionStorage.getItem('token'));
        },
        success: function (data) {
            console.log("========修改自己信息=========");
            console.log(data);
            if (data.code === 0) {
                $('#my_nickName').val(name);
                layer.tips('修改成功', '#my_nickName', {
                    tips: [1, '#3595CC'],
                    time: 2000
                });
            } else if (data.code === -2) {
                history.go(0);
            } else {
                layer.tips('' + data.msg + '', '#my_nickName', {
                    tips: [1, '#3595CC'],
                    time: 2000
                });
            }
        }
    });
}
//获取用户参加会议列表
function getMeetingInfo() {
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/list',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {uin:ownUin, pageindex:0, pagesize:50},
        dataType : "json",
        success: function(result) {
            console.log("=====获取会议列表=====");
            console.log(result);
            var data = result;
            if(data.code === 0){
                var html='';
                if(data.result.list.length>0){
                    for(var i=0;i<data.result.list.length;i++){
                        html+="<li><div class='meetingId'><span>会议ID：</span>"+data.result.list[i].id+"</div>";
                        if(data.result.list[i].status===0){
                            html+="<div class='meetingStatus'><span>会议状态：</span>未开始</div>";
                        }else if(data.result.list[i].status===1){
                            html+="<div class='meetingStatus'><span>会议状态：</span>开始</div>";
                        }else if(data.result.list[i].status===2){
                            html+="<div class='meetingStatus'><span>会议状态：</span>结束</div>";
                        } else if(data.result.list[i].status===3){
                            html+="<div class='meetingStatus'><span>会议状态：</span>取消预约</div>";
                        }
                        if(data.result.list[i].status===0){
                            html+="<div class='timeButton'><a class='cancelTime' onclick='cancelTime(this)' data-id="+data.result.list[i].id+">取消预约</a><a onclick='detailMeetingInfo(this)' data-id="+data.result.list[i].id+">查看详情</a></div>";
                        }else{
                            html+="<div class='detailButton'><a onclick='detailMeetingInfo(this)' data-id="+data.result.list[i].id+">查看详情</a></div>";
                        }
                        html+="</li>";
                    }
                    $("#meeting__list ul").html(html);
                }else{
                    $("#meeting__list ul").html("<li style='text-align: center;padding: 20px 0;width: 100%;'>会议列表暂无内容</li>");
                }

            }else{
                layer.tips(''+data.msg+'', '#my_nickName', {
                    tips: [1, '#3595CC'],
                    time: 2000
                });
            }
        }
    })
}

//取消预约
function cancelTime(ele) {
    var id=$(ele).attr("data-id");
    console.log(id);
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/cancel',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {id:id},
        dataType : "json",
        success: function(data) {
            console.log("=====同意取消预约=====");
            console.log(data);
            if(data.code===0){
                //取消预约成功
                getMeetingInfo();
            }else{
                layer.msg(data.msg);
            }
        }
    });
}

//预约会议开始
function submitTime(ele) {
    startMeeting($(ele).attr("data-title"),$(ele).attr("data-subject"),parseInt($(ele).attr("data-ctype")),parseInt($(ele).attr("data-cmode")),parseInt($(ele).attr("data-id")));
}

//获取会议详细信息
function detailMeetingInfo(ele) {
    $("#meetingList").addClass("displayNone");
    $("#meetingDetailList").removeClass("displayNone");
    var id=$(ele).attr("data-id"),userList=[];
    //获取会议用户列表
    $.ajax({
        type: 'GET',
        url: host+'apis/cs/userlist',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {id:id,pageIndex:0,pageSize:50},
        dataType : "json",
        success: function(data) {
            console.log("=====会议详细信息=====");
            console.log(data);
            if(data.code===0){
                for(var i=0;i<data.result.list.length;i++){
                    if(data.result.list[i].uin!==ownUin){
                        userList.push(data.result.list[i].uin);
                        selectUin.push(data.result.list[i].uin.toString());
                    }
                }
                console.log(selectUin);
                $.ajax({
                    type: 'POST',
                    url: host+'apis/cs/info',
                    beforeSend: function(request) {
                        request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
                    },
                    data: {id:id},
                    dataType : "json",
                    success: function(data) {
                        console.log("=====会议详细信息=====");
                        console.log(data);
                        if(data.code===0){
                            var html="<li><div class='meetingId'><span>会议ID：</span>"+data.result.id+"</div>";
                            html+="<div class='meetingUin'><span>会议发起者：</span>"+$('#my_nickName').val()+"</div>";
                            html+="<div class='meetingSubject'><span>会议主题：</span>"+data.result.subject+"</div><div class='meetingTitle'><span>会议名称：</span>"+data.result.title+"</div>";
                            if(data.result.status===1){
                                html+="<div class='meetingIcode'><span>会议邀请码：</span>"+data.result.icode+"</div>";
                            }
                            html+="<div class='meetingUser'><span>会议参与者：</span>";
                            for(var j=0;j<userList.length;j++){
                                getInfo(userList[j],function (fromName) {
                                    console.log(fromName);
                                    html+=" "+fromName+" ";
                                })
                            }
                            html+="</div>";
                            if(data.result.status===0){
                                html+="<div class='timeButton'><a onclick='submitTime(this)' data-ctype="+JSON.parse(data.result.config).ctype+" data-cmode="+JSON.parse(data.result.config).cmode+" data-title="+data.result.title+" data-subject="+data.result.subject+" data-id="+data.result.id+">开始会议</a></div>";
                            }
                            html+="</li>";
                            console.log(data.result.config);
                            $("#meeting_detail_info ul").html(html);
                        }else{
                            layer.msg(data.msg);
                        }
                    }
                });
            }else{
                layer.msg(data.msg);
            }
        }
    });
}

//获取用户会议回看列表
function getRecordInfo() {
    $.ajax({
        type: 'POST',
        url: host+'apis/cs/appoint',
        beforeSend: function(request) {
            request.setRequestHeader('X-Authorization',sessionStorage.getItem('token'));
        },
        data: {uin:ownUin, pageindex:0, pagesize:50},
        dataType : "json",
        success: function(result) {
            console.log("=====获取会议列表=====");
            console.log(result);
            var data = result;
            if(data.code === 0){
                var html='';
                if(data.result.length>0){
                    for(var i=0;i<data.result.length;i++){
                        html+="<li><div class='meetingId'><span>会议ID：</span>"+data.result[i].id+"</div><div class='meetingIcode'><span>会议邀请码：</span>"+data.result[i].icode+"</div><div class='meetingUin'><span>会议发起者：</span>"+data.result[i].uin+"</div><div class='meetingSubject'><span>会议主题：</span>"+data.result[i].subject+"</div><div class='meetingTitle'><span>会议名称：</span>"+data.result[i].title+"</div><div class='meetingStatus'><span>会议状态：</span>";
                        if(data.result[i].status==0){
                            html+="未开始";
                        }else if(data.result[i].status==1){
                            html+="开始";
                        }else if(data.result[i].status==2){
                            html+="结束";
                        } else if(data.result[i].status==3){
                            html+="取消预约";
                        }
                        html+="</div></li>";
                    }
                }
                $("#meeting_records_list ul").html(html);
            }else{
                layer.tips(''+data.msg+'', '#my_nickName', {
                    tips: [1, '#3595CC'],
                    time: 2000
                });
            }
        }
    })
}

function search(element,type,ele) {
    var contacts = JSON.parse(sessionStorage.getItem('contactsList'));
    $(ele).html('');
    var value=$(element).val();
    if(value == ''){
        if(type===1){
            $(ele).html(contactListHtml);
        }else{
            $(ele).html(meetListHtml);
        }
    }else{
        for(var g=0;g<contacts.length;g++){
            var html="";
            if(new RegExp(value).test(contacts[g].nickname) || new RegExp(value).test(contacts[g].pinyin) || new RegExp(value).test(contacts[g].initial) || new RegExp(value).test(contacts[g].mobile)){
                if(ownUin!==contacts[g].uin){
                    if(type===1){
                        html += '<li class="contact" uin='+contacts[g].uin+' id="'+contacts[g].uin+'"><div class="contactHead_portrait">';
                        html += '<img src="public/images/tuzi.png"/></div>';
                        html += '<div class="contact_info"><p class="contactName">'+contacts[g].nickname+'</p>';
                        if(contacts[g].mobile){
                            html += '<p class="contactPhone">'+contacts[g].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+'</p></div>';
                        }else{
                            html += '<p class="contactPhone"></p></div>';
                        }
                        html += '<div class="call"><a>拨打</a></div>';
                    } else if(type===2 || type===3){
                        if(contacts[g].mobile){
                            html += '<li class="contact" id="'+contacts[g].uin+'" phone="'+contacts[g].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+'" uin="'+contacts[g].uin+'"><div class="selectBox">';
                        }else{
                            html += '<li class="contact" id="'+contacts[g].uin+'" phone="" uin="'+contacts[g].uin+'"><div class="selectBox">';
                        }
                        html += '<i class="iconfont icon-roundcheckfill"></i></div>';
                        html += '<div class="contactHead_portrait"><img src="public/images/tuzi.png"/></div>';
                        html += '<div class="contact_info"><p class="contactName">'+contacts[g].nickname+'</p>';
                        if(contacts[g].mobile){
                            html += '<p class="contactPhone">'+contacts[g].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')+'</p></div></li>';
                        }else{
                            html += '<p class="contactPhone"></p></div></li>';
                        }
                    }
                    if(document.getElementById(contacts[g].uin)) {
                    }else{
                        $(ele).append(html);
                    }
                    continue;
                }
            }
        }
        if($(ele).find("li").length<1) {
            $(ele).html("<div style='text-align:center;margin-top:5px;font-size: 14px;'>未搜索到联系人</div>");
        }
        if(type===1){
            theContactDetail();
        }else{
            selectMember();
        }
    }
}

//搜索
$('#search').bind('input propertychange',function(){
    search("#search",1,'#contactList ul');
});

$('#searchMeeting').bind('input propertychange',function(){
    search("#searchMeeting",2,'#selectList ul');
});
$('#order .searchMeeting').bind('input propertychange',function(){
    search("#order .searchMeeting",3,'#order .selectList ul');
});

$('#fastInput').bind('input propertychange',function(){
    var contacts = JSON.parse(sessionStorage.getItem('contactsList'));
    var callRecords = JSON.parse(localStorage.getItem('webrtc_webMobile_callRecords'));
    var res=[],arr = [],result=[],isRepeated,cont=[];
    console.log(callRecords);
    for(var o = 0; o < callRecords.length; o++){
        if(callRecords[o].touin===ownUin){//拨进
            arr.push(callRecords[o].uin);
        }else{//拨出
            arr.push(callRecords[o].touin);
        }
    }
     for (var k = 0;k < arr.length; k++) {
        isRepeated = false;
        for (var p = 0, len = result.length; p < len; p++) {
            if (arr[k] === result[p]) {
                isRepeated = true;
                break;
            }
        }
        if (!isRepeated && arr[k]!=='') {
            result.push(arr[k]);
        }
    }
    for(var l=0;l<result.length;l++){
         for(var t=0;t<contacts.length;t++){
             if(result[l]===contacts[t].uin){
                 cont.push(contacts[t]);
                 break;
             }
         }
    }
    var value=$('#fastInput').val().replace(/^\s+|\s+$/g,'');
    if(value == ''){
        if(callRecords.length>50){
            callRecordList(callRecords,contacts,50);
        }else{
            callRecordList(callRecords,contacts,callRecords.length);
        }
    }else {
        for(var j=0;j<cont.length;j++){
            if(new RegExp(value).test(cont[j].mobile) || new RegExp(value).test(cont[j].nickname) || new RegExp(value).test(cont[j].pinyin) || new RegExp(value).test(cont[j].initial)){
                for(var q=0;q<callRecords.length;q++){
                    if(callRecords[q].touin===result[j] || callRecords[q].uin===result[j]){
                        res.push(callRecords[q]);
                        break;
                    }
                }
            }
        }
        //通话记录
        callRecordList(res,contacts,res.length);
        if (res.length < 1) {
            $('#call_records_list ul').html("<div style='text-align:center;margin-top:5px;font-size: 14px;'>未搜索到联系人</div>");
        }
    }
});

function callRecordList(res,contacts,number){
    var html='', callFlag=false,iconClass,callStateSrc,_callTime,callTime,callUin,callName,callMobile;
    for(var i=0;i<number;i++){
        if(res[i].uin === res[i].touin){
            for(var m=0;m<contacts.length;m++){
                if(res[i].uin===contacts[m].uin){
                    callFlag=true;
                    callName=contacts[m].nickname;
                    if(contacts[m].mobile){
                        callMobile=contacts[m].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
                    }

                }
            }
        }
        if(res[i].touin === ownUin){//拨进
            iconClass="icon-callin";
            for(var k=0;k<contacts.length;k++){
                if(res[i].uin==contacts[k].uin){
                    callName=contacts[k].nickname;
                    if(contacts[k].mobile){
                        callMobile=contacts[k].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
                    }
                }
            }
            callUin=res[i].uin;
            if(res[i].chatUtc===0){ //拨进未接
                callStateSrc="not_get";
            }else{//拨进接了
                callStateSrc="get";
            }
        }else{
            //拨出
            iconClass="icon-callout";
            for(var h=0;h<contacts.length;h++){
                if(res[i].touin===contacts[h].uin){
                    callName=contacts[h].nickname;
                    if(contacts[h].mobile){
                        callMobile=contacts[h].mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
                    }
                }
            }
            callUin=res[i].touin;
            if(res[i].chatUtc===0){ //拨出未接
                callStateSrc="not_get";
            }else{//拨出接了
                callStateSrc="get";
            }
        }
        _callTime = res[i].calledUtc;
        callTime =format(_callTime, 'yyyy-MM-dd HH:mm:ss');
        html += '<li phone='+callMobile+' uin='+callUin+'><div class="call_flag '+callStateSrc+'">';
        html += '<i class='+iconClass+'>';
        html += '</i></div><div class="call_info"><p class="call_name">'+callName+'</p>';
        html += '<p class="call_time" title="'+callTime+'">'+callTime+'</p></div>';
        html += '<div class="call"><a>拨打</a></div>';
        callFlag=false;
        $('#call_records_list ul').html(html);
        $('#call_records_list ul i').addClass("iconfont");
        recordCall();
    }
}

//audio and video exchange
var clickTimeout = -1;
$("#controlVoice").unbind("click").bind("click",function(){
    $(this).find("i").toggleClass("icon-iconfontvoicefill icon-iconfrontmicrophonemute");
    if($(this).find("i").hasClass("icon-iconfontvoicefill")){
        //声音外放
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(function(){
            if($("body").attr("callOrMeeting")=="call"){
                localStream.getAudioTracks().forEach(function(track) {
                    track.enabled=true;
                });
            }else {
                if (_localStream.stream !== undefined) {
                    _localStream.stream.getAudioTracks().forEach(function(track) {
                        track.enabled=true;
                    });
                }
                //_localStream.openAudio();
            }
        },200);
    }else{
        //静音
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(function(){
            if($("body").attr("callOrMeeting")=="call"){
                localStream.getAudioTracks().forEach(function(track) {
                    track.enabled=false;
                });
            }else {
                if (_localStream.stream !== undefined) {
                    _localStream.stream.getAudioTracks().forEach(function(track) {
                        track.enabled=false;
                    });
                }
                //_localStream.closeAudio();
            }
        },200);
    }
});
$("#controlVideo").unbind("click").bind("click",function(){
    $(this).find("i").toggleClass("icon-video1 icon-videooff");
    if($(this).find("i").hasClass("icon-video1")){
        //视频
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(function(){
            if($("body").attr("callOrMeeting")=="call"){
                localStream.getVideoTracks().forEach(function(track) {
                    console.log("---------------------track2--"+track);
                    track.enabled=true;
                });
            }else {
                //_localStream.openVideo();
                if (_localStream.stream !== undefined) {
                    _localStream.stream.getVideoTracks().forEach(function(track) {
                        track.enabled=true;
                    });
                }
            }
        },200);
    }else{
        //语音
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(function(){
            if($("body").attr("callOrMeeting")=="call"){
                localStream.getVideoTracks().forEach(function(track) {
                    track.enabled=false;
                });
            }else{
                if (_localStream.stream !== undefined) {
                    _localStream.stream.getVideoTracks().forEach(function(track) {
                        track.enabled=false;
                    });
                }
                //_localStream.closeVideo();
            }
        },200);
    }
});

//二维码
function makeCode(phone,element) {
    new QRCode(element, {
        text:"phone="+phone,//任意内容
        correctLevel : QRCode.CorrectLevel.H
    });
    $('#'+element).attr('title','');
}

function callVideoSwitch(){
    $("#myVideo").unbind().bind("click",(function(){
        var mySrc=$(this).attr("src");
        var otherSrc=$("#otherVideo").attr("src");
        console.log(mySrc);
        console.log(otherSrc);
        $(this).attr("src",otherSrc);
        $("#otherVideo").attr("src",mySrc);
    })
    );
}
window.addEventListener("offline", function(e) {
    console.log(onMeetFlag,haveMeeting,callOrMeetingFlag,localStream,_localStream);
    layer.msg('。。。网络出问题了,快去连接吧！');
    stopCountTime(); //停止计时
    if(haveMeeting===false){
        if(localStream!=='' || localStream!==null){
            audio_called.pause();
            hangUp("网络异常，通话结束",false);
        }else{
            audio_caller.pause();
            hangUp('网络异常，通话挂断',true);
        }
    }
});
var isFirst = true;
window.addEventListener("online", function(e) {
    layer.msg('网络连上了，进行你要的操作吧！');
    if(isFirst){
        getConnect();
        isFirst = false;
    }
});


//create phoneList and nameList for meeting
function selectMember(){
    $('#selectList ul li.contact').unbind("click").bind("click",function () {
        setCookie();
        $("#chooseList").addClass("displayBlock").removeClass("displayNone");
        $(this).toggleClass('selected');
        if($(this).hasClass("selected")){
            selectUin.push($(this).attr("uin"));
        }else{
            if(selectUin){
                for(var l=0;l<selectUin.length;l++){
                    if(selectUin[l]==$(this).attr("uin")){
                        selectUin.splice(l,1);
                    }
                }
            }
        }
        var contacts = JSON.parse(sessionStorage.getItem('contactsList')),html='';
        for(var i=0;i<selectUin.length;i++){
            for(var j=0;j<contacts.length;j++){
                if(selectUin[i]==contacts[j].uin){
                    html+="<li class='selected' uin="+selectUin[i]+"><div class='selectBox videoClose_fl' style='float: left;margin-left: 10px;height: 85px;line-height: 85px;'><i class='iconfont icon-roundcheckfill'></i></div>" +
                        "<div class='videoClose_fl' style='float: right'><div class='videoClose_fl'><img class='videoClose_fl' src='public/images/tuzi.png' alt=''></div><div class='videoClose_fl'><div>"+contacts[j].nickname+"</div>";
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
        $("#_choose_streamList ul li").click(function () {
            $(this).remove();
            var index=$(this).index();
            var nowUin=$(this).attr("uin");
            selectUin.splice(index,1);
            for(var j=0;j<$('#selectList ul li.contact').length;j++){
                if($('#selectList ul li.contact').eq(j).attr("uin")==nowUin){
                    $('#selectList ul li.contact').eq(j).removeClass("selected");
                }
            }
        })
    });
    $('#order .selectList ul li.contact').unbind("click").bind("click",function () {
        setCookie();
        $("#chooseList").addClass("displayBlock").removeClass("displayNone");
        $(this).toggleClass('selected');
        if($(this).hasClass("selected")){
            selectUinList.push($(this).attr("uin"));
        }else{
            if(selectUinList){
                for(var l=0;l<selectUinList.length;l++){
                    if(selectUinList[l]==$(this).attr("uin")){
                        selectUinList.splice(l,1);
                    }
                }
            }
        }
        var contacts = JSON.parse(sessionStorage.getItem('contactsList')),html='';
        for(var i=0;i<selectUinList.length;i++){
            for(var j=0;j<contacts.length;j++){
                if(selectUinList[i]==contacts[j].uin){
                    html+="<li class='selected' uin="+selectUinList[i]+"><div class='selectBox videoClose_fl' style='float: left;margin-left: 10px;height: 85px;line-height: 85px;'><i class='iconfont icon-roundcheckfill'></i></div>" +
                        "<div class='videoClose_fl' style='float: right'><div class='videoClose_fl'><img class='videoClose_fl' src='public/images/tuzi.png' alt=''></div><div class='videoClose_fl'><div>"+contacts[j].nickname+"</div>";
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
        $("#_choose_streamList ul li").click(function () {
            $(this).remove();
            var index=$(this).index();
            var nowUin=$(this).attr("uin");
            selectUinList.splice(index,1);
            for(var j=0;j<$('#order .selectList ul li.contact').length;j++){
                if($('#order .selectList ul li.contact').eq(j).attr("uin")==nowUin){
                    $('#order .selectList ul li.contact').eq(j).removeClass("selected");
                }
            }
        })
    });
    newAdd();
}

function newAdd() {
    if(selectUin){
        for(var i=0;i<selectUin.length;i++){
            for(var j=0;j<$('#selectList ul li.contact').length;j++){
                if($('#selectList ul li.contact').eq(j).attr("uin")==selectUin[i]){
                    $('#selectList ul li.contact').eq(j).addClass("selected");
                }
            }
        }
    }
    if(selectUinList){
        for(var k=0;k<selectUinList.length;k++){
            for(var m=0;m<$('#order .selectList ul li.contact').length;m++){
                if($('#order .selectList ul li.contact').eq(m).attr("uin")==selectUinList[k]){
                    $('#order .selectList ul li.contact').eq(m).addClass("selected");
                }
            }
        }
    }
}


function reLogin(){
    layui.use('layer', function(){
        var account=JSON.parse(localStorage.getItem('userSaveInfo')).phone;
        var passd=getCookie("password");
        $("#loginButton span").toggleClass("displayNone");
        $("#loginButton img").toggleClass("displayNone");
        ownPhone = account;
        ownPass = passd;
        loginResult(account,passd);
    });
}

function loginResult(account,passw) {
    var type;
    var reg = /^0?1[3|4|5|7|8][0-9]\d{8}$/;
    if (reg.test(account)) {
        type=1;
    }else{type=2;}
    $.ajax({
        type: 'POST',
        url: parent.host+'apis/user/open/login',
        data: {type:type,mapid:account,passwd:passw,nickname:'',photo:''},
        success: function(result) {
            console.log(result);
            var data = result;
            if(data.code === 0){
                sessionStorage.setItem("token",data.result);
                var payload=JSON.parse(decodeBase64(data.result.toString().split(".")[1]));
                LOGINFlag=true;
                var user = {
                    phone:account,
                    uin:payload.uin,
                    automaticLogin:false,
                    rememberPass:false
                };
                ownUin=payload.uin;
                clientId=payload.uin;
                //保存token至有效期
                document.cookie ="token="+ data.result + ";expires=" + new Date(payload.exp*1000);
                //保存password 8分钟
                document.cookie ="password="+ passw;
                if($('#rememberPass').is(":checked")){//保存密码
                    user.password=passw;
                    user.rememberPass=true;
                }
                if($('#automaticLogin').is(":checked")){//自动登录标识
                    user.automaticLogin=true;
                    user.password=passw;
                }
                layer.tips('登录成功', '#nav_MyHead_img', {tips: 2});
                //infoTips("登录成功",6,500);
                $("#loginButton span").toggleClass("displayNone");
                $("#loginButton img").toggleClass("displayNone");
                localStorage.setItem("userSaveInfo",JSON.stringify(user));
                getMyInfo();
                getConnect();
                getContactList();
                window.setTimeout(function(){
                    $("#extendedToolbar").removeClass("displayNone");
                    var index = layer.getFrameIndex(window.name); //先得到当前iframe层的索引
                    layer.close(index);
                },500);
            }else{
                loginFlag=true;
                layer.tips(data.msg, {tips: 5});
                //infoTips(data.msg,5);
                $("#loginButton span").toggleClass("displayNone");
                $("#loginButton img").toggleClass("displayNone");
                $("#loginButton").attr("disabled",false);
            }
        }
    })
}
//申请发言
$("#applySpeak").unbind("click").bind("click",function () {
    var touinList=[];
    touinList.push(_startMeetingPhone);
    client.publish('/vcsplat/meeting/'+clientId+'/'+_startMeetingPhone,'{"code":0,"msg":"申请发言","result":{"meetingType":105,"uin":'+ownUin+',"touin":'+touinList+'}}');
});
//单点登录
function login_ticket(ticket) {
    $.ajax({
        type: 'POST',
        url: host + 'apis/user/open/login/single',
        data: {ticket: ticket},
        dataType: "json",
        success: function (data) {
            console.log("=====单点登录=====");
            console.log(data);
            if (data.code === 0) {
                sessionStorage.setItem("token", data.result);
                console.log(data.result.toString().split(".")[1]);
                var payload = JSON.parse(decodeBase64(data.result.toString().split(".")[1]));
                LOGINFlag = true;
                var user = {
                    //phone: account,
                    uin: payload.uin,
                    automaticLogin: false,
                    rememberPass: false
                };
                ownUin = payload.uin;
                clientId = payload.uin;
                //保存token至有效期
                document.cookie = "token=" + data.result + ";expires=" + new Date(payload.exp * 1000);
                if ($('#rememberPass').is(":checked")) {//保存密码
                    user.rememberPass = true;
                }
                if ($('#automaticLogin').is(":checked")) {//自动登录标识
                    user.automaticLogin = true;
                }
                layer.tips('Hi，登录成功', '#nav_MyHead_img', {tips: 2});
                $("#loginButton span").toggleClass("displayNone");
                $("#loginButton img").toggleClass("displayNone");
                localStorage.setItem("userSaveInfo", JSON.stringify(user));
                getMyInfo();
                getConnect();
                getContactList();
                window.setTimeout(function () {
                    $("#extendedToolbar").removeClass("displayNone");
                    var index = layer.getFrameIndex(window.name); //先得到当前iframe层的索引
                    layer.close(index);
                }, 500);
            } else {
                loginFlag = true;
                layer.tips(data.msg,  {tips: 5});
                $("#loginButton span").toggleClass("displayNone");
                $("#loginButton img").toggleClass("displayNone");
                $("#loginButton").attr("disabled", false);
            }
        }
    });
}

