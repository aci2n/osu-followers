// ==UserScript==
// @name osu! followers
// @version 0.24
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
var URL_API_SCORES = '/api/FollowedPlayersRecentTopScores';
var URL_API_PLAYERS = '/api/GetFollowedPlayers';
var URL_ADD = '/AddFollowedPlayer';
var URL_DELETE = '/DeleteFollowedPlayer';
var index = 0;
var lock = 0;
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

    var showMeMore = $('<a>').attr('href', '#').text("Show me more...").on('click', function(event){
        event.preventDefault();
        if (!isLocked()) {
            appendBatch();
        }
    });
    followedDiv.append($('<div>').append(showMeMore));
	
	appendBatch();

    showMeMore.after($('<img>').attr('id', 'followedLoadingIcon').attr('src', 'http://www.ajaxload.info/images/exemples/30.gif').css('height', '11px').css('width', '11px'));

    followedDiv.append('<br>');

	var divInput = $('<div>');
	
	var settingsLink = $('<a>').attr('href', '#').on('click', function(event) {
		event.preventDefault();
		var img = $(this).children(":first");
		img.css('-webkit-transform') === 'none' ? img.css('-webkit-transform', 'rotate(-90deg)') : img.css('-webkit-transform', '');
		var divSettings = $('#divSettings');
		divSettings.css('display') === 'none' ? divSettings.show() : divSettings.hide();
	}).append($('<img>').attr('src','https://upload.wikimedia.org/wikipedia/commons/f/f7/Arrow-down-navmenu.png').css('-webkit-transform', 'rotate(-90deg)').css('padding-right', '3px').css('height', '11px').css('width', '11px'));
	divInput.append(settingsLink);
	
    var inputPlayer = $('<input>').attr('placeholder', 'follow a new player!').attr('id', 'inputPlayer');
    followedDiv.append(divInput.append(inputPlayer));
    inputPlayer.on('keydown', function(event) {
        var player = $(this).val();
        if (!isLocked() && event.which === 13 && player) {
            $(this).val('');
            processAdd(username, player);
        }
    });	
		
	var divSettings = $('<div>').attr('id', 'divSettings').css('padding-top', '5px').hide();
	followedDiv.append(divSettings);
	var settingsTable = $('<table>').attr('id', 'settingsTable').attr('class', 'beatmapListing').attr('cellspacing', '0');
	settingsTable.append($('<thead>')
		.append($('<tr>')
			.append($('<th>').text('Rank'))
			.append($('<th>').text('Player'))
			.append($('<th>').text('Accuracy'))
			.append($('<th>').text('Playcount'))
			.append($('<th>').text('Performance'))
			.append($('<th>').text('Delete'))
		)
	);
	divSettings.append(settingsTable);
	divSettings.append($('<img>').attr('id', 'settingsTableLoadingIcon').attr('src', 'http://www.ajaxload.info/images/exemples/30.gif').css('height', '11px').css('width', '11px'));
	initSettingsTable();
}

function appendFollowedRow(d) {
    $('#followedTable').append($('<tr>')
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
						)
				)
		);
}

function initSettingsTable() {
	closeLock();
	var data = [];
	var url = URL_BASE + URL_API_PLAYERS + '?username=' + encodeURIComponent(username);
	createGetRequest(url, function(response) {
		data = $.parseJSON(response.responseText);
		for (var i = 0; i < data.length; i++) {
			appendToSettingsTable(data[i]);
		}
		$('#settingsTableLoadingIcon').hide();
		openLock();
	});
}

function appendToSettingsTable(d) {
	var rowClass = $('#settingsTable > tbody > tr').length % 2 === 1 ? 'row2p' : 'row1p';

	var deleteButton = $('<a>').attr('href', '#').on('click', function(event) {
		event.preventDefault();
		var conf = confirm('Are you sure you want to stop following ' + d.username + '?');
		if (!isLocked() && conf) {
			processDelete(username, d.username);
			$(this).closest('tr').remove();
			$('#settingsTable > tbody  > tr').each(function() {
				var rowClass = $(this).index() % 2 === 1 ? 'row2p' : 'row1p'
				$(this).attr('class', rowClass);
			});
		}
	}).append($('<img>').attr('src','https://cdn2.iconfinder.com/data/icons/windows-8-metro-style/128/delete.png').css('width', '10px').css('height', '10px'));

	var rank = d.rank ? (d.rank === '0' ? 'unranked' :'#' + d.rank) : '';
	var country = d.country ? d.country.toLowerCase() : 'mw';
	var acc = d.accuracy ? d.accuracy + '%' : '';
	var pp = d.pp ? (d.pp === '0' ? 'unavailable' : d.pp + 'pp') : '';
	var playcount = d.playcount ? commaSeparate(d.playcount) : '';
	
	$('#settingsTable').append(
		$('<tr>').attr('class', rowClass)//.attr('onclick','document.location="/u/' + d.username + '"')
			.append($('<td>').css('font-weight', 'bold').text(rank))
			.append($('<td>')
				.append($('<img>').attr('src', '//s.ppy.sh/images/flags/' + country + '.gif'))
				.append(' ')
				.append($('<a>').attr('target', '_blank').attr('href', URL_USER + d.username).text(d.username))
			)
			.append($('<td>').text(acc))
			.append($('<td>').text(playcount))
			.append($('<td>').css('font-weight', 'bold').text(pp))
			.append($('<td>').css('text-align', 'center')
				.append(deleteButton)
			)
		);
}

//AJAX
function processDelete(username, player) {
	closeLock();
    var url = URL_BASE + URL_DELETE; 
	var params = 'username=' + encodeURIComponent(username) + '&player=' + encodeURIComponent(player);
    createPostRequest(url, params, function(response){
        if (response.status === 200) {
			showMessage('you are not following ' + player + ' anymore');
			refreshTable();
        } else {
			showMessage('a server error has occurred, please try again later');
		}
		openLock();
    });
}

function processAdd(username, player) {
	closeLock();
    var url = URL_BASE + URL_ADD; 
	var params = 'username=' + encodeURIComponent(username) + '&player=' + encodeURIComponent(player);
    createPostRequest(url, params, function(response){
        if (response.status === 200) {
			var data = $.parseJSON(response.responseText);
			appendToSettingsTable(data);
			showMessage('you are now following ' + data.username);
			refreshTable();
        } else if (response.status = 422){
			showMessage(response.responseText);
		} else {
			showMessage('a server error has occurred, please try again later');
		}
		openLock();
    });
}

function appendBatch() {
    closeLock();
    var url = URL_BASE + URL_API_SCORES + '?username=' + encodeURIComponent(username) + '&startingIndex=' + encodeURIComponent(index);
    $('#followedLoadingIcon').show();
    createGetRequest(url, function(response){
        $('#followedLoadingIcon').hide();
        var data = $.parseJSON(response.responseText);
        for (var i = 0; i < data.length; i++) {
            appendFollowedRow(data[i]);
            index++;
        }
        openLock();
    });
}

function showMessage(message) {
	$('#messageAdded').remove();
	var span = $('<span>').attr('id', 'messageAdded').css('padding-left', '10px').css('color', '#848484').text(message).fadeIn(400).delay(5000).fadeOut(400);
	$('#inputPlayer').after(span);
}

function refreshTable() {
	$('#followedTable').empty();
	index = 0;
	appendBatch();
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

function commaSeparate(val){
    while (/(\d+)(\d{3})/.test(val.toString())){
        val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
    }
    return val;
}

//SYNC LOCK
function isLocked() {
	return lock;
}

function closeLock() {
	lock--;
}

function openLock() {
	lock++;
}
