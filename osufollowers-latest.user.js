// ==UserScript==
// @name osu! followers
// @version 0.21
// @author Alvaro Daniel Calace
// @namespace https://github.com/alvarocalace/osufollowers
// @description Adds a new followed players section in your osu! profile
// @require http://code.jquery.com/jquery-latest.js
// @require http://timeago.yarp.com/jquery.timeago.js
// @include https://osu.ppy.sh/u/*
// @copyright 2015, Alvaro Daniel Calace
// @downloadURL https://raw.githubusercontent.com/alvarocalace/osufollowers/master/osufollowers-latest.user.js
// @grant GM_xmlhttpRequest
// ==/UserScript==

var username;
var URL_USER = 'https://osu.ppy.sh/u/';
var URL_BEATMAP = 'https://osu.ppy.sh/b/';
var URL_BASE = 'http://itoon-osufollower.rhcloud.com';
var URL_API = '/api/FollowedPlayersRecentTopScores';
var URL_ADD = '/AddFollowedPlayer';
var URL_DELETE = '/DeleteFollowedPlayer';
var index = 0;
var updating = 0;
var pollingRate = 10;
var defaultTimeout = 2000;

$(window).load(
    function main(){
        username = getCookie('last_login');
        var profileUsername = $('.profile-username');
        if (username && ((URL_USER + username).match(document.URL + '*') || (profileUsername && profileUsername.first().text().trim() === username))) {
            waitForSelector('#full', init, defaultTimeout);
        }
    }
);

function init() {
    var followedDiv = $('<div>');
    $('#full').after(followedDiv);    
    followedDiv.append('<div id="followedPlayersTitle"class="profileStatHeader">Followed Players</div>');

    var followedTable = $('<table>').attr('id', 'followedTable');
    followedDiv.append(followedTable);

    appendBatch();

    var showMeMore = $('<a>').attr('href', '#').text("Show me more...").on('click', function(event){
        event.preventDefault();
        if (!updating) {
            appendBatch();
        }
    });
    followedDiv.append($('<div>').append(showMeMore));

    var loadingIcon = $('<img>').attr('id', 'followedLoadingIcon').attr('src', 'http://www.ajaxload.info/images/exemples/30.gif').css('height', '11px').css('width', '11px');
    showMeMore.after(loadingIcon);

    followedDiv.append('<br>');

    var inputPlayer = $('<input>').attr('placeholder', 'follow a new player!').attr('id', 'inputPlayer');
    followedDiv.append($('<div>').css('padding-left', '5px').append(inputPlayer));
    inputPlayer.on('keydown', function(event) {
        var player = $(this).val();
        if (!updating && event.which === 13 && player) {
            $(this).val('');
            processAddOrDelete(URL_ADD, username, player);
        }
    });
}

function appendFollowedRow(table, d) {
    var deleteButton = $('<img>').attr('src','https://cdn2.iconfinder.com/data/icons/windows-8-metro-style/128/delete.png').css('width', '10px').css('height', '10px').css('cursor', 'pointer').on('click', function() {
        var conf = confirm('Are you sure you want to stop following ' + d.username + '?');
        if (!updating && conf) {
            processAddOrDelete(URL_DELETE, username, d.username);
        }
    });
    table.append($('<tr>')
                 .append($('<td>').css('width', '20%')
                         .append($('<time>').attr('class', 'timeago').attr('datetime', d.date).attr('title', formatDateForTitle(d.date)).text($.timeago(d.date)))
                        )
                 .append($('<td>')
                         .append($('<div>').attr('class', 'event epic1')
                                 .append($('<img>').attr('src', '/images/' + d.rank +'_small.png'))
                                 .append(' ')
                                 .append($('<a>').attr('href', URL_USER + d.username).attr('target', '_blank').css('font-weight', 'bold').text(d.username)) 
                                 .append(' got ' + d.pp + ' pp on ')
                                 .append($('<a>').attr('href',URL_BEATMAP + d.beatmapId).attr('target', '_blank').text(d.artist + ' - ' + d.title + ' [' + d.version + '] '))
                                 .append (' (' + modsToString(d.mods) + ') ')
                                 .append(deleteButton)
                                )
                        )
                );
}

//AJAX
function processAddOrDelete(action, username, player) {
    var url = URL_BASE + action; 
	var params = 'username=' + encodeURIComponent(username) + '&player=' + encodeURIComponent(player);
    createPostRequest(url, params, function(response){
        $('#messageAdded').remove();
        var span = $('<span>').attr('id', 'messageAdded').css('padding-left', '10px').css('color', '#848484').text(response.responseText).fadeIn(400).delay(5000).fadeOut(400);
        $('#inputPlayer').after(span);
        if (response.status === 200) {
            $('#followedTable').empty();
            index = 0;
            appendBatch();
        }
    });
}

function appendBatch() {
    updating = 1;
    var url = URL_BASE + URL_API + '?username=' + encodeURIComponent(username) + '&startingIndex=' + encodeURIComponent(index);
    $('#followedLoadingIcon').show();
    createGetRequest(url, function(response){
        $('#followedLoadingIcon').hide();
        var data = $.parseJSON(response.responseText);
        for (var i = 0; i < data.length; i++) {
            appendFollowedRow($('#followedTable'), data[i]);
            index++;
        }
        updating = 0;
    });
}

function createGetRequest(url, callback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        onload: function(response) {
			callback(response);
        }
    });
}

function createPostRequest(url, params, callback) {
    GM_xmlhttpRequest({
		method: 'POST',
		url: url,
		data: params,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		onload: function(response) {
			callback(response);
		}
	});
}

//UTILITIES
function getCookie(k){return(document.cookie.match('(^|; )'+k+'=([^;]*)')||0)[2];}

function modsToString(mods) {
    var str = '';
    for (var i = 0; i < mods.length; i++) {
        str += mods[i] + ', ';
    }
    return str.substring(0, str.length - 2);
}

function waitForSelector(selector, callback, timeout){
    var waited = 0;
    var interval = setInterval(function() {
        if ($(selector).length) {
            clearInterval(interval);
            callback();
        } else {
            waited += pollingRate;
            if (waited >= timeout) {
                clearInterval();
            }
        }
    }, pollingRate);
}

function formatDateForTitle(str) {
    var d = new Date(str);
    // convert to UTC
    d = new Date(d.getTime() + (d.getTimezoneOffset() * 60000));
    
    var yyyy = d.getFullYear();
    var mm = d.getMonth() + 1;
    var dd = d.getDate();
    var hh = d.getHours();
    var mi = d.getMinutes();
    var ss = d.getSeconds();

    return yyyy + '-' + pad(mm) + '-' + pad(dd) + ' ' + pad(hh) + ':' + pad(mi) + ':' + pad(ss) + ' UTC';
}

function pad(i) {
    return ("0" + i).slice(-2);
}
