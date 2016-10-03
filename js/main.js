var Tethys = (function () {
    
    document.querySelector('#tree').addEventListener('click', function (event) {
        if (event.target.className.indexOf('file') !== -1) {
            var fileId = event.target.dataset.fileid;
            if (fileId === 'new') {
                var parentId = event.target.dataset.parent;
                Modal.onsubmit["createFile"] = function (button, input) {
                    var newName = input[0];
                    if (newName.length <= 0) newName = "New " + button;
                    if (button === 'file') {
                        FileSystem.mkfile(parentId, newName);
                    } else {
                        FileSystem.mkdir(parentId, newName);
                    }
                    Modal.close();
                }
                Modal.open('createFile');
            } else {
                FileSystem.open(fileId);
            }

        }
    });

    document.querySelector('#delete').addEventListener('click', function (event) {
        Modal.onsubmit["confirmDelete"] = function (button, input) {
            if (button === 'yes') {
                FileSystem.delCurrent();
            }
            Modal.close();
        }
        Modal.open('confirmDelete', FileSystem.workingFile);
    });


    document.querySelector('#roomlist').addEventListener('click', function (event) {
        if (event.target.className.indexOf('user-img') !== -1) {
            var userID = event.target.dataset.userid;
            var name = event.target.dataset.name;
            if (userID === "me" || !SocketAPI.isMyRoom) return;
            Modal.onsubmit["confirmKick"] = function () {
                SocketAPI.kick(userID);
                Modal.close();
            };
            Modal.open('confirmKick', {
                name: name
            });
        }
    });

    document.querySelector('#onlinelist').addEventListener('click', function (event) {
        if (event.target.className.indexOf('user-img') !== -1) {
            var userID = event.target.dataset.userid;
            var name = event.target.dataset.name;
            if (userID === "me") return;
            Modal.onsubmit["requestInvite"] = function () {
                SocketAPI.requestRoom(userID);
                Modal.close();
            };
            Modal.open('requestInvite', {
                name: name
            });
        }
    });

    var me;
    var username;
    var hash;
    Modal.onsubmit['intro'] = function (button, input) {
        if (!input[0] || input[0].length <= 1) {
            input[0]="Guest";
        }
        username = input[0];
        var pic = Math.floor(Math.random() * 15);
        hash = Math.random();
        SocketAPI.joinOnline(username, pic, hash);

        me = {
            id: "me",
            name: "You",
            pic: pic,
            hash : hash
        }
        makeUser(me, "room", true);

        Modal.open('welcome');
    }


    var roomlistElement = document.querySelector("#roomlist > .panel");
    var onlinelistElement = document.querySelector("#onlinelist > .panel");

    var roomElements = {};
    var onlineElements = {};
    var userTemplate = `<img class="user-img" data-name="{{name}}" data-userid="{{id}}" src="img/avatars/avatar-{{pic}}.png"><label>{{name}}</label>`;
    
    function makeUser(user, group, isMe){
        if (user.hash == hash && !isMe) return; //Don't make self
        var div = document.createElement('div');
        div.className = "square";
        div.innerHTML = MicroMustache.template(userTemplate, user);
        
        if (group === "online"){
            onlinelistElement.appendChild(div);
            onlineElements[user.id] = div;
        }
        if (group === 'room'){
            roomlistElement.appendChild(div);
            roomElements[user.id] = div;
        }
    }
    function removeUser(user, group){
        var re = roomElements[user.id];
        var we = onlineElements[user.id]
        if (re && re.parentNode == roomlistElement){
            roomlistElement.removeChild(roomElements[user.id]);
        }
        if (we && we.parentNode == onlinelistElement){
            onlinelistElement.removeChild(onlineElements[user.id]);
        }
    }
    function clearRoom(){
        while (roomlistElement.firstChild){
            roomlistElement.removeChild(roomlistElement.firstChild);
        }
        makeUser(me, 'room', true);
    }
    
    SocketAPI.onOtherJoinOnline = function (user) {
        removeUser(user);
        makeUser(user,'online');
    }
    SocketAPI.onOtherLeftOnline = function (user) {
        removeUser(user);
    }
    SocketAPI.onOtherJoinRoom = function (user) {
        removeUser(user);
        makeUser(user, 'room');
    }
    SocketAPI.onOtherLeftRoom = function (user) {
        removeUser(user, 'room');
    }
    SocketAPI.onWho = function(onlineList){
        for (var i=0; i<onlineList.length; i++){
            removeUser(onlineList[i]);
            makeUser(onlineList[i],'online');
        }
    }
    SocketAPI.onRequestRoom = function(user, orignalId){
        Modal.onsubmit["request-join"]=function(button){
            if (button==="accept"){
                SocketAPI.respondToRoomRequest(user.id, orignalId);
            }
            Modal.close();
        }
        Modal.open('request-join', user);
    }
    SocketAPI.onRoomRespond = function(roomOwner, who){
        Modal.onsubmit['join-response'] = function(){};
        Modal.open('join-response', {name:roomOwner.name});
        clearRoom();
        for (var i=0; i<who.length; i++){
            removeUser(who[i]);
            makeUser(who[i], 'room');
        }
        document.querySelector("#roomlist > .panel-topbar").innerHTML = roomOwner.name+"'s Room";
    }
    SocketAPI.onKick = function(onlineList){
        clearRoom();
        for (var i=0; i<onlineList.length; i++){
            removeUser(onlineList[i]);
            makeUser(onlineList[i],'online');
        }
        document.querySelector("#roomlist > .panel-topbar").innerHTML = "Your Room";
        Modal.onsubmit['kick-alert'] = function(){};
        Modal.open('kick-alert');
    }

    FileSystem.init();
    FileSystem.open("startScript");
    Modal.open('intro');

}())