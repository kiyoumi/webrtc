function setCookie() {
    document.cookie="password="+ escape (getCookie("password")) + ";max-age=" + 5*60;
}

function getCookie(cookie_name) {
    var allcookies = document.cookie;
    var cookie_pos = allcookies.indexOf(cookie_name);   //索引的长度
    // 如果找到了索引，就代表cookie存在，
    // 反之，就说明不存在。
    if (cookie_pos !== -1) {
        // 把cookie_pos放在值的开始，只要给值加1即可。
        cookie_pos += cookie_name.length + 1;      //这里容易出问题，所以请大家参考的时候自己好好研究一下
        var cookie_end = allcookies.indexOf("=", cookie_pos);
        if (cookie_end === -1) {
            cookie_end = allcookies.length;
        }
        var value = unescape(allcookies.substring(cookie_pos, cookie_end));         //这里就可以得到你想要的cookie的值了。。。
    }
    return value;
}

function clearCookie() {
    document.cookie ="password=";
}
//获取url参数
function getParameterByName (name) {
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
//解密方法。没有过滤首尾空格，即没有trim
//加密可以加密N次，对应解密N次就可以获取明文
function decodeBase64(mi,times){
    var mingwen="";
    var num=1;
    if(typeof times=='undefined'||times==null||times==""){
        num=1;
    }else{
        var vt=times+"";
        num=parseInt(vt);
    }
    if(typeof mi=='undefined'||mi==null||mi==""){

    }else{
        $.base64.utf8encode = true;
        mingwen=mi;
        for(var i=0;i<num;i++){
            mingwen=$.base64.atob(mingwen);
        }
    }
    return mingwen;
}
//时间转化
function format(time, format){
    var t = new Date(time);
    var tf = function(i){return (i < 10 ? '0' : '') + i};
    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, function(a){
        switch(a){
            case 'yyyy':
                return tf(t.getFullYear());
                break;
            case 'MM':
                return tf(t.getMonth() + 1);
                break;
            case 'mm':
                return tf(t.getMinutes());
                break;
            case 'dd':
                return tf(t.getDate());
                break;
            case 'HH':
                return tf(t.getHours());
                break;
            case 'ss':
                return tf(t.getSeconds());
                break;
        }
    })
}
function infoTips(msg,icon,time){
    if(time === undefined || time == null){
        time=2000;
    }
    parent.layer.msg(msg, {
        icon: icon,
        shift: 6,
        time:time
    });
}
